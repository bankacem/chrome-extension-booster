# Trust Claims Inventory — Read-Only Audit (2026-10-07)

Scope: every place in `src/` and `public/` that displays trust signals — the
"Trusted by 50,000+" claim, "leading companies", user testimonials (names,
avatars, quotes), star ratings, and user/download counts.

Method: deterministic regex scan over `src/` and `public/` (excluding
`node_modules`) plus manual reading of each flagged file. No files were
modified for this audit; this document is the only output.

Answer to the central question first: **there is no data source anywhere in
the repository that supports any of these claims.** No database table, no
fetch/API client, no JSON dataset feeds the 50,000+ figure, the 500,000
downloads figure, the per-extension user counts, the star ratings, the
testimonial quotes, or the partner names. Every one of them is hardcoded
copy in a component, a data module, or an i18n string file. The values
render identically on every request regardless of any real-world state.

---

## 1. "Trusted by 50,000+ users" family

| File | Line | Content |
|------|------|---------|
| `src/components/SEO.tsx` | 32 | default meta description: "…Trusted by 50,000+ users." |
| `src/i18n/locales/en/common.json` | 11 | hero badge: "Trusted by 50,000+ users worldwide" |
| `src/i18n/locales/ar/common.json` | 11 | "موثوق به من أكثر من 50,000 مستخدم حول العالم" |
| `src/i18n/locales/pt/common.json` | 11 | "Confiado por mais de 50.000 usuários em todo o mundo" |
| `src/i18n/locales/en/common.json` | 153 | CTA: "Join 50,000+ users who have already upgraded their Chrome experience…" |
| `src/i18n/locales/ar/common.json` | 153 | "انضم إلى أكثر من 50,000 مستخدم…" |
| `src/i18n/locales/pt/common.json` | 153 | "Junte-se a mais de 50.000 usuários…" |
| `src/i18n/locales/en/common.json` | 186 | SEO default description: "…Trusted by more than 50,000 users." |
| `src/i18n/locales/ar/common.json` | 186 | "…موثوق بها من أكثر من 50,000 مستخدم." |
| `src/i18n/locales/pt/common.json` | 186 | "…Confiado por mais de 50.000 usuários." |
| `src/i18n/locales/es/common.json` | 26 | SEO default description: "…Con la confianza de más de 50.000 usuarios." |
| `src/i18n/locales/fr/common.json` | 26 | "…Fait confiance par 50 000+ utilisateurs." |
| `src/components/HeroSection.tsx` | 77 | hero stat `{ value: "50K+", label: t("hero.active_users") }` |
| `src/components/StatsBar.tsx` | 7 | `{ icon: Download, value: 500000, suffix: "+", key: "downloads" }` — animated counter renders "500,000+" |
| `src/components/StatsBar.tsx` | 8 | `{ icon: Users, value: 50000, suffix: "+", key: "active_users" }` — renders "50,000+" |

`HeroSection`, `StatsBar` are rendered on the homepage (`src/pages/Index.tsx`
lines 39–41). `SEO.tsx`'s default description is the fallback meta for any
page that does not pass its own description.

Data source: none. The numbers are literals in the files above.

## 2. "Leading companies" / partners

| File | Line | Content |
|------|------|---------|
| `src/i18n/locales/en/common.json` | 23 | `"partners": { "trusted": "Trusted by teams at leading companies" }` |
| `src/i18n/locales/ar/common.json` | 23 | "موثوق به لدى فرق في شركات رائدة" |
| `src/i18n/locales/pt/common.json` | 23 | "Confiado por equipes de empresas líderes" |
| `src/components/PartnersSection.tsx` | 4–10 | list of { name, logo } for Google, Microsoft, Apple, Amazon, Meta, Netflix — the "logos" are letter initials rendered as text (`<span>{partner.logo}</span>`, line 37) |

`PartnersSection` renders on the homepage (`src/pages/Index.tsx` line 40).
The repo contains no partnership agreement, authorization, or reference that
connects ExtensionTo to any of the six named companies.

## 3. User testimonials

| File | Line | Content |
|------|------|---------|
| `src/components/TestimonialsSection.tsx` | 5–34 | hardcoded array of 4 testimonials: Sarah Chen (Product Designer, avatar "SC"), Marcus Johnson (Software Developer, "MJ"), Emily Rodriguez (Freelance Writer, "ER"), David Kim (Marketing Manager, "DK"), each with `rating: 5` |
| `src/components/TestimonialsSection.tsx` | 79 | 5-star row rendered from `testimonial.rating` |
| `src/components/TestimonialsSection.tsx` | 90, 93–94 | avatar (initials, not photos), name, role |
| `src/i18n/locales/en/common.json` | 97–108 | localized quotes + roles (`testimonials.items.one…four`) |
| `src/i18n/locales/ar/common.json` | 97+ | same, Arabic |
| `src/i18n/locales/pt/common.json` | 97+ | same, Portuguese |
| `src/pages/Index.tsx` | 45 | `<TestimonialsSection />` on the homepage |

