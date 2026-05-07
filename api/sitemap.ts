/**
 * api/sitemap.ts — Vercel Serverless Function
 * -----------------------------------------------
 * Serves /sitemap.xml with the correct Content-Type so browsers
 * apply the XSL stylesheet and don't show a white/blank screen.
 *
 * WHY THE WHITE SCREEN HAPPENED:
 *   Vercel's static file serving for /public/sitemap.xml was sending
 *   Content-Type: text/plain or application/octet-stream instead of
 *   text/xml. Browsers only apply <?xml-stylesheet?> when the MIME
 *   type is text/xml or application/xml. The vercel.json headers block
 *   for /sitemap.xml only applies to the STATIC file — but the rewrite
 *   to /api/sitemap bypassed those headers. This function sets them
 *   directly so the correct Content-Type is always delivered.
 *
 * HOW IT AUTO-UPDATES ON EVERY GIT PUSH:
 *   Priority 1 → Supabase (live DB, always fresh)
 *   Priority 2 → /public/content/articles-index.json (static fallback)
 *   The sitemap is regenerated on every request (Vercel CDN TTL: 5 min).
 */

import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import fs from "fs";
import path from "path";

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL = "https://extensionto.com";

const PILLARS: Record<string, { priority: string; changefreq: string }> = {
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide":   { priority: "0.9", changefreq: "weekly" },
  "adblock-chrome-android-complete-guide-2026":                { priority: "0.9", changefreq: "weekly" },
  "best-chrome-screenshot-extensions-2026-complete-guide":     { priority: "0.9", changefreq: "weekly" },
  "best-chrome-privacy-extensions-2026-complete-guide":        { priority: "0.9", changefreq: "weekly" },
  "best-youtube-downloader-chrome-extension-2026":             { priority: "0.9", changefreq: "weekly" },
};

interface ArticleRecord { slug: string; published_at?: string | null; updated_at?: string | null; }
interface PageInfo      { url: string; changefreq: string; priority: string; lastmod?: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c)
  );
}

function normaliseSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function toDateString(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try { return new Date(iso).toISOString().split("T")[0]; } catch { return undefined; }
}

function buildXml(pages: PageInfo[]): string {
  const urls = pages.map((p) => {
    const lastmodTag = p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : "";
    return (
      `  <url>\n` +
      `    <loc>${escapeXml(BASE_URL + p.url)}</loc>${lastmodTag}\n` +
      `    <changefreq>${p.changefreq}</changefreq>\n` +
      `    <priority>${p.priority}</priority>\n` +
      `  </url>`
    );
  }).join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n` +
    `          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n` +
    urls + "\n" +
    `</urlset>`
  );
}

// ─── Data fetching ──────────────────────────────────────────────────────────
async function fetchFromSupabase(): Promise<ArticleRecord[]> {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const all: ArticleRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select("slug,published_at,updated_at")
      .ilike("status", "published")
      .order("published_at", { ascending: false })
      .range(from, from + 999);

    if (error || !data || data.length === 0) break;
    all.push(...(data as ArticleRecord[]));
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function fetchFromJson(): ArticleRecord[] {
  const p = path.join(process.cwd(), "public", "content", "articles-index.json");
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as ArticleRecord[]; } catch { return []; }
}

function articlesToPages(articles: ArticleRecord[]): PageInfo[] {
  return articles.map((a) => {
    const slug = normaliseSlug(a.slug);
    const pillar = PILLARS[slug];
    return {
      url: `/blog/${slug}`,
      changefreq: pillar?.changefreq ?? "monthly",
      priority: pillar?.priority ?? "0.7",
      lastmod: toDateString(a.updated_at ?? a.published_at),
    };
  });
}

// ─── Static + Extension pages ────────────────────────────────────────────────
const STATIC_PAGES: PageInfo[] = [
  { url: "/",        changefreq: "weekly", priority: "1.0" },
  { url: "/blog",    changefreq: "daily",  priority: "0.8" },
  { url: "/privacy", changefreq: "yearly", priority: "0.3" },
  { url: "/terms",   changefreq: "yearly", priority: "0.3" },
];

const EXTENSION_PAGES: PageInfo[] = (extensions as Array<{ slug: string }>).map((e) => ({
  url: `/extension/${normaliseSlug(e.slug)}`,
  changefreq: "monthly",
  priority: "0.6",
}));

// ─── Vercel handler ──────────────────────────────────────────────────────────
export default async function handler(req: any, res: any): Promise<void> {
  try {
    let articles = await fetchFromSupabase();
    if (articles.length === 0) articles = fetchFromJson();

    const xml = buildXml([...STATIC_PAGES, ...articlesToPages(articles), ...EXTENSION_PAGES]);

    // THE FIX: "text/xml" enables <?xml-stylesheet?> in ALL browsers.
    // "application/xml" breaks Firefox. text/xml is the safe cross-browser choice.
    res.setHeader("Content-Type", "text/xml; charset=UTF-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    res.status(200).send(xml);
  } catch (err) {
    console.error("[sitemap] error:", err);
    res.status(500).send("Internal Server Error");
  }
}