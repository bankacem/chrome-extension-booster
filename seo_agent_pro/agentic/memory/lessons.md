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
