import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleRecord { id: string; slug: string; lang?: string; published_at?: string | null; updated_at?: string | null; }
interface PageInfo { url: string; changefreq: string; priority: string; lastmod?: string; alternates?: string; }

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

function buildXml(pages: PageInfo[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map(p=>`  <url>\n    <loc>${escapeXml(WEBSITE_URL+p.url)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${p.lastmod?`\n    <lastmod>${p.lastmod}</lastmod>`:""}${p.alternates?`\n${p.alternates}`:""}\n  </url>`).join("\n")}\n</urlset>`;
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
  ];

  let articlePages: PageInfo[] = [];
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
    if (all.length > 0) {
      // Group by ID
      const artsById = new Map<string, Array<{ slug: string; lang: string }>>();
      all.forEach(a => {
        const id = a.id;
        const lang = a.lang || 'en';
        const slug = normalizeSlug(a.slug);
        if (!id || !slug) return;
        if (!artsById.has(id)) artsById.set(id, []);
        artsById.get(id)!.push({ slug, lang });
      });

      articlePages = all.map(a => {
        const slug = normalizeSlug(a.slug);
        const lang = a.lang || 'en';
        const id = a.id;
        const p = PILLARS[slug];
        const d = a.updated_at || a.published_at;
        const url = lang === 'en' ? `/blog/${slug}` : `/${lang}/blog/${slug}`;

        const translations = artsById.get(id) || [];
        const alternatesXml = translations.map(t => {
          const href = `${WEBSITE_URL}${t.lang === 'en' ? '' : `/${t.lang}`}/blog/${t.slug}`;
          return `    <xhtml:link rel="alternate" hrefLang="${t.lang}" href="${href}"/>`;
        }).join("\n");
        const enTrans = translations.find(t => t.lang === 'en');
        const xDefaultXml = enTrans ? `\n    <xhtml:link rel="alternate" hrefLang="x-default" href="${WEBSITE_URL}/blog/${enTrans.slug}"/>` : "";

        return {
          url: url,
          changefreq: p?.changefreq ?? "monthly",
          priority: p?.priority ?? "0.7",
          lastmod: d ? new Date(d).toISOString().split("T")[0] : undefined,
          alternates: `${alternatesXml}${xDefaultXml}`
        };
      });
    }
  } catch(e) { console.error(e); }

  if (articlePages.length === 0) {
    const f = path.join(process.cwd(),"public","content","articles-index.json");
    if (fs.existsSync(f)) {
      const arts = JSON.parse(fs.readFileSync(f,"utf-8")) as ArticleRecord[];

      const artsById = new Map<string, Array<{ slug: string; lang: string }>>();
      arts.forEach(a => {
        const id = a.id;
        const lang = a.lang || 'en';
        const slug = normalizeSlug(a.slug);
        if (!id || !slug) return;
        if (!artsById.has(id)) artsById.set(id, []);
        artsById.get(id)!.push({ slug, lang });
      });

      articlePages = arts.map(a => {
        const slug=normalizeSlug(a.slug);
        const lang = a.lang || 'en';
        const id = a.id;
        const p=PILLARS[slug];
        const d=a.updated_at||a.published_at;
        const url = lang === 'en' ? `/blog/${slug}` : `/${lang}/blog/${slug}`;

        const translations = artsById.get(id) || [];
        const alternatesXml = translations.map(t => {
          const href = `${WEBSITE_URL}${t.lang === 'en' ? '' : `/${t.lang}`}/blog/${t.slug}`;
          return `    <xhtml:link rel="alternate" hrefLang="${t.lang}" href="${href}"/>`;
        }).join("\n");
        const enTrans = translations.find(t => t.lang === 'en');
        const xDefaultXml = enTrans ? `\n    <xhtml:link rel="alternate" hrefLang="x-default" href="${WEBSITE_URL}/blog/${enTrans.slug}"/>` : "";

        return {
          url:url,
          changefreq:p?.changefreq??"monthly",
          priority:p?.priority??"0.7",
          lastmod:d?new Date(d).toISOString().split("T")[0]:undefined,
          alternates: `${alternatesXml}${xDefaultXml}`
        };
      });
    }
  }

  const extPages: PageInfo[] = (extensions as Array<{slug:string}>).map(e=>({url:`/extension/${normalizeSlug(e.slug)}`,changefreq:"monthly",priority:"0.6"}));
  const xml = buildXml([...staticPages,...articlePages,...extPages]);
  res.setHeader("Content-Type","application/xml; charset=UTF-8");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(xml);
}
