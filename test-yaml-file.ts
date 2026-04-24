import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const filePath = 'public/content/articles/l/e/m/lemur-browser-vs-kiwi-browser-a-comprehensive-comparison-for-enhanced-browsing-experience-mmthov1pg80.md';
const fileContent = fs.readFileSync(filePath, 'utf-8');
const match = fileContent.match(/^---([\s\S]*?)---([\s\S]*)$/);

if (match) {
  const metadata = yaml.load(match[1]) as Record<string, unknown>;
  console.log('Parsed slug:', JSON.stringify(metadata.slug));
} else {
  console.log('No match');
}
