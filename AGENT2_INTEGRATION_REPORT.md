# AGENT 2 INTEGRATION REPORT — ExtensionTo.com

**Date:** 2026-05-14
**Status:** Analysis complete. No Agent 2 RAR file was uploaded — this report documents the existing pipeline and defines the integration interface.
**Source of analysis:** `src/pages/AIGenerator.tsx` (1,569 lines), `scripts/sync-articles.mjs`, Supabase integration layer

---

## 1. What is Agent 2?

Agent 2 is an external article generation pipeline described in the project instructions. It is presumed to be:
- A separate system (possibly Python, Node.js, or a hosted service) that generates blog article content
- It would publish articles either directly to the GitHub repository (as markdown files) OR via the Supabase API
- The RAR file referenced in instructions was not uploaded — only the text instructions describing Agent 2 behavior

This report documents the **existing Agent 1 pipeline** (the built-in AIGenerator.tsx) and defines the **integration contract** that Agent 2 must follow.

---

## 2. Existing AI Generator Pipeline — Agent 1

### Architecture:

```
User → /settings/ai-generator (noindexed admin route)
  ↓
AIGenerator.tsx
  ↓ (1) Keyword input → AI API call
  ↓
AI Provider (Lovable/OpenRouter/OpenAI/Gemini/Groq)
  ↓ returns { title, slug, content, excerpt, meta_description, keywords, category }
  ↓ (2) Slug cleaned: cleanSlug(title) → max 80 chars
  ↓ (3) Collision check: Supabase .select("id").eq("slug", uniqueSlug)
  ↓ (4) On collision: withCollisionSuffix(slug) → append 4-char random
  ↓ (5) Insert into Supabase articles table
  ↓ (6) If status="published": invoke publish-to-github Edge Function
  ↓
Supabase Edge Function: publish-to-github
  ↓
GitHub API: create/update file at /public/content/articles/{c1}/{c2}/{c3}/{slug}.md
  ↓
Manual: Run node scripts/sync-articles.mjs → rebuild articles-index.json
  ↓
Manual: Run node scripts/generate-sitemap.mjs → rebuild sitemap.xml
```

### Supported AI Providers:
| Provider | Models |
|---|---|
| Lovable AI (default, no key needed) | Gemini 3 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro, GPT-5 Mini, GPT-5 |
| OpenRouter | Claude 3.5 Sonnet, Gemini 2.0 Flash, GPT-4o, Llama 3.3 70B, DeepSeek |
| AgentRouter | GPT-5, Claude Sonnet 4, Gemini 2.5 Pro, DeepSeek, Grok 4 |
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo |
| Google Gemini | Gemini 2.0 Flash, 2.5 Flash Preview, 2.5 Pro Preview |
| Groq | Llama 3.3 70B, Llama 3.1 70B, Llama 3.1 8B, Mixtral 8x7B, Gemma 2 9B |

### Supported Languages:
- English (primary)
- Arabic (العربية)
- French (Français)
- Spanish (Español)
- German (Deutsch)

**Note:** Non-English articles are published with English taxonomy categories, creating a hreflang gap (no language annotation).

---

## 3. Article Frontmatter Schema (Current)

Every article markdown file must have this YAML frontmatter to be indexed correctly:

```yaml
---
title: "The Complete Title of the Article"
slug: "url-safe-slug-max-80-chars"
status: "published"
published_at: "2026-05-14T09:00:00.000Z"
updated_at: "2026-05-14T09:00:00.000Z"
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
meta_description: "160-character max SEO description without trailing punctuation"
excerpt: "200-character article teaser for blog listing"
featured_image: ""
read_time: 5
views: 0
tags: ["tag1", "tag2", "tag3"]
keywords: ["keyword1", "keyword2", "keyword3"]
---

[Article body in Markdown...]
```

**Required fields:** `title`, `slug`, `status: "published"`, `published_at`

**Auto-derived if missing:**
- `meta_description` — first paragraph of body (160 chars)
- `category` — taxonomy auto-classifier in sync-articles.mjs
- `author` — defaults to "ExtensionTo Editorial"
- `read_time` — not derived; defaults to 5

**IMPORTANT — Tags/Keywords:** The `sync-articles.mjs` now reads `tags` and `keywords` from frontmatter. Agent 2 MUST include these as YAML arrays, not strings.

---

## 4. Taxonomy Categories (Valid Values)

Agent 2 must use one of these categories or the auto-classifier will reclassify:

```
Chrome Extensions         (general, catch-all)
Ad Blocking               (uBlock, AdBlock, Ghostery, popup blockers)
Screenshot & Screen Capture  (screenshot tools, screen recorders)
Privacy & Security        (password managers, VPN, trackers, fingerprint)
Downloads & Media         (YouTube downloaders, video savers, IDM)
Productivity & Workflow   (Grammarly, bookmarks, focus tools, sheets)
Performance & Memory      (tab suspenders, RAM savers, Great Suspender)
Developer Tools           (DevTools, API testing, JSON formatters, CORS)
Mobile & Android          (Kiwi browser, Android extensions, mobile)
Social Media              (LinkedIn, Twitter, Facebook, TikTok extensions)
Dark Mode & Themes        (dark mode switchers, night mode, AMOLED)
```

