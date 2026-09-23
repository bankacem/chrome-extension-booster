#!/usr/bin/env python3
"""Build precise work queues from fresh audit + sitemap priority order."""
import json, re
from pathlib import Path

REPO = Path('/home/z/my-project/repo-booster')
audit = json.loads(Path('/home/z/my-project/scripts/audit_all.json').read_text())
arts = audit['articles']

# sitemap blog priority order (EN only)
sm = (REPO / 'public' / 'sitemap.xml').read_text()
blocks = re.findall(r'<url>(.*?)</url>', sm, re.S)
order = {}
prio = {}
for i, b in enumerate(blocks):
    loc = re.search(r'<loc>([^<]+)</loc>', b)
    p = re.search(r'<priority>([\d.]+)</priority>', b)
    if loc and '/blog/' in loc.group(1):
        u = loc.group(1)
        if not any(x in u for x in ['/fr/', '/es/', '/pt/', '/ar/']):
            slug = u.split('/blog/')[1]
            order[slug] = i
            prio[slug] = float(p.group(1)) if p else 0.5

by_slug = {a['slug']: a for a in arts if a.get('slug')}

def top_by_sitemap(items, n=None):
    """items: list of audit entries; sort by sitemap order (missing slugs last)."""
    s = sorted(items, key=lambda a: order.get(a['slug'], 10**6))
    return s if n is None else s[:n]

queues = {
    'no_ext_links': top_by_sitemap([a for a in arts if a['ext_links'] == 0]),
    'no_faq': top_by_sitemap([a for a in arts if not a['has_faq']]),
    'bad_meta': top_by_sitemap([a for a in arts if a['meta_len_bad']]),
    'no_tables_top': top_by_sitemap([a for a in arts if a['tables'] == 0], 50),
    'no_tables_rest_count': len([a for a in arts if a['tables'] == 0]) - 50,
    'short_top': [
        {'slug': a['slug'], 'file': a['file'], 'words': a['words']}
        for a in top_by_sitemap([a for a in arts if a['words'] < 1500], 30)
    ],
}
out = {k: (v if not isinstance(v, list) else
           [{kk: a[kk] for kk in ('slug', 'file', 'words', 'h2', 'tables', 'ext_links', 'has_faq', 'meta_len', 'meta_len_bad') if kk in a} for a in v])
       for k, v in queues.items()}
Path('/home/z/my-project/scripts/gap_queues.json').write_text(json.dumps(out, indent=1))

print('no_ext_links:', len(queues['no_ext_links']), '| first 5:', [a['slug'] for a in queues['no_ext_links'][:5]])
print('no_faq:', [a['slug'] for a in queues['no_faq']])
print('bad_meta:', [(a['slug'], a['meta_len']) for a in queues['bad_meta']])
print('no_tables (will fix):', len(queues['no_tables_top']), '| remaining:', queues['no_tables_rest_count'])
print('short_top first 10:', [(a['slug'][:40], a['words']) for a in queues['short_top'][:10]])