Notes:
- Avatars are two-letter initials ("SC"), not photos. There are no
  testimonial image files anywhere in `public/images/`.
- The quotes mention products by name ("Productivity Booster", "DevTools
  Enhancer", "Focus Mode Pro", "Privacy Guard") — none of these names exist
  in `src/lib/extensionsData.ts`; the testimonial products and the actual
  product catalog do not overlap.
- `es/` and `fr/` locale files have no `testimonials` key.
- Data source: none. Names, roles and quotes are static copy.

## 4. Star ratings

| File | Line | Content |
|------|------|---------|
| `src/lib/extensionsData.ts` | 27, 49, 71, 93, 115, 137, 159, 181, 203 | `rating: "4.9" / "4.8" / "4.7"` for the 9 catalog extensions |
| `src/components/ExtensionsSection.tsx` | 67 | `★ {extension.rating}` display |
| `src/components/StatsBar.tsx` | 9 | `{ icon: Star, value: 4.9, key: "average_rating" }` — "4.9 average rating" on the homepage |
| `src/components/HeroSection.tsx` | 79 | `{ value: "4.9", label: t("hero.average_rating") }` |
| `src/lib/autoExtensionLinker.ts` | 73–78 | auto-injected extension box inside article HTML renders `★ {rating}` and `{users} users` |
| `src/components/seo/DirectDownloadSection.tsx` | 130 | `★ {rating} Rating` (component currently unreachable — imported in `src/pages/BlogPost.tsx` line 11 but never rendered; not referenced by any page) |
| `src/components/seo-dashboard/CompetitorInsights.tsx` | 218 | `storeRating ★` (internal SEO dashboard only, not public) |

Data source: none. Ratings are string literals in `extensionsData.ts` and in
the two homepage stat blocks. The repo contains no Chrome Web Store API
client, no scraper output, and no JSON dataset from which a rating could be
derived.

## 5. User / download counts per extension

| File | Line | Content |
|------|------|---------|
| `src/lib/extensionsData.ts` | 26, 48, 70, 92, 114, 136, 158, 180, 202 | `users: "2K+", "3K+", "5K+", "4K+", "6K+", "1.5K+", "3.5K+", "2.5K+", "7K+"` for the 9 catalog extensions |
| `src/components/ExtensionsSection.tsx` | 64 | `{extension.users}` + "users" label |
| `src/lib/autoExtensionLinker.ts` | 73–75 | same numbers injected into article content boxes |
| `src/components/HeroSection.tsx` | 78, 80 | `{ value: "12", label: extensions }`, `{ value: "99%", label: satisfaction }` |
| `src/components/StatsBar.tsx` | 10 | `{ icon: Clock, value: 24, suffix: "/7", key: "support" }` |

Data source: none — same conclusion as §4.

## 6. Related observations (context for the claims above)

- `src/components/seo/DirectDownloadSection.tsx` line 34:
  `auditTimestamp = new Date().toLocaleDateString(...)` — the timestamp shown
  under "INFORMATION LAST UPDATED" (label changed in #511 from "SECURITY
  AUDIT TIMESTAMP") is generated from the clock at render time, not read
  from any data source. Default props on lines 55–57 are placeholders
  (`version = "2.4.1"`, `size = "1.2 MB"`). The component is currently
  tree-shaken out of the public bundle (dead import), so none of this
  renders on the live site.
- No code in the repository computes SHA-256, verifies digital signatures,
  or scans downloadable files (`grep` for `sha-256|createHash|crypto.subtle|
  digest(` in `src/` and `scripts/` returns only static UI labels and MD5
  slug-hashing in offline content-pipeline scripts).
- The pre-#511 wording "Our security engine has scanned this file…",
  "No Adware/Spyware Detected", "Digital Signature Valid", "SHA-256 Hash
  Verified" described capabilities that never existed in code; #511 removed
  or reworded them (merged 2026-10-07, commit 7bbdb569).

## 7. Summary

Every trust signal displayed on the site is editorial copy: no repository
data source, API client, or dataset stands behind the 50,000+/500,000+
figures, the 4.9/4.7–4.9 ratings, the per-extension user counts, the four
named testimonials, or the six-company partner strip. Any future change to
these claims is a pure copy change in the files listed above; conversely,
none of them can be "fixed" by wiring up data that the repository does not
have.
