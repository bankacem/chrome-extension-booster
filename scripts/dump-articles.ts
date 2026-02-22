import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpArticles() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("title, slug")
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error);
    process.exit(1);
  }

  console.log(JSON.stringify(articles, null, 2));
}

dumpArticles();
