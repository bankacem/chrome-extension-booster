#!/usr/bin/env python3
"""
migrate_to_github.py
====================
يحوّل المقالات المفقودة من Supabase Backup إلى ملفات .md
ويحدّث articles-index.json و sitemap.xml
مع إصلاح الصور والتصنيفات و H1 تلقائياً

الاستخدام:
  python3 migrate_to_github.py

يجب وضع الملفين في نفس مجلد المشروع (chrome-extension-booster-main):
  - extensionto-backup-2026-03-07.json
  - ثم شغّل السكريبت من داخل مجلد المشروع
"""

import json
import os
import re
from datetime import datetime

# ============================================================
# إعدادات
# ============================================================
BACKUP_FILE  = "extensionto-backup-2026-03-07.json"
PROJECT_DIR  = "."
ARTICLES_DIR = os.path.join(PROJECT_DIR, "public", "content", "articles")
INDEX_FILE   = os.path.join(PROJECT_DIR, "public", "content", "articles-index.json")
SITEMAP_FILE = os.path.join(PROJECT_DIR, "public", "sitemap.xml")
WEBSITE_URL  = "https://extensionto.com"
# ============================================================

# صور احتياطية حسب التصنيف
FALLBACK_IMAGES = {
    "Screenshots & Screen Capture": "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&q=80&w=1200",
    "Redirect & Navigation":        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    "Performance & Memory":         "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1200",
    "Appearance & Themes":          "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&q=80&w=1200",
    "Productivity & Tools":         "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=1200",
    "Security & Privacy":           "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=1200",
    "Mobile Optimization":          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1200",
    "Chrome Extensions":            "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&q=80&w=1200",
    "default":                      "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&q=80&w=1200",
}

def auto_category(title, current):
    """يصنّف المقال تلقائياً إذا كان التصنيف فارغاً أو عاماً"""
    if current and current not in ("", "General", "Screenshots & Screen Capture"):
        return current
    t = title.lower()
    if any(w in t for w in ["password", "security", "privacy", "identity", "hack", "encrypt", "safe", "protect", "phishing"]):
        return "Security & Privacy"
    if any(w in t for w in ["dark mode", "theme", "amoled", "night mode", "appearance", "color"]):
        return "Appearance & Themes"
    if any(w in t for w in ["tab", "memory", "ram", "freeze", "slow", "speed", "performance", "cpu", "battery", "crash"]):
        return "Performance & Memory"
    if any(w in t for w in ["popup", "blocker", "ad block", "adblocker", "redirect", "tracker", "vpn", "ads"]):
        return "Redirect & Navigation"
    if any(w in t for w in ["productivity", "workflow", "formula", "spreadsheet", "excel", "todo", "notion", "task"]):
        return "Productivity & Tools"
    if any(w in t for w in ["download", "youtube", "mp3", "mp4", "idm", "video", "audio"]):
        return "Productivity & Tools"
    if any(w in t for w in ["android", "mobile", "phone"]):
        return "Mobile Optimization"
    if any(w in t for w in ["screenshot", "screen capture", "capture", "snipping", "screen grab", "full page"]):
        return "Screenshots & Screen Capture"
    return current or "General"

def get_fallback_image(category):
    return FALLBACK_IMAGES.get(category, FALLBACK_IMAGES["default"])

def slugify_path(slug):
    """يحوّل slug إلى مسار مقسّم"""
    clean = slug.strip()
    chars = [c for c in clean if c.isalnum()]
    a = chars[0].lower() if len(chars) > 0 else "_"
    b = chars[1].lower() if len(chars) > 1 else "_"
    c = chars[2].lower() if len(chars) > 2 else "_"
    return os.path.join(ARTICLES_DIR, a, b, c, f"{clean}.md")

def make_frontmatter(article, category, image):
    """ينشئ frontmatter YAML للمقال"""
    def safe(val):
        if val is None:
            return ""
        return str(val).replace('"', "'").replace('\n', ' ')

    title     = safe(article.get("title", ""))
    slug      = safe(article.get("slug", ""))
    excerpt   = safe(article.get("excerpt", ""))
    meta      = safe(article.get("meta_description", ""))
    status    = safe(article.get("status", "draft"))
    author    = safe(article.get("author", "Admin"))
    read_time = article.get("read_time", 5) or 5

    pub_date = sched_date = ""
    if article.get("published_at"):
        pub_date = article["published_at"][:10]
    if article.get("scheduled_at"):
        sched_date = article["scheduled_at"][:10]

    tags = article.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    tags_str = json.dumps(tags, ensure_ascii=False)

    fm  = f'---\n'
    fm += f'title: "{title}"\n'
    fm += f'slug: "{slug}"\n'
    fm += f'excerpt: "{excerpt}"\n'
    fm += f'featured_image: "{image}"\n'
    fm += f'category: "{category}"\n'
    fm += f'tags: {tags_str}\n'
    fm += f'meta_description: "{meta}"\n'
    fm += f'status: "{status}"\n'
    if pub_date:
        fm += f'published_at: "{pub_date}"\n'
    if sched_date:
        fm += f'scheduled_at: "{sched_date}"\n'
    fm += f'author: "{author}"\n'
    fm += f'read_time: {read_time}\n'
    fm += f'---\n'
    return fm

def ensure_h1(content, title):
    """يضيف H1 في بداية المحتوى إذا لم يكن موجوداً"""
    if re.search(r'<h1[\s>]', content, re.IGNORECASE):
        return content
    return f"<h1>{title}</h1>\n\n" + content

