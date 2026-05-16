import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArticles() {
  console.log("Checking articles from April 11 to April 24, 2026...");
  const { data, error, count } = await supabase
    .from('articles')
    .select('id, title, published_at, status', { count: 'exact' })
    .gte('published_at', '2026-04-11T00:00:00Z')
    .lte('published_at', '2026-04-24T23:59:59Z')
    .ilike('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${count} published articles.`);
  data.forEach(a => {
    console.log(`- [${a.published_at}] ${a.title} (${a.status})`);
  });
}

checkArticles();
