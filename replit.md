# ExtensionTo

A Chrome extensions blog and directory — SEO-focused SPA with 499 articles, pillar content, and an admin panel for publishing.

## Run & Operate

- `pnpm --filter @workspace/extensionto run dev` — run the frontend (preview at `/`)
- `pnpm --filter @workspace/extensionto run sync` — rebuild articles-index.json + sitemap.xml from disk
- `pnpm --filter @workspace/extensionto run sync-articles` — rebuild index only
- `pnpm --filter @workspace/extensionto run generate-sitemap` — regenerate sitemap from index
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React + react-router-dom + Tailwind v3 + shadcn/ui
- Content: Markdown files in `public/content/articles/` (partitioned by slug)
- Auth: Supabase (admin login only — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- No backend; static SPA deployable on Vercel

## Where things live

- `artifacts/extensionto/src/` — React app source
- `artifacts/extensionto/public/content/articles/` — 499 markdown article files (partitioned: `c1/c2/c3/slug.md`)
- `artifacts/extensionto/public/content/articles-index.json` — article index (rebuilt from disk, NOT from Supabase)
- `artifacts/extensionto/public/sitemap.xml` — auto-generated from index
- `artifacts/extensionto/scripts/sync-articles.mjs` — rebuilds index from markdown
- `artifacts/extensionto/scripts/generate-sitemap.mjs` — generates sitemap from index
- `artifacts/extensionto/src/pages/AdminLogin.tsx` — Supabase auth login
- `artifacts/extensionto/src/pages/Admin.tsx` — admin panel (Supabase auth-gated)

## Architecture decisions

- **Content is markdown-first**: `articles-index.json` is the source of truth and is rebuilt from disk, not from Supabase. Supabase is only used for admin auth and article writes (via edge functions).
- **Partitioned paths**: Articles live at `c1/c2/c3/slug.md` where c1/c2/c3 are first 3 chars of the normalized slug. `normalizeSlug()` in `src/utils/articlePath.ts` is the canonical implementation.
- **Search-and-Rescue routing**: `BlogPost.tsx` does fuzzy slug matching against the index so legacy URLs still resolve.
- **Supabase-free reads**: Blog listing and article pages fetch only from JSON index + markdown files. No Supabase calls on the read path.
- **Sitemap is auto-generated**: Never edit `sitemap.xml` by hand. Always run `pnpm sync` after adding articles.

## Product

- 499 published articles about Chrome extensions across 14+ categories
- 9 extension pages with ratings, reviews, and store links
- Admin panel at `/settings` for publishing new articles (Supabase auth required)
- AI article generator via Supabase edge functions
- SEO-optimized with structured data, canonical URLs, and auto-generated sitemap

## User preferences

- Keep Supabase auth for admin login — do NOT remove it
- Article content system must be Supabase-free (markdown + JSON index only)
- Sitemap must be regenerated from disk, never from Supabase DB
- Vercel-compatible design (SPA with rewrites in vercel.json)

## Gotchas

- Always run `pnpm --filter @workspace/extensionto run sync` after adding/modifying markdown articles
- The index had 573 phantom entries (from old Supabase DB); it's now been rebuilt to 499 real disk entries
- Some article frontmatter slugs use YAML block scalar (`>-`) — the sync script handles this correctly
- `normalizeSlug()` must be used consistently everywhere (Admin write path, sync script, BlogPost fetch)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
