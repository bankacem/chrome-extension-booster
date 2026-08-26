#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesRoot = path.join(repoRoot, "public", "content", "articles");
const defaultBaseUrl = "https://extensionto.com";
const DEFAULT_LOOKBACK_HOURS = 48;
const DEFAULT_TIMEOUT_MS = 20_000;

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const baseUrl = String(argValue("--base-url", process.env.EXTENSIONTO_BASE_URL || defaultBaseUrl)).replace(/\/$/, "");
const lookbackHours = Number(argValue("--lookback-hours", process.env.SMOKE_LOOKBACK_HOURS || DEFAULT_LOOKBACK_HOURS));
const now = new Date();
const lowerBound = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, result);
    else if (entry.isFile() && entry.name.endsWith(".md")) result.push(full);
  }
  return result;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed === "null" ? null : trimmed;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const scalar = line.match(/^([A-Za-z0-9_]+):\s*(.*?)\s*$/);
    if (scalar) metadata[scalar[1]] = parseScalar(scalar[2]);
  }
  return { metadata, body: text.slice(match[0].length) };
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function imagePathsFromHtml(html) {
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|content)=["']([^"']+)["']/gi)) {
    let value = match[1];
    if (value.startsWith(baseUrl)) value = value.slice(baseUrl.length);
    if (value.startsWith("/content/images/")) paths.add(value.split(/[?#]/)[0]);
  }
  return [...paths].sort();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkImage(imagePath) {
  const url = new URL(imagePath, baseUrl).href;
  try {
    const response = await fetchWithTimeout(url, { method: "GET" });
    const contentType = response.headers.get("content-type") || "";
    return { path: imagePath, status: response.status, ok: response.status === 200 && contentType.startsWith("image/"), contentType };
  } catch (error) {
    return { path: imagePath, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function articleIndexArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.articles)) return data.articles;
  return [];
}

function markdownTable(rows) {
  const lines = ["| Article | Scheduled at | Page | Index | Sitemap | Images |", "|---|---|---:|---:|---:|---:|"];
  for (const row of rows) {
    lines.push(`| ${row.title.replace(/\|/g, "\\|")} | ${row.scheduledAt || "—"} | ${row.pageOk ? "pass" : "FAIL"} | ${row.indexOk ? "pass" : "FAIL"} | ${row.sitemapOk ? "pass" : "FAIL"} | ${row.imageFailures === 0 ? `${row.imageCount} pass` : `${row.imageFailures} FAIL`} |`);
  }
  return lines.join("\n");
}

async function main() {
  const articles = [];
  for (const filePath of walkMarkdown(articlesRoot)) {
    const text = fs.readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(text);
    if (!parsed) continue;
    const { metadata } = parsed;
    const scheduledDate = parseDate(metadata.scheduled_at);
    if (!scheduledDate || scheduledDate < lowerBound || scheduledDate > now) continue;
    articles.push({
      filePath,
      title: String(metadata.title || path.basename(filePath)),
      slug: String(metadata.slug || ""),
      id: String(metadata.id || ""),
      status: String(metadata.status || "").toLowerCase(),
      scheduledDate,
    });
  }
  articles.sort((a, b) => a.scheduledDate - b.scheduledDate);

  const failures = [];
  const results = [];
  let indexEntries = [];
  let sitemapText = "";
  try {
    const [indexResponse, sitemapResponse] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/content/articles-index.json`),
      fetchWithTimeout(`${baseUrl}/sitemap.xml`),
    ]);
    if (!indexResponse.ok) failures.push(`articles-index.json returned HTTP ${indexResponse.status}`);
    else indexEntries = articleIndexArray(await indexResponse.json());
    if (!sitemapResponse.ok) failures.push(`sitemap.xml returned HTTP ${sitemapResponse.status}`);
    else sitemapText = await sitemapResponse.text();
  } catch (error) {
    failures.push(`Could not fetch public index/sitemap: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (articles.length === 0) {
    const message = `No scheduled articles became due in the last ${lookbackHours} hours.`;
    console.log(message);
    await writeSummary(`# Scheduled publish smoke test\n\n${message}\n\nChecked at ${now.toISOString()} against ${baseUrl}.`);
    return;
  }

  for (const article of articles) {
    const result = {
      title: article.title,
      slug: article.slug,
      scheduledAt: article.scheduledDate.toISOString(),
      pageOk: false,
      indexOk: false,
      sitemapOk: false,
      imageCount: 0,
      imageFailures: 0,
      notes: [],
    };
    if (article.status !== "published") {
      result.notes.push(`frontmatter status is ${article.status || "empty"}, expected published`);
      failures.push(`${article.slug}: not published (status=${article.status || "empty"})`);
    }
    if (!article.slug) {
      failures.push(`${article.title}: missing slug`);
      results.push(result);
      continue;
    }

    const expectedPath = `/blog/${article.slug}`;
    result.indexOk = indexEntries.some((entry) => entry && entry.slug === article.slug && entry.canonicalPath === expectedPath);
    result.sitemapOk = sitemapText.includes(`${baseUrl}${expectedPath}`);
    if (!result.indexOk) failures.push(`${article.slug}: missing from articles-index.json or canonicalPath mismatch`);
    if (!result.sitemapOk) failures.push(`${article.slug}: missing from sitemap.xml`);

    try {
      const response = await fetchWithTimeout(`${baseUrl}${expectedPath}`);
      const html = await response.text();
      const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
      const hasExpectedTitle = html.includes(article.title);
      result.pageOk = response.status === 200 && canonical === `${baseUrl}${expectedPath}` && hasExpectedTitle;
      if (!result.pageOk) {
        failures.push(`${article.slug}: page check failed (HTTP ${response.status}, canonical=${canonical || "missing"}, title=${hasExpectedTitle ? "found" : "missing"})`);
      }
      const imagePaths = imagePathsFromHtml(html);
      result.imageCount = imagePaths.length;
      const imageResults = await Promise.all(imagePaths.map(checkImage));
      result.imageFailures = imageResults.filter((image) => !image.ok).length;
      for (const image of imageResults.filter((image) => !image.ok)) {
        failures.push(`${article.slug}: image ${image.path} failed with HTTP ${image.status}${image.contentType ? ` (${image.contentType})` : ""}`);
      }
      if (result.imageCount === 0) {
        result.notes.push("no article image URLs found in HTML");
        failures.push(`${article.slug}: no /content/images/ URLs found in live HTML`);
      }
    } catch (error) {
      failures.push(`${article.slug}: page request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    results.push(result);
  }

  const summary = [
    "# Scheduled publish smoke test",
    "",
    `Checked at ${now.toISOString()} against ${baseUrl}.`,
    `Lookback window: ${lookbackHours} hours. Due articles found: ${articles.length}.`,
    "",
    markdownTable(results),
    "",
    failures.length ? `## Failures\n\n${failures.map((failure) => `- ${failure}`).join("\n")}` : "## Result\n\nAll due scheduled articles passed the publication smoke test.",
  ].join("\n");
  console.log(summary);
  await writeSummary(summary);
  if (failures.length) process.exitCode = 1;
}

async function writeSummary(summary) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) fs.appendFileSync(summaryPath, `${summary}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
