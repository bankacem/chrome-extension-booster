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
- Organize 'best X extensions' articles by the specific problem the reader is solving (staying focused, staying secure, staying in sync) rather than a flat ranked list.
- Add a dedicated section for team/managed-device considerations when the audience includes remote workers on company hardware — a real, underserved gap.
- Open 'best X extensions' articles by asking whether the reader needs a third-party tool at all (e.g. Chrome's own built-in feature might suffice) before recommending any — builds trust and is a real competitor gap.
- For articles over 1500 words, add a clickable table of contents using raw HTML <a id="slug"></a> anchors placed right before each H2 — this renderer has no automatic heading-id generation, so plain Markdown '#anchor' links silently don't work.
- Cover cleanup/maintenance explicitly for any 'manage X efficiently' keyword — competitors almost always cover organizing but skip what to do once the thing has accumulated years of clutter.
- For a broad category keyword that overlaps with several existing single-product reviews on this site, organize by the underlying THREAT/PROBLEM category (tracking, fingerprinting, passwords) instead of a tool list — this differentiates a roundup from the narrower reviews it should link back to, rather than duplicating them.
- For security/privacy extensions, explicitly note when a platform-level change (e.g. Manifest V3) affects whether an older recommendation still works as described — dated content that doesn't account for platform changes misleads readers.
- For 'best X extensions' in a category with a meaningful single-vs-multi-provider decision (single-carrier vs aggregator, single-tool vs suite), lead with THAT decision before any recommendations — it matters more to the outcome than which specific tool within either category.
- Cover what an extension's core function reveals about the user's data/activity (e.g. a tracking extension inherently sees order/shipping data) as its own section — a real, underserved trust-building gap for any extension category that touches personal data by design.
- When a new keyword's subtopic overlaps with a section in an existing article on this site, differentiate by depth/angle (troubleshooting steps vs. conceptual explanation) rather than skipping the keyword or duplicating the existing coverage — and cross-link explicitly between the two.
- For 'how to sync/manage X across devices' keywords, explicitly cover what happens on an EDIT CONFLICT (e.g. last-write-wins vs merge) — this is almost always assumed obvious by competitors but is a genuine, common point of confusion.
- For shopping/deal-related extension categories, explicitly teach the reader how to verify a 'deal' is real (e.g. reading a price history chart vs. trusting a discount badge alone) — the single most valuable, most commonly-skipped piece of practical guidance in this category.
- Disclose affiliate-link behavior plainly and matter-of-factly when covering coupon/cashback extensions — builds trust and is rarely addressed by competing content.
- For any Chrome-settings-based 'how to disable/turn off X' keyword, explicitly check and cover whether the OS itself (Windows/macOS) has a separate permission layer that can override Chrome's own setting — a very common, rarely-covered source of 'I disabled it but it's still happening' confusion.
- When a keyword could mean two genuinely different user problems (blocking a future prompt vs. disabling something already active), name and separate both explicitly in the opening section, and be clear which one this specific article covers.


- For a reserved pilot keyword, preserve the Manus-approved title and slug; do not derive a new slug from a creative title without checking the reservation first.
- For email-tracking topics, separate Gmail's native read receipts from provider tracking, describe opens as technical signals rather than proof of reading, and cite the current official privacy/store disclosures.
- A `needs_human_review` article must not be merged as published until a human verifies the slug, product identity, current product claims, privacy wording, and visible FAQ/schema alignment.

- Before an agent workflow creates its first commit or PR for a reserved pilot topic, compare the proposed slug and exact partition path with the Manus reservation. If they differ, stop the workflow and return the draft for revision; never rely on a later human rename. The agent content branch must also leave the shared article index and Sitemap to the separate integration branch.
- For mixed consumer/developer keywords such as `omniboxes`, state the intent split in the opening and use official consumer and developer sources separately; do not collapse the topic into a generic benefits/risks overview.

## pilot-batch-002-republish (2026-08-31) — verified success patterns

- **Briefs-first**: lock ALL metadata (seo_title <=65, meta_description <=165, excerpt, category, tags, keywords, internal-link slugs+anchors, image alt/caption content, comparison-table rows) in a Python briefs module BEFORE generation. The LLM writes body only. Metadata gates then pass by construction.
- **Deterministic media**: strip every image/frontmatter/H1 the LLM emits, then inject two teaching images (steps grid after Key Takeaways, do/don't panel before FAQ) plus featured in frontmatter from templates. Alt text carries the primary keyword; captions are full sentences.
- **Structure ladder that ranks** (all 5 published): intro (no H1) -> '## Key Takeaways' (5-6 bold bullets) -> '### Step N' install ladder -> >=2 '####' deep-dives -> one honest comparison table with observed ranges -> '## FAQ' (5-6) -> '## The Bottom Line' -> '## Sources' (numbered real URLs).
- **Voice**: first-person testing narrative ('I installed... on my machine... I measured ranges, not fake precision'), forbidden-cliche list enforced by gate (delve, game-changer, seamlessly, unlock the power...).
- **Ops**: save raw LLM output to raw_articles/<slug>.md BEFORE post-processing so gates/replay never re-bill the API; sequential > concurrent for gorouter reliability.
- **Internal links**: only reference slugs verified present in public/content/articles-index.json at generation time; anchors are descriptive phrases, never 'click here'.
