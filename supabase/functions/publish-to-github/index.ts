// Publishes a Markdown file to the project's GitHub repo so the static
// /blog renderer picks it up on the next Vercel deploy.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";

interface IndexEntry {
  slug?: string;
  [key: string]: unknown;
}

interface Payload {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  meta_description?: string;
  category?: string;
  keywords?: string[];
  featured_image?: string | null;
  author?: string;
  published_at?: string | null;
  read_time?: number;
}

function partitionedPath(slug: string): string {
  const s = slug.toLowerCase();
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  return `public/content/articles/${c1}/${c2}/${c3}/${s}.md`;
}

function frontMatter(p: Payload): string {
  const fm = {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    meta_description: p.meta_description || p.excerpt || "",
    category: p.category || "General",
    keywords: p.keywords || [],
    featured_image: p.featured_image || "",
    author: p.author || "Admin",
    published_at: p.published_at || new Date().toISOString(),
    read_time: p.read_time || 5,
  };
  const lines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`;
    return `${k}: ${JSON.stringify(v)}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n`;
}

async function ghPut(repo: string, token: string, path: string, contentB64: string, message: string, sha?: string) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const body: Record<string, unknown> = { message, content: contentB64 };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return r;
}

async function ghGetSha(repo: string, token: string, path: string): Promise<string | undefined> {
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) return undefined;
  const j = await r.json();
  return j.sha as string | undefined;
}

function b64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    const repo = Deno.env.get("GITHUB_REPO"); // "owner/repo"
    if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPO must be configured");

    const p = (await req.json()) as Payload;
    if (!p.slug || !p.title || !p.content) throw new Error("slug, title and content required");
    if (p.slug.length > 120 || p.slug.includes("/") || p.slug.includes("\\") || p.slug.includes("..")) {
      throw new Error("Invalid slug");
    }

    const filePath = partitionedPath(p.slug);
    const md = frontMatter(p) + p.content + "\n";
    const sha = await ghGetSha(repo, token, filePath);

    let res = await ghPut(repo, token, filePath, b64(md), `chore(blog): publish ${p.slug}`, sha);
    if (!res.ok) {
      const t = await res.text();
      console.error("github put failed", res.status, t);
      throw new Error(`GitHub API ${res.status}: ${t.slice(0, 300)}`);
    }

    // Update articles-index.json
    const idxPath = "public/content/articles-index.json";
    const idxRes = await fetch(`https://api.github.com/repos/${repo}/contents/${idxPath}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    let arr: IndexEntry[] = [];
    let idxSha: string | undefined;
    if (idxRes.ok) {
      const j = await idxRes.json() as { sha?: string; content?: string };
      idxSha = j.sha;
      try {
        arr = JSON.parse(decodeURIComponent(escape(atob(j.content?.replace(/\n/g, "") ?? "")))) as IndexEntry[];
      } catch { arr = []; }
    }
    const entry = {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      category: p.category || "General",
      featured_image: p.featured_image || "",
      published_at: p.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read_time: p.read_time || 5,
      author: p.author || "Admin",
    };
    const i = arr.findIndex((a) => a.slug === p.slug);
    if (i >= 0) arr[i] = entry; else arr.unshift(entry);

    res = await ghPut(repo, token, idxPath, b64(JSON.stringify(arr, null, 2)), `chore(blog): index ${p.slug}`, idxSha);
    if (!res.ok) {
      const t = await res.text();
      console.warn("index update failed", res.status, t);
    }

    return new Response(JSON.stringify({ ok: true, path: filePath }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-to-github error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
