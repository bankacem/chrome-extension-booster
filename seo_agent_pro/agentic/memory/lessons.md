# Accumulated lessons

Auto-updated by the Learning Agent whenever the Evaluator finds a new class
of issue. These rules are injected into the Content and Optimizer agents'
prompts on every run. Do not delete entries by hand without checking
cycle_log.json — they exist because a real published article violated them.

- Every internal or external link MUST resolve to a real, existing URL. If
  you don't know a real internal article to link to, write the sentence
  without a link rather than inventing a "#" placeholder — a dead link on a
  published page is worse than no link.
- Never write an image with a placeholder src like "image-url-placeholder"
  or similar. If you don't have a real image URL, don't include an image at
  all.
- The full <title> tag is `{seo_title or title} | ExtensionTo` and MUST stay
  at or under 60 characters total (46 for the title itself). If the natural
  title is longer, write a shorter seo_title — don't just leave it unset.

## Patterns that work well (from real published demonstrations)

Extracted from articles that scored well and were published — either by the agent pipeline itself, or by a human/Claude writing a demonstration article the pipeline currently can't reliably produce end-to-end yet. Positive guidance, not hard rules — follow the spirit, not necessarily the letter.

- Open 'best X extensions' articles by asking whether the reader needs a third-party tool at all, before recommending any — this builds trust and is a genuine competitor gap almost no roundup covers.
- Organize recommendation sections by the READER'S TASK (e.g. 'Best for annotating', 'Best for filling forms') rather than by product ranking — it reads less like generic AI-generated content and helps different readers self-select.
- Always include a dedicated section on permissions/privacy scope for extensions that need broad page access — this is a real gap in most competing content and builds reader trust.
- For articles over 1500 words, include a short table-of-contents bullet list right after the intro hook, before the first H2 — improves scannability and time-on-page.
- Address DATA PORTABILITY / lock-in explicitly for any tool that stores user data in a proprietary format or service — almost no competing content covers whether a reader can get their data back out, and it's a genuine trust-building gap to fill.
- Add a short 'a few real setups' section mapping 2-3 distinct reader personas (e.g. student, freelancer, long-term archivist) to specific recommendations — helps different search intents self-select and increases the odds a given reader finishes the article instead of bouncing.
