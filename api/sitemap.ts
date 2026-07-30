import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleRecord {
  id: string;
  slug: string;
  lang?: string;
  published_at?: string | null;
  updated_at?: string | null;
}

interface PageInfo {
  url: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
  lang?: string;
  id?: string;
}

const PILLARS: Record<string, { priority: string; changefreq: string }> = {
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "adblock-chrome-android-complete-guide-2026": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-screenshot-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-privacy-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-youtube-downloader-chrome-extension-2026": { priority: "0.9", changefreq: "weekly" },
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c] ?? c));
}

function buildXml(staticPages: PageInfo[], articles: PageInfo[], extPages: PageInfo[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  // Static Pages
  for (const p of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(WEBSITE_URL + p.url)}</loc>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    if (p.lastmod) {
      xml += `    <lastmod>${p.lastmod}</lastmod>\n`;
    }
    xml += `  </url>\n`;
  }

  // Group articles by id to handle multilingual translations
  const groups: Record<string, PageInfo[]> = {};
  for (const art of articles) {
    const id = art.id || art.url;
    if (!groups[id]) {
      groups[id] = [];
    }
    groups[id].push(art);
  }

  // Articles
  for (const id of Object.keys(groups)) {
    const group = groups[id];
    for (const art of group) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(WEBSITE_URL + art.url)}</loc>\n`;
      xml += `    <changefreq>${art.changefreq}</changefreq>\n`;
      xml += `    <priority>${art.priority}</priority>\n`;
      if (art.lastmod) {
        xml += `    <lastmod>${art.lastmod}</lastmod>\n`;
      }

      // If there are translations, add xhtml:link alternates
      if (group.length > 1) {
        for (const alt of group) {
          const altLang = (alt.lang || "en").toLowerCase();
          xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${escapeXml(WEBSITE_URL + alt.url)}" />\n`;
        }
        // Add x-default pointing to English translation (or first translation if no English)
        const englishAlt = group.find(alt => (alt.lang || "en").toLowerCase() === "en") || group[0];
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(WEBSITE_URL + englishAlt.url)}" />\n`;
      }

      xml += `  </url>\n`;
    }
  }

  // Extension Pages
  for (const p of extPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(WEBSITE_URL + p.url)}</loc>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://svzfurufpzsrqoxlwxgx.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2emZ1cnVmcHpzcnFveGx3eGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjEyNzQsImV4cCI6MjA4NDA5NzI3NH0.pGcICWref_LNLMkhMCjhjg3KCxi9xsIkTEr1piH80uQ";
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
    { url: "/ar", changefreq: "weekly", priority: "1.0" },
    { url: "/ar/blog", changefreq: "daily", priority: "0.8" },
  ];

  let rawArticles: ArticleRecord[] = [];
  try {
    const all: ArticleRecord[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from("articles").select("id,slug,lang,published_at,updated_at").ilike("status","published").order("published_at",{ascending:false}).range(from, from+999);
      if (error || !data) break;
      all.push(...(data as ArticleRecord[]));
      if (data.length < 1000) break;
      from += 1000;
    }
    rawArticles = all;
  } catch(e) { console.error(e); }

  // If Supabase failed or returned empty, fallback to public index
  if (rawArticles.length === 0) {
    const f = path.join(process.cwd(),"public","content","articles-index.json");
    if (fs.existsSync(f)) {
      rawArticles = JSON.parse(fs.readFileSync(f,"utf-8")) as ArticleRecord[];
    }
  }

  const articlePages: PageInfo[] = rawArticles.map(a => {
    const slug = normalizeSlug(a.slug);
    const p = PILLARS[slug];
    const d = a.updated_at || a.published_at;
    const lang = (a.lang || "en").toLowerCase();
    const prefix = lang === "en" ? "" : `/${lang}`;
    return {
      id: a.id || slug,
      url: `${prefix}/blog/${slug}`,
      changefreq: p?.changefreq ?? "monthly",
      priority: p?.priority ?? "0.7",
      lastmod: d ? new Date(d).toISOString().split("T")[0] : undefined,
      lang: lang
    };
  });

  const extPages: PageInfo[] = (extensions as Array<{slug:string}>).map(e=>({url:`/extension/${normalizeSlug(e.slug)}`,changefreq:"monthly",priority:"0.6"}));

  const xml = buildXml(staticPages, articlePages, extPages);
  res.setHeader("Content-Type","application/xml; charset=UTF-8");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(xml);
}
