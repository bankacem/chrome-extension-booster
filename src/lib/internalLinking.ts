/**
 * Auto Internal Linking System
 * Automatically adds internal links to articles based on keyword matching
 */

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
}

interface LinkMatch {
  keyword: string;
  slug: string;
  title: string;
}

/**
 * Extract keywords from article title and metadata
 */
export function extractKeywords(article: Article): string[] {
  const keywords: Set<string> = new Set();
  
  // Add explicit keywords
  if (article.keywords) {
    article.keywords.forEach((k) => keywords.add(k.toLowerCase().trim()));
  }
  
  // Add tags
  if (article.tags) {
    article.tags.forEach((t) => keywords.add(t.toLowerCase().trim()));
  }
  
  // Extract important words from title (3+ characters)
  const titleWords = article.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  
  // Common stop words to exclude
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "has", "have", "been", "were", "they",
    "this", "that", "with", "from", "your", "will", "more", "when", "which",
    "their", "what", "there", "about", "into", "than", "them", "then", "these",
    "some", "could", "would", "make", "like", "just", "over", "such", "take",
    "how", "best", "top", "why", "new", "use", "get", "using", "guide", "complete"
  ]);
  
  titleWords.forEach((word) => {
    if (!stopWords.has(word)) {
      keywords.add(word);
    }
  });
  
  return Array.from(keywords);
}

/**
 * Find potential link matches in content
 */
export function findLinkMatches(
  content: string,
  currentArticleId: string,
  allArticles: Article[],
  maxLinks: number = 5
): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const usedSlugs = new Set<string>();
  const contentLower = content.toLowerCase();
  
  // Build keyword -> article mapping
  const keywordMap: Map<string, Article> = new Map();
  
  allArticles.forEach((article) => {
    if (article.id === currentArticleId) return;
    
    const keywords = extractKeywords(article);
    keywords.forEach((keyword) => {
      // Only map if keyword is not already mapped (first match wins)
      if (!keywordMap.has(keyword) && keyword.length >= 4) {
        keywordMap.set(keyword, article);
      }
    });
  });
  
  // Sort keywords by length (longer = more specific = higher priority)
  const sortedKeywords = Array.from(keywordMap.keys()).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (matches.length >= maxLinks) break;
    
    const article = keywordMap.get(keyword)!;
    
    // Skip if we already linked to this article
    if (usedSlugs.has(article.slug)) continue;
    
    // Check if keyword exists in content (case-insensitive)
    if (contentLower.includes(keyword)) {
      matches.push({
        keyword,
        slug: article.slug,
        title: article.title,
      });
      usedSlugs.add(article.slug);
    }
  }
  
  return matches;
}

/**
 * Add internal links to content
 * Only links the first occurrence of each keyword
 */
export function addInternalLinks(
  content: string,
  matches: LinkMatch[]
): string {
  let linkedContent = content;
  const linkedKeywords = new Set<string>();
  
  for (const match of matches) {
    if (linkedKeywords.has(match.keyword)) continue;
    
    // Find the keyword in content (case-insensitive, but preserve case)
    const regex = new RegExp(
      `(?<!<[^>]*)(\\b)(${escapeRegExp(match.keyword)})(\\b)(?![^<]*>)`,
      "i"
    );
    
    const matchResult = linkedContent.match(regex);
    if (matchResult) {
      const originalWord = matchResult[2]; // Preserve original case
      const link = `<a href="/blog/${match.slug}" class="internal-link" title="${escapeHtml(match.title)}">${originalWord}</a>`;
      
      // Only replace the first occurrence
      linkedContent = linkedContent.replace(regex, `$1${link}$3`);
      linkedKeywords.add(match.keyword);
    }
  }
  
  return linkedContent;
}

/**
 * Generate a "Related Articles" HTML section
 */
export function generateRelatedArticlesSection(
  currentArticle: Article,
  allArticles: Article[],
  maxRelated: number = 3
): string {
  const relatedArticles = allArticles
    .filter((a) => {
      if (a.id === currentArticle.id) return false;
      if (a.category === currentArticle.category) return true;
      
      // Check for tag overlap
      if (currentArticle.tags && a.tags) {
        const overlap = currentArticle.tags.some((t) => 
          a.tags?.includes(t)
        );
        if (overlap) return true;
      }
      
      return false;
    })
    .slice(0, maxRelated);
  
  if (relatedArticles.length === 0) return "";
  
  const html = `
<div class="related-articles">
  <h3>Related Articles</h3>
  <ul>
    ${relatedArticles
      .map((a) => `<li><a href="/blog/${a.slug}">${escapeHtml(a.title)}</a></li>`)
      .join("\n    ")}
  </ul>
</div>`;
  
  return html;
}

/**
 * Process article content with auto internal linking
 */
export function processArticleWithLinks(
  article: Article,
  allArticles: Article[],
  options: {
    maxInlineLinks?: number;
    addRelatedSection?: boolean;
    maxRelated?: number;
  } = {}
): string {
  const {
    maxInlineLinks = 5,
    addRelatedSection = true,
    maxRelated = 3,
  } = options;
  
  let processedContent = article.content;
  
  // Add inline internal links
  const matches = findLinkMatches(
    processedContent,
    article.id,
    allArticles.filter((a) => a.id !== article.id),
    maxInlineLinks
  );
  
  if (matches.length > 0) {
    processedContent = addInternalLinks(processedContent, matches);
  }
  
  // Add related articles section at the end
  if (addRelatedSection) {
    const relatedSection = generateRelatedArticlesSection(
      article,
      allArticles.filter((a) => a.id !== article.id),
      maxRelated
    );
    
    if (relatedSection) {
      processedContent += "\n" + relatedSection;
    }
  }
  
  return processedContent;
}

// Helper functions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text: string): string {
  // String-based escape — safe to call from browser, Node, or any SSR/prerender
  // context. The previous implementation relied on `document.createElement("div")`
  // which throws a ReferenceError anywhere `document` is undefined (tests, SSR,
  // prerender scripts). The other escapeHtml() helpers in this repo (scripts/
  // prerender-articles.ts, scripts/prerender-static-pages.ts) already use the
  // same string-replacement pattern, so this keeps the codebase consistent.
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
