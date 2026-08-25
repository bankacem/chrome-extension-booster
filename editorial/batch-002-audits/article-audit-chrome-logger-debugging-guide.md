# Audit — `chrome-logger-debugging-guide`

**Primary keyword:** `chrome logger`  
**KeywordStats signal:** 500 average monthly searches; competition `Faible`; indexed competition `0`. These are planning data, not Search Console performance.

**Proposed title:** Chrome Logger Guide: Server-Side Debugging, Setup, and Security Limits  
**Reserved slug:** `chrome-logger-debugging-guide`  
**Search intent:** developer setup and security review for Chrome Logger server-side debugging

## Internal overlap decision

Existing developer and blogging articles mention Chrome tools but do not own the Chrome Logger debugging task.

## Competitor/content gap to address

Cover the server library/header model, supported maintenance reality, local/staging-only workflow, sensitive-log risks, and modern alternatives instead of presenting it as a universal production tool.

## Editorial plan

The article must open with the reader decision represented by the intent above, then give a task-specific setup or compatibility path, followed by limitations, privacy/security considerations, troubleshooting, and a concise final decision. It must not copy a generic introduction, TL;DR, FAQ, comparison table, or image from another article. Any product claim must be checked against the first-party sources below at generation time.

## Acceptance constraints

The agent must use the exact reserved slug and write only the assigned article plus its audit on its own branch. The content PR must not modify `public/content/articles-index.json`, `public/sitemap.xml`, or another article. The article remains `status: draft` until human review; this batch is intentionally not published or scheduled.

## Sources

[1]: https://craig.is/writing/chrome-logger
[2]: https://github.com/ccampbell/chromelogger
[3]: https://chromewebstore.google.com/detail/chrome-logger/noaneddfkdjfnfdakjjmocngnfkfehhd?hl=en

## Reserved status

`approved_for_generation` — generation is authorized for this controlled batch, not publication authorization.
