import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');

const RAM_PILLAR = '/blog/ultimate-chrome-ram-memory-management-guide';
const ADBLOCK_PILLAR = '/blog/adblocker-for-android-chrome';

const RAM_KEYWORDS = ['ram', 'memory', 'tabs', 'suspender', 'speed up chrome'];
const ADBLOCK_KEYWORDS = ['adblock', 'ad block', 'android chrome adblock', 'ad blocker android'];

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (fullPath.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function fixCorruptedText(text: string): string {
  let fixed = text
    // Specific long corrupted strings first
    .replace(/Unlock the Power of Visual Content: A CompUnlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addonsrehensive Guide to Chrome Screenshot Addons/g, 'Unlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addons')
    .replace(/Unlock the Power of Visual Content: A Comprehensive the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addonsrehensive Guide to Chrome Screenshot Addons/g, 'Unlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addons')
    .replace(/Unlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addons: A Comprehensive Guide to Chrome Screenshot Addons/g, 'Unlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addons')
    .replace(/A CompUnlock the Power of Visual Content:/g, 'A Comprehensive Guide to')
    .replace(/CompUnlock/g, 'Comprehensive')
    .replace(/CompGuide/g, 'Comprehensive Guide')
    .replace(/CompTitle: /g, '');

  // Logic to fix repeated fragments like "Title: A Title: B" -> "Title: B"
  if (fixed.includes(':')) {
    const parts = fixed.split(':').map(p => p.trim());
    // Remove exact duplicates in parts
    const uniqueParts = [];
    for (const part of parts) {
      if (!uniqueParts.includes(part)) {
        uniqueParts.push(part);
      }
    }
    fixed = uniqueParts.join(': ');
  }

  return fixed;
}

async function cleanup() {
  console.log('Starting SEO Cleanup...');
  const allMdFiles = walkDir(articlesDir);
  let fixedCount = 0;
  let deletedCount = 0;
  let canonicalCount = 0;

  for (const filePath of allMdFiles) {
    const fileName = path.basename(filePath);

    // 1. Delete partials
    if (fileName.endsWith('-partial.md')) {
      console.log(`[Delete] Removing thin content: ${fileName}`);
      fs.unlinkSync(filePath);
      deletedCount++;
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

      if (!match) continue;

      let frontmatterStr = match[1];
      let content = match[2];
      const metadata = yaml.load(frontmatterStr) as Record<string, any>;
      const originalMetadata = JSON.stringify(metadata);

      // 2. Fix broken titles in frontmatter
      if (metadata.title) {
        metadata.title = fixCorruptedText(metadata.title);
      }

      // 3. Fix broken text in content
      const fixedContent = fixCorruptedText(content);
      if (fixedContent !== content) {
        content = fixedContent;
        fixedCount++;
      }

      // 4. Implement Canonical Tags
      const slug = metadata.slug || '';
      const lowerTitle = (metadata.title || '').toLowerCase();
      const lowerSlug = slug.toLowerCase();

      let targetCanonical = '';

      // RAM Cluster logic (exclude the pillar itself)
      if (slug !== 'ultimate-chrome-ram-memory-management-guide') {
        const isRamArticle = RAM_KEYWORDS.some(kw => lowerSlug.includes(kw) || lowerTitle.includes(kw));
        if (isRamArticle) {
          targetCanonical = RAM_PILLAR;
        }
      }

      // Adblock Cluster logic (exclude the pillar itself)
      if (slug !== 'adblocker-for-android-chrome') {
        const isAdblockArticle = ADBLOCK_KEYWORDS.some(kw => lowerSlug.includes(kw) || lowerTitle.includes(kw)) &&
                                 (lowerSlug.includes('android') || lowerTitle.includes('android'));
        if (isAdblockArticle) {
          targetCanonical = ADBLOCK_PILLAR;
        }
      }

      if (targetCanonical && metadata.canonicalPath !== targetCanonical) {
        metadata.canonicalPath = targetCanonical;
        canonicalCount++;
      }

      // Check if metadata changed
      if (JSON.stringify(metadata) !== originalMetadata || content !== match[2]) {
        const newFrontmatter = yaml.dump(metadata, { lineWidth: -1 });
        const newFileContent = `---\n${newFrontmatter}---\n\n${content.trim()}`;
        fs.writeFileSync(filePath, newFileContent);
        if (JSON.stringify(metadata) !== originalMetadata) fixedCount++;
      }

    } catch (e) {
      console.error(`Error processing ${filePath}:`, e);
    }
  }

  console.log(`Cleanup complete!`);
  console.log(`- Articles fixed/updated: ${fixedCount}`);
  console.log(`- Articles with new canonicals: ${canonicalCount}`);
  console.log(`- Partials deleted: ${deletedCount}`);
}

cleanup().catch(console.error);
