import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const ROOT = process.cwd();
const REPORT_FILE = path.join(ROOT, "missing-meta-report.txt");
const APPLY = process.argv.includes("--apply");

interface Frontmatter {
  title?: string;
  slug?: string;
  description?: string;
  meta_description?: string;
  [key: string]: unknown;
}

// 1. قراءة تقرير الملفات المعطوبة لمعالجتها هي فقط
if (!fs.existsSync(REPORT_FILE)) {
  console.error("❌ لم يتم العثور على ملف missing-meta-report.txt! رجاءً قم بتشغيل bun seo-fixer.ts أولاً.");
  process.exit(1);
}

const reportContent = fs.readFileSync(REPORT_FILE, "utf-8");
const lines = reportContent.split("\n").slice(4); // تخطي الأسطر التعريفية الأربعة الأولى
const targetFiles: string[] = [];

for (const line of lines) {
  const parts = line.split("\t");
  if (parts[0] && parts[0].endsWith(".md")) {
    // استبعاد الملف الرقمي التالف إذا كان موجوداً
    if (parts[0].includes("1111111111111111111111111111111.md")) continue;
    targetFiles.push(path.join(ROOT, parts[0]));
  }
}

console.log(`=== SEO Content Enricher (Smart & Cautious) ===`);
console.log(APPLY ? "MODE: --apply (Writing high-quality metadata to disk)" : "MODE: Dry-Run (Previewing generated metadata)");
console.log(`Found ${targetFiles.length} valid target articles to fix.\n`);

let processedCount = 0;

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;

  const relPath = path.relative(ROOT, filePath);
  const rawContent = fs.readFileSync(filePath, "utf-8");
  
  // تقسيم الـ Frontmatter عن جسم المقال
  const match = rawContent.match(/^(---\n[\s\S]*?\n---)([\s\S]*)$/);
  if (!match) continue;

  let fmText = match[1];
  const bodyText = match[2];

  // أتمتة استخراج العنوان الذكي (من الـ H1 الداخلي للمقال)
  let extractedTitle = "";
  const h1Match = bodyText.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    extractedTitle = h1Match[1].trim();
  } else {
    // إذا لم نجد H1، ننظف الـ Slug
    const slug = path.basename(filePath, ".md");
    extractedTitle = slug
      .replace(/^(article-|vpn-article\d+-|deepseek-markdown-)/g, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  // أتمتة استخراج الميتا ديسكربشن (من أول فقرة نصية غنية في المقال)
  let extractedMeta = "";
  const paragraphs = bodyText.split("\n")
    .map(p => p.replace(/[#*`_\[\]()]/g, "").trim()) // تنظيف علامات الماركداون
    .filter(p => p.length > 60); // تخطي الأسطر القصيرة أو العناوين

  if (paragraphs.length > 0) {
    const firstParagraph = paragraphs[0];
    if (firstParagraph.length > 150) {
      extractedMeta = firstParagraph.slice(0, 145).trim() + "...";
    } else {
      extractedMeta = firstParagraph;
    }
  } else {
    extractedMeta = `Read our complete guide and professional overview about ${extractedTitle}. Learn layout, setup tips, and key optimization modules for 2026.`;
  }

  // طباعة المعاينة على الشاشة
  console.log(`- File: ${relPath}`);
  console.log(`  ✨ [Generated Title]: ${extractedTitle}`);
  console.log(`  📝 [Generated Meta]:  ${extractedMeta}`);
  console.log(`---`);

  if (APPLY) {
    // تفكيك الـ Frontmatter الحالي لحقن القيم الجديدة دون خسارة المتغيرات الأخرى
    const innerFm = fmText.replace(/^---\n/, "").replace(/\n---$/, "");
    let fmObj: Frontmatter = {};
    try {
      fmObj = (yaml.load(innerFm) || {}) as Frontmatter;
    } catch {
      fmObj = {};
    }

    // حقن البيانات الجديدة
    fmObj.title = extractedTitle;
    fmObj.meta_description = extractedMeta;
    fmObj.description = extractedMeta; // تحديث الحقلين لضمان التوافق

    const newFmText = `---\n${yaml.dump(fmObj)}---`;
    fs.writeFileSync(filePath, newFmText + bodyText, "utf-8");
    processedCount++;
  }
}

console.log(`\n=== Summary ===`);
if (APPLY) {
  console.log(`Successfully updated ${processedCount} files with smart custom metadata.`);
  console.log("Run `bun run sync-articles` to complete the deployment loop!");
} else {
  console.log("DRY-RUN completed. No files modified. Review the preview values above.");
  console.log("Run with `bun seo-enricher.ts --apply` to commit these smart patches.");
}