def make_index_entry(article, category, image):
    """ينشئ entry للـ articles-index.json"""
    pub_date = ""
    if article.get("published_at"):
        pub_date = article["published_at"][:10]
    elif article.get("scheduled_at"):
        pub_date = article["scheduled_at"][:10]

    return {
        "slug":             article.get("slug", ""),
        "title":            article.get("title", ""),
        "excerpt":          article.get("excerpt", "") or "",
        "image_url":        image,
        "category":         category,
        "tags":             article.get("tags") or [],
        "published_at":     pub_date,
        "status":           article.get("status", "draft"),
        "read_time":        article.get("read_time", 5) or 5,
        "author":           article.get("author", "Admin") or "Admin",
        "meta_description": article.get("meta_description", "") or "",
    }

def generate_sitemap(all_articles):
    """ينشئ sitemap.xml كامل"""
    today = datetime.now().strftime("%Y-%m-%d")
    urls = []

    urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>')
    urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>')
    urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/privacy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>')
    urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/terms</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>')

    for a in all_articles:
        status = a.get("status", "draft")
        if status not in ("published", "scheduled"):
            continue
        slug = a.get("slug", "")
        if not slug:
            continue
        date = a.get("published_at") or a.get("scheduled_at") or today
        date = date[:10]
        urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/blog/{slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n    <lastmod>{date}</lastmod>\n  </url>')

    for ext in ["quick-screenshot-lite","auto-dark-mode-switcher","redirect-shield",
                "protab-suspender","light-popup-blocker","formula-builder-pro",
                "securakey-pro","offline-reader-pro","cookie-banner-blocker"]:
        urls.append(f'  <url>\n    <loc>{WEBSITE_URL}/extension/{ext}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>')

    return '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>"


def main():
    print("=" * 60)
    print("  migrate_to_github.py — نقل المقالات إلى GitHub")
    print("=" * 60)

    print(f"\n📦 تحميل الـ Backup ...")
    with open(BACKUP_FILE, encoding="utf-8") as f:
        backup = json.load(f)
    all_backup = backup.get("articles", [])
    print(f"   إجمالي المقالات في Backup: {len(all_backup)}")

    print(f"\n📁 قراءة GitHub Index ...")
    with open(INDEX_FILE, encoding="utf-8") as f:
        github_index = json.load(f)
    github_slugs = set(a["slug"] for a in github_index)
    print(f"   مقالات موجودة في GitHub: {len(github_index)}")

    missing = [a for a in all_backup if a.get("slug") not in github_slugs]
    print(f"\n🔍 مقالات ستُضاف: {len(missing)}")
    from collections import Counter
    for s, n in Counter(a.get("status","?") for a in missing).most_common():
        print(f"   {s}: {n}")

    if not missing:
        print("\n✅ كل المقالات موجودة في GitHub!")
        return

    print(f"\n📝 إنشاء الملفات ...")
    created = skipped = 0
    new_entries = []

    for article in missing:
        slug = article.get("slug", "").strip()
        if not slug:
            skipped += 1
            continue

        title    = article.get("title", "")
        content  = article.get("content", "") or ""
        category = auto_category(title, article.get("category", ""))
        image    = article.get("featured_image") or get_fallback_image(category)
        content  = ensure_h1(content, title)

        filepath = slugify_path(slug)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        if os.path.exists(filepath):
            skipped += 1
            continue

        try:
            fm = make_frontmatter(article, category, image)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(fm + "\n" + content)
            created += 1
            new_entries.append(make_index_entry(article, category, image))
        except Exception as e:
            print(f"   ❌ خطأ في {slug}: {e}")

    print(f"   ✅ تم إنشاء: {created} ملف")
    print(f"   ⏭️  تخطي: {skipped}")

    # تحديث articles-index.json
    print(f"\n📋 تحديث articles-index.json ...")
    updated_index = github_index + new_entries
    updated_index.sort(key=lambda x: x.get("published_at","") or "", reverse=True)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_index, f, ensure_ascii=False, indent=2)
    print(f"   المجموع الجديد: {len(updated_index)} مقال")

    # إعادة توليد sitemap.xml
    print(f"\n🗺️  تحديث sitemap.xml ...")
    with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
        f.write(generate_sitemap(updated_index))
    pub_count = len([a for a in updated_index if a.get("status") in ("published","scheduled")])
    print(f"   URLs في السيتماب: {pub_count}")

    print("\n" + "=" * 60)
    print("  ✅ اكتمل بنجاح!")
    print("=" * 60)
    print(f"  ملفات .md أُنشئت:    {created}")
    print(f"  articles-index.json: {len(updated_index)} مقال")
    print(f"  sitemap.xml:         {pub_count} مقال")
    print()
    print("  الخطوات التالية لـ Jules:")
    print('  git add public/')
    print('  git commit -m "feat: migrate 383 articles from Supabase to GitHub"')
    print('  git push')
    print("=" * 60)

if __name__ == "__main__":
    main()


def fix_existing_articles(github_index):
    """يصلح الصور والتصنيفات للمقالات الموجودة مسبقاً في GitHub"""
    fixed_img = fixed_cat = 0
    for a in github_index:
        title = a.get("title", "")
        cat = auto_category(title, a.get("category", ""))
        if cat != a.get("category", ""):
            a["category"] = cat
            fixed_cat += 1
        if not a.get("image_url"):
            a["image_url"] = get_fallback_image(cat)
            fixed_img += 1
    return github_index, fixed_img, fixed_cat
