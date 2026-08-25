# chrome-extension-booster

Production React + Vite + TypeScript marketing site for **ExtensionTo** —
a Chrome extensions review and recommendation hub with a multilingual
(EN / FR / ES / PT / AR) SEO content pipeline.

The site itself is the root project; the Python-based content-generation
pipeline that produces the published articles lives in
[`seo_agent_pro/`](./seo_agent_pro/) and is documented separately in
[`seo_agent_pro/README.md`](./seo_agent_pro/README.md).

---

## Stack

| Layer            | Tech                                                     |
|------------------|----------------------------------------------------------|
| Framework        | React 18 + Vite 5                                       |
| Language         | TypeScript (strict, with `@/*` alias to `./src`)        |
| Styling          | Tailwind CSS + shadcn/ui components (`@/components/ui`)  |
| Routing          | react-router-dom (BrowserRouter, lazy routes)           |
| State / data     | @tanstack/react-query + Supabase (auth + DB)             |
| i18n             | i18next + react-i18next (EN / FR / ES / PT / AR)        |
| SEO              | react-helmet-async + prerendered static HTML at build    |
| Markdown         | react-markdown + remark-gfm + rehype-raw                 |
| Backend          | Supabase (Postgres, Auth, Edge Functions)               |

---

## Quick start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy environment template and fill in your Supabase anon key
cp .env.example .env
#   then edit .env and replace the placeholders with your project's values

# 3. Start the dev server (http://localhost:8080)
npm run dev

# 4. Production build (also runs prebuild image optimizer + postbuild prerender)
npm run build
```

> **Note on the build:** `npm run build` runs three steps in sequence:
> 1. `prebuild` — `node scripts/optimize-images.mjs` (generates `.webp` / `.avif` variants of every PNG/JPG under `public/`)
> 2. `vite build` — bundles the React SPA into `dist/`
> 3. `postbuild` — `tsx scripts/generate-sitemap.ts && tsx scripts/prerender-articles.ts && tsx scripts/prerender-static-pages.ts`
>
> The prerender step is what makes Googlebot and social scrapers see real
> `<title>`, meta, canonical, and JSON-LD on first byte instead of the
> generic SPA fallback. If you only run `npx vite build` (skipping the
> npm script), the SEO smoke test will fail because the prerendered HTML
> files won't exist.

---

## Project layout

```
chrome-extension-booster/
├── src/                      ← React application (the live site)
│   ├── pages/                ← Route components (Index, Blog, BlogPost, Admin, ...)
│   ├── components/            ← Reusable UI + sections (Navbar, Footer, SEO, shadcn/ui)
│   ├── lib/                  ← extensionsData, internalLinking, seoAnalyzer, etc.
│   ├── hooks/                ← useLang, use-toast, use-mobile
│   ├── i18n/                 ← i18next config + locales/{en,fr,es}/common.json
│   ├── integrations/supabase ← Generated Supabase client + types
│   └── utils/                ← slug, articlePath helpers
├── scripts/                  ← Build-time scripts (sitemap, prerender, audits)
├── supabase/                 ← Migrations + edge functions
├── public/content/           ← Article markdown files + generated indexes
├── seo_agent_pro/            ← Python SEO content pipeline (see its own README)
├── .github/workflows/        ← CI: lint, typecheck, build, daily article pipeline
└── tests/                    ← Playwright + Node:test + Python unit tests
```

---

## Useful scripts

| Script                          | What it does                                                  |
|---------------------------------|---------------------------------------------------------------|
| `npm run dev`                   | Vite dev server on port 8080                                  |
| `npm run build`                 | Production build + prerender (see note above)                 |
| `npm run lint`                  | ESLint across the codebase                                    |
| `npm run typecheck`             | `tsc --noEmit` against `tsconfig.app.json`                    |
| `npm run test:seo`              | SEO smoke test (requires a prior `npm run build`)             |
| `npm run test:links`            | Internal link redirect smoke test                             |
| `npm run test:performance`      | Performance budget check                                      |
| `npm run test:e2e`              | Playwright browser smoke tests                               |
| `npm run sitemap`               | Regenerate sitemap only                                       |
| `npm run sync-articles`         | Rebuild `articles-index.json` from local markdown             |

---

## Environment variables

All variables are loaded by Vite from `.env` (which is gitignored — copy
`.env.example` to get started). Only variables prefixed with `VITE_` are
inlined into the client bundle; the bare `SUPABASE_*` variants are read
by Node-side scripts (sitemap, prerender, etc.).

| Variable                          | Used by          | Purpose                              |
|-----------------------------------|------------------|--------------------------------------|
| `VITE_SUPABASE_URL`               | Browser bundle   | Supabase project URL                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Browser bundle   | Supabase anon key (safe to expose)  |
| `VITE_SUPABASE_PROJECT_ID`        | Browser bundle   | Project reference for diagnostics    |
| `SUPABASE_URL`                    | Node scripts     | Same as VITE_ variant                |
| `SUPABASE_PUBLISHABLE_KEY`        | Node scripts     | Same as VITE_ variant                |

> **Security note:** never put a Supabase `service_role` key in any
> `VITE_*`-prefixed variable — that key bypasses Row Level Security and
> must only ever live in a Supabase Edge Function or server-side code.

---

## CI

`.github/workflows/seo-quality.yml` runs on every push and pull request
 to `main`. It runs `npm run lint`, `npm run typecheck`, the Python unit
 tests, `npm run build`, `npm run test:performance`, `npm run test:seo`,
 `npm run test:links`, and `npm run test:e2e` after installing the Playwright
 Chromium browser.

The other workflows in `.github/workflows/` drive the daily article
publishing pipeline (see `seo_agent_pro/` for details).
