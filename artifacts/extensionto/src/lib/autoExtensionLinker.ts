import { extensions, Extension, findExtensionByKeyword } from './extensionsData';

interface ExtensionLink {
  extensionId: string;
  extensionName: string;
  extensionSlug: string;
  storeUrl: string;
}

/**
 * Detects which extension an article is about based on its content and keywords
 */
export const detectExtensionFromContent = (
  title: string, 
  content: string, 
  keywords: string[]
): Extension | null => {
  // First, check if any extension name is in the title
  for (const ext of extensions) {
    if (title.toLowerCase().includes(ext.name.toLowerCase())) {
      return ext;
    }
  }

  // Check keywords
  for (const keyword of keywords) {
    const found = findExtensionByKeyword(keyword);
    if (found) return found;
  }

  // Check content for extension names
  const contentLower = content.toLowerCase();
  for (const ext of extensions) {
    if (contentLower.includes(ext.name.toLowerCase())) {
      return ext;
    }
  }

  // Check for extension-related keywords in content
  for (const ext of extensions) {
    for (const kw of ext.keywords) {
      if (contentLower.includes(kw.toLowerCase())) {
        return ext;
      }
    }
  }

  return null;
};

/**
 * Generates a backlink-style button HTML for an extension
 */
export const generateExtensionBacklink = (extension: Extension): string => {
  return `
<div class="extension-backlink my-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
  <div class="flex flex-col md:flex-row items-center gap-4">
    <div class="flex-shrink-0">
      <div class="w-16 h-16 rounded-xl bg-gradient-to-br ${extension.color} flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
    <div class="flex-1 text-center md:text-left">
      <h4 class="text-lg font-bold mb-1">${extension.name}</h4>
      <p class="text-sm text-muted-foreground mb-2">${extension.description}</p>
      <div class="flex items-center justify-center md:justify-start gap-4 text-sm">
        <span class="flex items-center gap-1">
          <strong>${extension.users}</strong> users
        </span>
        <span class="flex items-center gap-1">
          ★ <strong>${extension.rating}</strong>
        </span>
      </div>
    </div>
    <div class="flex flex-col sm:flex-row gap-2">
      <a href="/extension/${extension.slug}" class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors">
        Learn More
      </a>
      <a href="${extension.storeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Add to Chrome
      </a>
    </div>
  </div>
</div>`;
};

/**
 * Generates inline extension links to be inserted in article content
 */
export const generateInlineExtensionLink = (extension: Extension): string => {
  return `<a href="/extension/${extension.slug}" class="text-primary font-medium hover:underline">${extension.name}</a>`;
};

/**
 * Processes article content to add extension backlinks
 */
export const addExtensionBacklinkToContent = (
  content: string,
  title: string,
  keywords: string[]
): { content: string; linkedExtension: Extension | null } => {
  const detectedExtension = detectExtensionFromContent(title, content, keywords);
  
  if (!detectedExtension) {
    return { content, linkedExtension: null };
  }

  // Add backlink after the first H2 or at the beginning if no H2
  const h2Match = content.match(/<\/h2>/i);
  let modifiedContent: string;

  if (h2Match && h2Match.index !== undefined) {
    const insertPosition = h2Match.index + h2Match[0].length;
    modifiedContent = 
      content.slice(0, insertPosition) + 
      generateExtensionBacklink(detectedExtension) +
      content.slice(insertPosition);
  } else {
    // Insert after the first paragraph
    const pMatch = content.match(/<\/p>/i);
    if (pMatch && pMatch.index !== undefined) {
      const insertPosition = pMatch.index + pMatch[0].length;
      modifiedContent = 
        content.slice(0, insertPosition) + 
        generateExtensionBacklink(detectedExtension) +
        content.slice(insertPosition);
    } else {
      // Insert at the beginning
      modifiedContent = generateExtensionBacklink(detectedExtension) + content;
    }
  }

  // Also add a CTA at the end
  modifiedContent += `
<div class="extension-cta-final mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 text-center">
  <h3 class="text-2xl font-bold mb-3">Get ${detectedExtension.name} Now</h3>
  <p class="text-muted-foreground mb-6 max-w-xl mx-auto">${detectedExtension.longDescription}</p>
  <div class="flex flex-wrap justify-center gap-4">
    <a href="${detectedExtension.storeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Add to Chrome - It's Free
    </a>
    <a href="/extension/${detectedExtension.slug}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-primary/50 hover:bg-primary/10 text-primary font-semibold transition-colors">
      View Full Details
    </a>
  </div>
</div>`;

  return { content: modifiedContent, linkedExtension: detectedExtension };
};

/**
 * Gets all extension data for use in the AI generator
 */
export const getExtensionsForAI = (): string => {
  return extensions.map(ext => 
    `- ${ext.name}: ${ext.description} (Category: ${ext.category}, Page: /extension/${ext.slug})`
  ).join('\n');
};
