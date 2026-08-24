# Article Content Directory

## ⚠️ DO NOT EDIT MANUALLY

This directory contains articles in Markdown format that are **automatically managed**. Any manual changes made to files in this directory will be **overwritten** by the synchronization pipeline.

### Source of Truth
The primary source for all article content is the **Supabase Database**.

### Synchronization Process
- **Automatic Sync:** A GitHub Action runs every hour to fetch the latest published articles from Supabase and update this directory.
- **Trigger:** The workflow is defined in `.github/workflows/publish-pipeline.yml`.
- **Manual Trigger:** You can manually trigger a sync by running the "Publish Articles Pipeline" from the GitHub Actions tab.

### How to Update Articles
To change the content of an article:
1. Log in to the Supabase dashboard.
2. Update the record in the `articles` table.
3. Wait for the next hourly sync or trigger it manually via GitHub Actions.

### Architecture Note
Articles are stored as static files here to optimize for:
- **SEO:** Better indexing by search engine crawlers.
- **Performance:** Extremely fast page loads via Vercel's edge network without direct database hits.
