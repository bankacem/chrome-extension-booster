import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface OptimizedArticle {
  originalTitle: string;
  originalSlug: string;
  optimizedTitle: string;
  metaDescription: string;
  newSlug: string;
}

const ARTICLES_PER_PAGE = 12; // Small number for testing listing, can be larger later

async function syncToGit() {
  const optimizedData: OptimizedArticle[] = JSON.parse(
    fs.readFileSync("optimized_articles.json", "utf-8")
  );

  console.log(`Syncing ${optimizedData.length} articles to Git...`);

  // 1. Fetch full content from Supabase
  const { data: dbArticles, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published");

  if (error) {
    console.error("Error fetching articles from DB:", error);
    process.exit(1);
  }

  const articlesToPublish = [];

  for (const item of optimizedData) {
    const dbArticle = dbArticles.find((a) => a.slug === item.originalSlug);
    if (!dbArticle) {
      console.warn(`Article not found in DB for slug: ${item.originalSlug}`);
      continue;
    }

    // Merge DB data with optimized SEO metadata
    const fullArticle = {
      ...dbArticle,
      title: item.optimizedTitle,
      slug: item.newSlug,
      meta_description: item.metaDescription,
    };

    articlesToPublish.push(fullArticle);

    // 2. Determine partitioned path
    // Example slug: 'how-to-fix-chrome' -> 'h/o/w/'
    const s = fullArticle.slug;
    const c1 = s[0] || "_";
    const c2 = s[1] || "_";
    const c3 = s[2] || "_";

    const dirPath = path.join(process.cwd(), "public", "content", "articles", c1, c2, c3);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `${s}.md`);
    const jsonPath = path.join(dirPath, `${s}.json`);

    const metadata = {
      id: fullArticle.id,
      title: fullArticle.title,
      slug: fullArticle.slug,
      excerpt: fullArticle.excerpt,
      featured_image: fullArticle.featured_image,
      category: fullArticle.category,
      tags: fullArticle.tags,
      keywords: fullArticle.keywords,
      meta_description: fullArticle.meta_description,
      published_at: fullArticle.published_at,
      read_time: fullArticle.read_time,
      author: fullArticle.author,
      views: fullArticle.views || 0,
    };

    // 3. Save Markdown (for Git/Storage)
    const mdContent = matter.stringify(fullArticle.content || "", metadata);
    fs.writeFileSync(filePath, mdContent);

    // 4. Save JSON (for Frontend optimized loading)
    const jsonContent = JSON.stringify({
        ...metadata,
        content: fullArticle.content
    }, null, 2);
    fs.writeFileSync(jsonPath, jsonContent);
  }

  // 4. Generate Static API Index (Paginated)
  // Sort by date descending
  articlesToPublish.sort((a, b) =>
    new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
  );

  const apiDir = path.join(process.cwd(), "public", "api", "blog", "pages");
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  const totalPages = Math.ceil(articlesToPublish.length / ARTICLES_PER_PAGE);

  for (let i = 0; i < totalPages; i++) {
    const start = i * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const pageArticles = articlesToPublish.slice(start, end).map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featured_image: a.featured_image,
        category: a.category,
        tags: a.tags,
        published_at: a.published_at,
        read_time: a.read_time,
        author: a.author,
        views: a.views || 0
    }));

    const pageData = {
        articles: pageArticles,
        currentPage: i + 1,
        totalPages,
        totalArticles: articlesToPublish.length
    };

    fs.writeFileSync(path.join(apiDir, `${i + 1}.json`), JSON.stringify(pageData, null, 2));
  }

  // Also save a master list for search/sitemap if needed (optional)
  fs.writeFileSync(
    path.join(process.cwd(), "public", "api", "blog", "all.json"),
    JSON.stringify(articlesToPublish.map(a => ({ title: a.title, slug: a.slug, published_at: a.published_at })), null, 2)
  );

  console.log(`Sync completed. ${articlesToPublish.length} articles written to content/ and static API generated.`);
}

syncToGit();
