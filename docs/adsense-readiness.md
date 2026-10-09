# AdSense Readiness Audit — extensionto.com

Read-only inventory (owner delegation 2026-10-09, item ب-1). Evidence quotes
reference the repo at merge time. No code changed by this document.

**Owner-provided AdSense rejection reason:** _not provided (field left
blank in the brief)_. When available, map it against the gaps below —
the most probable policy basis for this site is "low value content" and
the missing policy pages, both addressed separately.

## 1. Required-pages matrix

| Page | Exists (route + component) | Live word count | Linked in footer/header | In sitemap.xml | Statically prerendered | Placeholder/"coming soon" text |
|---|---|---|---|---|---|---|
| /privacy | YES — `src/pages/Privacy.tsx` (route `src/App.tsx:65`) | ~70 (prerender body: 3 sentences, `scripts/prere­nder-static-pages.ts:469`) | NO — footer links only `/` and `/settings` (`src/components/Footer.tsx:47,130`) | YES (`scripts/generate-sitemap.ts:109`) | YES — short hardcoded body | No placeholders, but content is far too thin for AdSense |
| /terms | YES — `src/pages/Terms.tsx` (`src/App.tsx:66`) | ~120 effective (prerender: 3 sentences, line 470) | NO (same footer evidence) | YES (`:110`) | YES — short hardcoded body | Same thinness issue |
| /editorial-policy | YES — `src/pages/EditorialPolicy.tsx` (`src/App.tsx:67`) | ~250 (prerender body, line 234) | Only from Blog + BlogPost pages (`src/pages/Blog.tsx:168`, `src/pages/BlogPost.tsx:443`) — NOT in footer/header | YES (`:111`) | YES (fullest of the three) | No placeholders |
| /about | **NO** — no route, no component (404 live) | — | NO | NO | NO | — |
| /contact | **NO** — no standalone route (contact form only embedded on homepage `#contact` anchor) | — | NO (nav has "Contact" label → homepage anchor only) | NO | NO | — |
| /cookies | **NO** — no route, no component (404 live) | — | NO | NO | NO | — |

## 2. Contact form — what it actually does

`src/components/ContactSection.tsx` `handleSubmit` (lines ~21–30):

```ts
// Simulate form submission
await new Promise(resolve => setTimeout(resolve, 1000));
toast.success(t("contact.sent_success"));
```

It calls **no endpoint** — it sleeps 1 second and shows a success toast.
Messages are NOT delivered anywhere. Per owner protocol this is reported,
not rewired. A working contact channel currently requires the email below.

## 3. Contact email present in the repo

- `src/components/ContactSection.tsx:33` — `value: "dhaichione@gmail.com"`
  (owner-provided, merged with #516). This is the only real, reachable
  contact address on the site. Fake values removed by #516:
  `support@extensionhub.com` (foreign domain), `+1 (555) 123-4567`,
  `San Francisco, CA` (`ContactSection.tsx:34-36` pre-#516).

## 4. robots.txt / ads.txt

- `public/robots.txt` (full contents): `User-agent: * / Allow: /` +
  Sitemap line. **Does not block** Mediapartners-Google or ads.txt. ✅
- `public/ads.txt` (full contents): `google.com, pub-4095000151387004,
  DIRECT, f08c47fec0942fa0` — already live; publisher ID belongs to the
  owner. Not modified by this audit.

## 5. Scripts, cookies, analytics, localStorage actually used

| What | Evidence (file:line) | Sets cookies / storage? |
|---|---|---|
| Google AdSense loader `ca-pub-4095000151387004` | `index.html:5-6` | Yes — ad personalization cookies (`IDE`, `DSID`…) once ads serve |
| Google Analytics 4 (gtag.js) `G-94C4MW583Z` | `index.html:8-14` | Yes — `_ga`, `_ga_*` cookies |
| i18next language persistence | `src/i18n/index.ts:47-49` (`order: ['path','localStorage','navigator']`, `caches: ['localStorage']`) | localStorage key `i18nextLng` |
| Supabase auth storage (admin pages only) | `src/integrations/supabase/client.ts:19-20` | localStorage session tokens; admin-only surface |
| Theme toggle | dark-mode class handling in UI components | no persistent cookie found |

**Cookie consent mechanism (CMP/banner): NONE.** No consent manager, no
`navigator.cookieEnabled` gating, no granular opt-out exists anywhere in
`src/`. With GA4 + AdSense live, EU/eaa visitors get cookies without
consent — this is a real policy/GDPR exposure and a likely AdSense
reviewer note. Owner action required (CMP from the AdSense dashboard or
equivalent), or removal of GA4 until then.

## 6. Residual unprovable/soft claims on the homepage (post-#516)

- Contact form success toast "Message sent successfully! We'll get back
  to you soon." while the form sends nothing (§2) — deceptive UX; either
  wire the form or reword the toast.
- FAQ answer promises "You can reach the team through the contact form"
  (`en/common.json` faq.support) — form is non-functional (§2).

## 7. Summary of AdSense blockers found (repo-level)

1. /about, /contact, /cookies missing (404) — remedied by the follow-up PR.
2. /privacy ~70 words, /terms thin — full ≥900-word policy in the follow-up PR.
3. Footer/header do not link the policy pages — fixed in the follow-up PR.
4. Contact form non-functional (reported, not rewired).
5. No cookie-consent mechanism (owner decision required).
6. 878-article corpus quality work (fake products, auto-links) in progress
   via #501 et al. — directly relevant to "low value content" rejections.
