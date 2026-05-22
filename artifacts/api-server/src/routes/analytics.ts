import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const EXTENSIONTO_ROOT = path.resolve(process.cwd(), "../extensionto");
const LINK_TRACKING_FILE = path.join(EXTENSIONTO_ROOT, "public/content/link-tracking.json");

interface LinkClick {
  slug: string;
  url: string;
  type: "internal" | "external";
  text: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
}

interface TrackingData {
  clicks: LinkClick[];
  summary: Record<string, {
    url: string;
    type: "internal" | "external";
    clicks: number;
    lastClicked: string;
    articles: string[];
  }>;
  lastUpdated: string;
}

function readTracking(): TrackingData {
  try {
    return JSON.parse(fs.readFileSync(LINK_TRACKING_FILE, "utf8")) as TrackingData;
  } catch {
    return { clicks: [], summary: {}, lastUpdated: new Date().toISOString() };
  }
}

function writeTracking(data: TrackingData) {
  fs.writeFileSync(LINK_TRACKING_FILE, JSON.stringify(data, null, 2), "utf8");
}

// POST /analytics/link — record a link click
router.post("/analytics/link", (req: Request, res: Response) => {
  try {
    const { slug, url, type, text } = req.body as { slug: string; url: string; type: string; text: string };
    if (!slug || !url) { res.status(400).json({ error: "slug and url required" }); return; }

    const data = readTracking();
    const entry: LinkClick = {
      slug,
      url,
      type: type === "external" ? "external" : "internal",
      text: (text || "").slice(0, 120),
      timestamp: new Date().toISOString(),
      userAgent: (req.headers["user-agent"] || "").slice(0, 200),
      referrer: (req.headers["referer"] || "").slice(0, 200),
    };

    data.clicks.unshift(entry);
    if (data.clicks.length > 10000) data.clicks = data.clicks.slice(0, 10000);

    const key = url;
    if (!data.summary[key]) {
      data.summary[key] = { url, type: entry.type, clicks: 0, lastClicked: entry.timestamp, articles: [] };
    }
    data.summary[key].clicks++;
    data.summary[key].lastClicked = entry.timestamp;
    if (!data.summary[key].articles.includes(slug)) {
      data.summary[key].articles.push(slug);
    }
    data.lastUpdated = entry.timestamp;

    writeTracking(data);
    res.json({ ok: true });
  } catch (err) {
    console.error("[analytics] link track error:", err);
    res.status(500).json({ error: "tracking failed" });
  }
});

// GET /analytics/links — get link analytics
router.get("/analytics/links", (req: Request, res: Response) => {
  const data = readTracking();
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "50"))));
  const type = String(req.query["type"] ?? "");
  const slug = String(req.query["slug"] ?? "");

  let summary = Object.values(data.summary);
  if (type && type !== "all") summary = summary.filter(s => s.type === type);

  let recentClicks = data.clicks;
  if (slug) recentClicks = recentClicks.filter(c => c.slug === slug);

  summary.sort((a, b) => b.clicks - a.clicks);

  res.json({
    total_clicks: data.clicks.length,
    unique_links: summary.length,
    internal_clicks: data.clicks.filter(c => c.type === "internal").length,
    external_clicks: data.clicks.filter(c => c.type === "external").length,
    top_links: summary.slice((page - 1) * limit, page * limit),
    recent_clicks: recentClicks.slice(0, 20),
    lastUpdated: data.lastUpdated,
  });
});

// GET /analytics/links/article/:slug — links for a specific article
router.get("/analytics/links/article/:slug", (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  const data = readTracking();
  const clicks = data.clicks.filter(c => c.slug === slug);
  const urlMap: Record<string, { url: string; type: string; clicks: number; text: string }> = {};
  for (const c of clicks) {
    if (!urlMap[c.url]) urlMap[c.url] = { url: c.url, type: c.type, clicks: 0, text: c.text };
    urlMap[c.url].clicks++;
  }
  res.json({
    slug,
    total_clicks: clicks.length,
    links: Object.values(urlMap).sort((a, b) => b.clicks - a.clicks),
  });
});

export default router;
