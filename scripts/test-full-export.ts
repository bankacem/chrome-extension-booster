import { createClient } from "@supabase/supabase-js";
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportFullArticles() {
  console.log("Fetching all published articles from Supabase...");
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published");

  if (error) {
    console.error("Error fetching articles:", error);
    process.exit(1);
  }

  console.log(`Successfully fetched ${articles.length} articles.`);
  // We won't write to files yet, just verifying we can get the data.
}

exportFullArticles();
