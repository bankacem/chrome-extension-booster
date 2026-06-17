import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * generate-schema.ts
 *
 * Isolated, safe SEO helper. Scans every published article markdown file and
 * injects a JSON-LD `schema` block into the frontmatter ONLY when one is
 * missing. It is deliberately conservative:
 *
 *   - Never touches the article body (everything after the frontmatter).
 *   - Never overwrites an existing `schema` block (idempotent / re-runnable).
 *   - Never invents placeholder text. If `title`, `description`/`meta_description`
 *     or `published_at` is missing, the file is skipped and reported.
 *   - Derives every schema field from data already present in the frontmatter.
 *
 * Usage:
 *   bun scripts/generate-schema.ts            # apply changes
 *   bun scripts/generate-schema.ts --dry-run  # report only, write nothing
 */

const WEBSITE_URL = 'https://extensionto.com';
const PUBLISHER_NAME = 'ExtensionTo';
const PUBLISHER_LOGO = `${WEBSITE_URL}/logo.png`;

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
const dryRun = process.argv.includes('--dry-run');

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (fullPath.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function toAbsoluteUrl(value: string): string {
  if (/^https?:\/\//.test(value)) return value;
  return `${WEBSITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

function buildSchema(metadata: Record<string, unknown>, slug: string) {
  const title = String(metadata.title);
  const description = String(metadata.description || metadata.meta_description);
  const published = String(metadata.published_at);
  const modified = String(metadata.updated_at || metadata.published_at);
  const author = String(metadata.author || 'Admin');
  const rawImage = String(metadata.featured_image || metadata.image_url || '');

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${WEBSITE_URL}/blog/${slug}`,
    headline: title,
    description,
  };

  if (rawImage) schema.image = toAbsoluteUrl(rawImage);

  schema.author = { '@type': 'Person', name: author };
  schema.publisher = {
    '@type': 'Organization',
    name: PUBLISHER_NAME,
    logo: { '@type': 'ImageObject', url: PUBLISHER_LOGO },
  };
  schema.datePublished = published;
  schema.dateModified = modified;

  return schema;
}

function run() {
  console.log(`Scanning articles in ${articlesDir}${dryRun ? ' (dry run)' : ''}...`);
  const files = walkDir(articlesDir);
  console.log(`Found ${files.length} markdown files.`);

  let updated = 0;
  let skippedExisting = 0;
  let skippedMissing = 0;

  for (const filePath of files) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const match = fileContent.match(/^---([\s\S]*?)---([\s\S]*)$/);
      if (!match) {
        console.warn(`[Schema] Skipping (no frontmatter): ${filePath}`);
        continue;
      }

      const frontmatter = match[1];
      const body = match[2];
      const metadata = yaml.load(frontmatter) as Record<string, unknown>;

      if (String(metadata.status || '').toLowerCase() !== 'published') {
        continue; // only published articles
      }

      if (metadata.schema) {
        skippedExisting++;
        continue; // never overwrite an existing schema
      }

      const title = metadata.title;
      const description = metadata.description || metadata.meta_description;
      const published = metadata.published_at;
      if (!title || !description || !published) {
        skippedMissing++;
        console.warn(
          `[Schema] Skipping (missing title/description/published_at): ${filePath}`
        );
        continue;
      }

      const slug = String(metadata.slug || metadata.id);
      const schema = buildSchema(metadata, slug);

      // Re-serialize only the schema block and append it to the existing
      // frontmatter text. The original frontmatter lines and the body are left
      // byte-for-byte intact apart from the appended block.
      const schemaYaml = yaml.dump({ schema }, { lineWidth: -1, quotingType: "'" });
      const newFrontmatter = `${frontmatter.replace(/\s*$/, '\n')}${schemaYaml}`;
      const newContent = `---${newFrontmatter}---${body}`;

      if (dryRun) {
        console.log(`[Schema] Would add schema to: ${filePath}`);
      } else {
        fs.writeFileSync(filePath, newContent);
        console.log(`[Schema] Added schema to: ${filePath}`);
      }
      updated++;
    } catch (e) {
      console.error(`[Schema] Error processing ${filePath}:`, e);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`${dryRun ? 'Would update' : 'Updated'}: ${updated}`);
  console.log(`Skipped (schema already present): ${skippedExisting}`);
  console.log(`Skipped (missing required fields): ${skippedMissing}`);
  if (dryRun) console.log('Dry run — no files were written.');
}

run();
