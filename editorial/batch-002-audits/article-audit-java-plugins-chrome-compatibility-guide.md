# Audit — `java-plugins-chrome-compatibility-guide`

**Primary keyword:** `chrome plugins java`  
**KeywordStats signal:** 500 average monthly searches; competition `Faible`; indexed competition `0`. These are planning data, not Search Console performance.

**Proposed title:** Java Plugins in Chrome: What Still Works, What Does Not, and Safer Alternatives  
**Reserved slug:** `java-plugins-chrome-compatibility-guide`  
**Search intent:** diagnose whether Java applets/plugins can run in current Chrome and choose a supported alternative

## Internal overlap decision

A legacy French-titled Chrome programming article exists, but no current English guide answers the Java-plugin compatibility question directly.

## Competitor/content gap to address

Give a clear no-unsupported-workaround answer for NPAPI applets, distinguish applets from Web Start, and explain enterprise migration/alternative paths without unsafe flags or old downloads.

## Editorial plan

The article must open with the reader decision represented by the intent above, then give a task-specific setup or compatibility path, followed by limitations, privacy/security considerations, troubleshooting, and a concise final decision. It must not copy a generic introduction, TL;DR, FAQ, comparison table, or image from another article. Any product claim must be checked against the first-party sources below at generation time.

## Acceptance constraints

The agent must use the exact reserved slug and write only the assigned article plus its audit on its own branch. The content PR must not modify `public/content/articles-index.json`, `public/sitemap.xml`, or another article. The article remains `status: draft` until human review; this batch is intentionally not published or scheduled.

## Sources

[1]: https://www.java.com/en/download/help/chrome.html
[2]: https://developer.chrome.com/apps/npapi

## Reserved status

`approved_for_generation` — generation is authorized for this controlled batch, not publication authorization.