**Auto-classifier note:** Even if Agent 2 sets a category, `sync-articles.mjs` will override it with the auto-classifier result. The `original_category` field preserves the original for debugging.

---

## 5. File Partition System

Articles are stored at:
```
/public/content/articles/{c1}/{c2}/{c3}/{slug}.md
```

Where `c1`, `c2`, `c3` are the first three characters of the slug.

**Agent 2 must use this exact path scheme.** The `sync-articles.mjs` walks this directory tree to rebuild the index. Files placed outside this structure will not be indexed.

**Example:**
```
slug: "adblock-chrome-android-guide"
path: /public/content/articles/a/d/b/adblock-chrome-android-guide.md
```

---

## 6. Integration Contract — What Agent 2 Must Do

### Option A: Direct GitHub File Write (Recommended)

Agent 2 writes markdown directly to the GitHub repository at the correct path. This is the same method used by the `publish-to-github` Supabase Edge Function.

```
POST /repos/{owner}/{repo}/contents/public/content/articles/{c1}/{c2}/{c3}/{slug}.md
Authorization: Bearer {GITHUB_TOKEN}
Body: {
  "message": "Add article: {slug}",
  "content": base64_encode(markdown_with_frontmatter),
  "branch": "main"
}
```

After writing, Agent 2 triggers rebuild:
```bash
node scripts/sync-articles.mjs
node scripts/generate-sitemap.mjs
```

### Option B: Supabase API Insert + publish-to-github

1. Insert into Supabase `articles` table with `status: "published"`
2. Invoke `publish-to-github` Edge Function
3. Trigger sync scripts

### Option C: Direct Markdown File Drop (if Agent 2 has server access)

Drop `.md` files directly into the articles directory, then trigger sync scripts.

---

## 7. SEO Quality Requirements for Agent 2

Every article Agent 2 generates must meet:

| Requirement | Target | Validation |
|---|---|---|
| Word count | ≥ 800 words | Enforced by validator |
| Title length | 40-70 characters | Enforced by validator |
| meta_description | 120-160 characters | Enforced by validator |
| Slug length | ≤ 80 characters | `cleanSlug()` enforced |
| Unique slug | No collision with existing | Check `articles-index.json` |
| Tags | 3-7 YAML array items | Required for internal linking quality |
| Keywords | 3-10 YAML array items | Required for internal linking quality |
| Category | One of 11 valid categories | Auto-corrected by classifier |
| Author | "ExtensionTo Editorial" | Auto-corrected by sync script |
| Status | "published" | Must be set for indexing |
| Frontmatter format | Valid YAML | Validated by sync script |

**Content quality requirements:**
- No "In conclusion" boilerplate closings (AI spam signal)
- No "Are you tired of..." openers
- No "In this article we will..." introductions
- Include specific product names, versions, and comparisons (differentiates from generic AI content)
- Include FAQ section with real questions (structured data opportunity)
- Include at least 1 comparison table or list (scannable content signal)

---

## 8. Slug Generation Instructions for Agent 2

```python
# Python equivalent of slug.ts cleanSlug()
import unicodedata, re

def clean_slug(title: str, max_length: int = 80) -> str:
    # NFKD normalize + strip diacritics
    normalized = unicodedata.normalize("NFKD", title)
    ascii_only = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    # Lowercase, replace non-alphanumeric with hyphen
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower())
    # Collapse hyphens, strip leading/trailing
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:max_length]

# Collision check: load articles-index.json, check if slug exists
# If collision: append 4-char random hex (NOT mm/ml prefix)
import secrets
def with_collision_suffix(slug: str) -> str:
    return f"{slug}-{secrets.token_hex(2)}"
```

---

## 9. Internal Linking Integration

Agent 2 should NOT try to inject internal links into article content. The `inject-related-articles.mjs` script handles this automatically by appending a "## Related Articles" section based on category and keyword matching.

If Agent 2 wants to suggest related articles, it should include them as frontmatter:
```yaml
related_slugs: ["slug-1", "slug-2", "slug-3"]
```

The inject script will prioritize frontmatter-suggested related articles over its own selection algorithm (Phase 3 enhancement).

---

## 10. Validation Checklist Before Merge

Before any Agent 2 article is made live:

```bash
# 1. Validate the markdown file
node scripts/validate-pre-deploy.mjs --file public/content/articles/{c1}/{c2}/{c3}/{slug}.md

# 2. Re-index
node scripts/sync-articles.mjs

# 3. Verify no new duplicates
node scripts/validate-pre-deploy.mjs --check-duplicates

# 4. Regenerate sitemap
node scripts/generate-sitemap.mjs

# 5. Check output
cat public/content/articles-index.json | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const latest = d[0];
  console.log('Latest article:', latest.slug, '|', latest.word_count, 'words');
"
```
