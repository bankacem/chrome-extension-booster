# Guide to Adding Articles (ExtensionTo)

This guide explains how to add articles to the project correctly so they appear in the Sitemap and search engines without issues.

## 1. Project Architecture
The project uses a **Hybrid Content System**:
1. **Supabase**: Primary source for editing and managing articles.
2. **Markdown Files**: Local copies in `public/content/articles/` for fast performance and SEO.
3. **Indexing**: A central `articles-index.json` file used by the frontend.
4. **Sitemap**: Automatically generated from the index.

---

## 2. How to Add a New Article

### Option A: Via Supabase (Recommended)
1. Go to your Supabase project dashboard.
2. Add a new row to the `articles` table.
3. **Crucial Fields**:
   - `status`: Set to `published` (lowercase).
   - `slug`: Use a clean, lowercase-kebab-case string (e.g., `best-chrome-extensions-2026`).
   - `title`, `content`, `excerpt`: Fill these in.
   - `meta_description`, `tags`, `keywords`: Important for SEO.
4. Run the sync command locally:
   ```bash
   bun run publish
   ```
   This command will:
   - Fetch the article from Supabase.
   - Create the Markdown file.
   - Rebuild the index and Sitemap.
   - Push changes to GitHub.

### Option B: Via Local Markdown (Advanced)
1. Create a new file in `public/content/articles/`.
2. Follow the partitioned structure (e.g., `public/content/articles/b/e/s/best-slug.md`).
3. Ensure the Frontmatter (the section between `---`) is correct:
   ```yaml
   ---
   id: unique-uuid-or-slug
   title: Your Article Title
   slug: best-slug
   status: published
   published_at: '2026-06-11'
   ---
   ```
4. Run `bun run sync-articles` to update the index.

---

## 3. Ensuring it appears in the Sitemap
The Sitemap is generated from `public/content/articles-index.json`.
If your article is in that JSON file, it **will** be in the Sitemap.

To check manually:
1. Check if the file exists: `public/content/articles/x/y/z/your-slug.md`.
2. Check if it's in the index: Open `public/content/articles-index.json` and search for your slug.
3. Run the generator: `bun run sitemap`.
4. Verify: Open `public/sitemap.xml`.

---

## 4. Avoiding Common Problems
- **Duplicate Slugs**: Each article must have a unique slug.
- **Duplicate IDs**: Each article must have a unique ID. If you copy-paste a Markdown file, remember to change the `id` in the frontmatter.
- **H1 Headers**: Do not use `<h1>` in the Markdown body. The system adds it automatically from the title.
- **Status**: Only articles with `status: published` will appear on the site and in the sitemap.
- **Slug Suffixes**: Avoid random strings at the end of slugs (e.g., `-mo4p804c88h`) unless necessary for deduplication.

---

## 5. Summary of Commands
| Command | Description |
| :--- | :--- |
| `bun run publish` | Full sync + Build Index + Build Sitemap + Push to Git |
| `bun run sync-db-to-md` | Fetch new articles from Supabase |
| `bun run sync-articles` | Rebuild the JSON index from local files |
| `bun run sitemap` | Rebuild `sitemap.xml` |
| `bun run index-sitemap` | Submit new URLs to Google Indexing API |
