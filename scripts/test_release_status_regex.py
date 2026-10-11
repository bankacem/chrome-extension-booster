#!/usr/bin/env python3
"""Unit test for the draft-status regex used by .github/workflows/release-scheduled-drafts.yml.

Historical bug (dead since 2026-08-23, commit 939d0c69): the workflow used
    r'^status:\\s*draft\\s*$'
(double backslash inside a RAW string = regex that matches a LITERAL backslash
followed by 's'). So 'status: draft' never matched, the auto-selection loop
skipped every draft, and every scheduled run printed a green 'No due release'
while overdue drafts piled up. All releases after 2026-08-23 were manual
workflow_dispatch runs.

Run:  python3 scripts/test_release_status_regex.py   -> exit 0 on success
"""
import re
import sys
from pathlib import Path

# The CORRECT pattern (single backslashes), identical to what the workflow uses.
PATTERN = r'^status:\s*draft\s*$'
WORKFLOW = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'release-scheduled-drafts.yml'

MUST_MATCH = [
    'status: draft',
    'status:draft',
    'status:  draft',
    'status: draft   ',
    '---\nid: x\nstatus: draft\nslug: y\n---\nbody',   # multiline frontmatter context (re.M)
]
MUST_NOT_MATCH = [
    'status: published',
    'status: merged',
    'status: draft-2026',
    'status: drafty',
    'xstatus: draft',
    'status: DRAFT',            # case-sensitive by design (workflow passes no re.I)
    'indented status: draft',   # ^ anchor: only line-start matches
]


def main() -> int:
    failures = []

    for s in MUST_MATCH:
        if not re.search(PATTERN, s, re.M):
            failures.append(f'should MATCH but does not: {s!r}')
    for s in MUST_NOT_MATCH:
        if re.search(PATTERN, s, re.M):
            failures.append(f'should NOT match but does: {s!r}')

    # The workflow file must use the fixed pattern everywhere and must NOT
    # contain the historical double-escaped variant.
    txt = WORKFLOW.read_text()
    broken = "r'^status:\\\\s*draft\\\\s*$'"   # literal: r'^status:\\s*draft\\s*$'
    fixed = "r'^status:\\s*draft\\s*$'"        # literal: r'^status:\s*draft\s*$'
    if broken in txt:
        failures.append('workflow still contains the DOUBLE-ESCAPED broken pattern ' + broken)
    n_fixed = txt.count(fixed)
    if n_fixed < 3:
        failures.append(
            f'workflow should use the fixed pattern in all 3 sites '
            f'(auto-selection, pre-release check, status rewrite); found {n_fixed}'
        )

    if failures:
        for f in failures:
            print('FAIL:', f)
        print(f'\n{len(failures)} test(s) FAILED')
        return 1

    print('OK: regex matches drafts (status: draft) and rejects published/merged/other values.')
    print(f'OK: workflow uses the fixed single-escape pattern at {n_fixed} sites; double-escaped pattern absent.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
