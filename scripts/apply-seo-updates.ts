import { createClient } from "@supabase/supabase-js";
import fs from 'fs';

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

const optimizedData: OptimizedArticle[] = JSON.parse(fs.readFileSync('optimized_articles.json', 'utf-8'));

async function applyUpdates() {
  console.log(`Starting updates for ${optimizedData.length} articles...`);

  let totalUpdated = 0;

  for (const item of optimizedData) {
    const { data, error, count } = await supabase
      .from("articles")
      .update({
        title: item.optimizedTitle,
        meta_description: item.metaDescription,
        slug: item.newSlug
      }, { count: 'exact' })
      .eq("slug", item.originalSlug)
      .select();

    if (error) {
      console.error(`Error updating article with slug ${item.originalSlug}:`, error);
    } else if (data && data.length > 0) {
      console.log(`Updated: ${item.originalTitle}`);
      totalUpdated++;
    } else {
      console.log(`No rows affected for: ${item.originalSlug}`);
    }
  }

  console.log(`Updates completed. Total articles updated: ${totalUpdated}/${optimizedData.length}`);
}

applyUpdates();
