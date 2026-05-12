// SEO Analysis Engine - Similar to SurferSEO
export interface SEOAnalysis {
  score: number;
  wordCount: number;
  headingsCount: { h1: number; h2: number; h3: number };
  imagesCount: number;
  internalLinks: number;
  externalLinks: number;
  keywordDensity: number;
  keywordInTitle: boolean;
  keywordInFirstParagraph: boolean;
  keywordInMetaDescription: boolean;
  metaDescriptionLength: number;
  titleLength: number;
  readabilityScore: number;
  nlpKeywords: { keyword: string; found: boolean; importance: 'high' | 'medium' | 'low'; count: number; idealCount: number }[];
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field: string;
}

// NLP Keywords database for Chrome extensions niche
const nlpKeywordsDatabase: Record<string, string[]> = {
  'chrome extension': [
    'browser extension', 'web extension', 'chrome web store', 'manifest v3',
    'extension development', 'browser plugin', 'chrome addon', 'extension api',
    'content script', 'background script', 'popup page', 'extension permissions'
  ],
  'productivity': [
    'time management', 'workflow', 'efficiency', 'automation', 'task management',
    'focus mode', 'pomodoro', 'time tracking', 'productivity tools', 'workspace'
  ],
  'security': [
    'privacy', 'encryption', 'password manager', 'vpn', 'ad blocker',
    'tracker blocking', 'secure browsing', 'malware protection', 'data protection'
  ],
  'developer': [
    'web development', 'debugging', 'devtools', 'code editor', 'api testing',
    'json formatter', 'css inspector', 'javascript', 'github', 'coding'
  ],
  'default': [
    'chrome extension', 'browser', 'install', 'download', 'features',
    'how to use', 'tutorial', 'guide', 'best practices', 'tips'
  ]
};

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function countHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[^>]*>/gi) || []).length,
    h2: (html.match(/<h2[^>]*>/gi) || []).length,
    h3: (html.match(/<h3[^>]*>/gi) || []).length
  };
}

function countImages(html: string): number {
  return (html.match(/<img[^>]*>/gi) || []).length;
}

function countLinks(html: string): { internal: number; external: number } {
  const links = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  let internal = 0;
  let external = 0;

  links.forEach((link: string) => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      if (href.startsWith('/') || href.includes('extensionto.com')) {
        internal++;
      } else if (href.startsWith('http')) {
        external++;
      }
    }
  });

  return { internal, external };
}

function calculateKeywordDensity(text: string, keyword: string): number {
  if (!keyword) return 0;
  const words = text.toLowerCase().split(/\s+/);
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  let count = 0;
  
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const slice = words.slice(i, i + keywordWords.length).join(' ');
    if (slice === keyword.toLowerCase()) {
      count++;
    }
  }
  
  return (count * keywordWords.length / words.length) * 100;
}

function getFirstParagraph(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return match ? extractText(match[1]) : '';
}

function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = words.reduce((acc, word) => {
    return acc + countSyllables(word);
  }, 0) / words.length;
  
  // Flesch Reading Ease formula (simplified)
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function getNLPKeywords(category: string, targetKeyword: string, content: string): SEOAnalysis['nlpKeywords'] {
  const categoryLower = category?.toLowerCase() || '';
  const contentLower = content.toLowerCase();
  
  let relevantKeywords: string[] = [];
  
  // Get category-specific keywords
  for (const [key, keywords] of Object.entries(nlpKeywordsDatabase)) {
    if (categoryLower.includes(key) || key === 'default') {
      relevantKeywords = [...relevantKeywords, ...keywords];
    }
  }
  
  // Add target keyword if provided
  if (targetKeyword && !relevantKeywords.includes(targetKeyword.toLowerCase())) {
    relevantKeywords.unshift(targetKeyword.toLowerCase());
  }
  
  // Remove duplicates
  relevantKeywords = [...new Set(relevantKeywords)];
  
  // Count occurrences and calculate ideal counts
  return relevantKeywords.slice(0, 15).map((keyword, index) => {
    // Count how many times keyword appears
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = contentLower.match(regex);
    const count = matches ? matches.length : 0;
    
    // Ideal count based on importance
    const idealCount = index < 5 ? 5 : index < 10 ? 3 : 2;
    
    return {
      keyword,
      found: count > 0,
      importance: index < 5 ? 'high' : index < 10 ? 'medium' : 'low' as const,
      count,
      idealCount
    };
  });
}

export function analyzeSEO(
  title: string,
  content: string,
  metaDescription: string | null,
  category: string | null,
  keywords: string[] | null
): SEOAnalysis {
  const text = extractText(content);
  const wordCount = countWords(text);
  const headingsCount = countHeadings(content);
  const imagesCount = countImages(content);
  const links = countLinks(content);
  const targetKeyword = keywords?.[0] || '';
  const keywordDensity = calculateKeywordDensity(text, targetKeyword);
  const firstParagraph = getFirstParagraph(content);
  const readabilityScore = calculateReadabilityScore(text);
  
  const keywordInTitle = targetKeyword ? title.toLowerCase().includes(targetKeyword.toLowerCase()) : false;
  const keywordInFirstParagraph = targetKeyword ? firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase()) : false;
  const keywordInMetaDescription = targetKeyword && metaDescription ? 
    metaDescription.toLowerCase().includes(targetKeyword.toLowerCase()) : false;
  
  const nlpKeywords = getNLPKeywords(category || '', targetKeyword, text);
  
  const issues: SEOIssue[] = [];
  const recommendations: string[] = [];
  
  // Title checks
  if (title.length < 30) {
    issues.push({ type: 'warning', message: 'Title is too short (less than 30 characters)', field: 'title' });
  } else if (title.length > 60) {
    issues.push({ type: 'warning', message: 'Title is too long (more than 60 characters)', field: 'title' });
  }
  
  if (!keywordInTitle && targetKeyword) {
    issues.push({ type: 'error', message: 'Target keyword not found in title', field: 'title' });
    recommendations.push('Add your target keyword to the title');
  }
  
  // Meta description checks
  if (!metaDescription) {
    issues.push({ type: 'error', message: 'Meta description is missing', field: 'meta_description' });
    recommendations.push('Add a meta description between 120-160 characters');
  } else if (metaDescription.length < 120) {
    issues.push({ type: 'warning', message: 'Meta description is too short', field: 'meta_description' });
  } else if (metaDescription.length > 160) {
    issues.push({ type: 'warning', message: 'Meta description is too long', field: 'meta_description' });
  }
  
  // Content length checks
  if (wordCount < 300) {
    issues.push({ type: 'error', message: 'Content is too short (less than 300 words)', field: 'content' });
    recommendations.push('Increase content length to at least 1000 words for better SEO');
  } else if (wordCount < 1000) {
    issues.push({ type: 'warning', message: 'Content could be longer (less than 1000 words)', field: 'content' });
  }
  
  // Keyword density checks
  if (targetKeyword) {
    if (keywordDensity < 0.5) {
      issues.push({ type: 'warning', message: 'Keyword density is too low (less than 0.5%)', field: 'content' });
      recommendations.push('Use your target keyword more frequently');
    } else if (keywordDensity > 2.5) {
      issues.push({ type: 'warning', message: 'Keyword density is too high (more than 2.5%)', field: 'content' });
      recommendations.push('Reduce keyword usage to avoid keyword stuffing');
    }
  }
  
  // First paragraph check
  if (!keywordInFirstParagraph && targetKeyword) {
    issues.push({ type: 'warning', message: 'Target keyword not in first paragraph', field: 'content' });
    recommendations.push('Include target keyword in the first paragraph');
  }
  
  // Headings checks
  if (headingsCount.h1 === 0) {
    issues.push({ type: 'error', message: 'No H1 heading found', field: 'content' });
    recommendations.push('Add an H1 heading to your content');
  } else if (headingsCount.h1 > 1) {
    issues.push({ type: 'warning', message: 'Multiple H1 headings found', field: 'content' });
  }
  
  if (headingsCount.h2 < 2) {
    issues.push({ type: 'info', message: 'Consider adding more H2 subheadings', field: 'content' });
  }
  
  // Images check
  if (imagesCount === 0) {
    issues.push({ type: 'warning', message: 'No images found in content', field: 'content' });
    recommendations.push('Add relevant images to improve engagement');
  }
  
  // Links checks
  if (links.internal === 0) {
    issues.push({ type: 'warning', message: 'No internal links found', field: 'content' });
    recommendations.push('Add internal links to related content');
  }
  
  if (links.external === 0) {
    issues.push({ type: 'info', message: 'Consider adding external links to authoritative sources', field: 'content' });
  }
  
  // Calculate overall score
  let score = 50; // Base score
  
  // Word count scoring (max 15 points)
  if (wordCount >= 2000) score += 15;
  else if (wordCount >= 1500) score += 12;
  else if (wordCount >= 1000) score += 10;
  else if (wordCount >= 500) score += 5;
  
  // Keyword optimization (max 20 points)
  if (keywordInTitle) score += 7;
  if (keywordInFirstParagraph) score += 5;
  if (keywordInMetaDescription) score += 3;
  if (keywordDensity >= 1 && keywordDensity <= 2.5) score += 5;
  
  // Structure scoring (max 10 points)
  if (headingsCount.h1 === 1) score += 3;
  if (headingsCount.h2 >= 2) score += 3;
  if (headingsCount.h3 >= 2) score += 2;
  if (imagesCount >= 1) score += 2;
  
  // Links scoring (max 5 points)
  if (links.internal >= 2) score += 3;
  if (links.external >= 1) score += 2;
  
  // Meta description scoring (max 5 points)
  if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160) {
    score += 5;
  }
  
  // NLP keywords (max 5 points)
  const foundKeywords = nlpKeywords.filter(k => k.found).length;
  score += Math.min(5, Math.floor(foundKeywords / 3));
  
  // Deductions for errors
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  score -= errorCount * 5;
  score -= warningCount * 2;
  
  score = Math.max(0, Math.min(100, score));
  
  return {
    score,
    wordCount,
    headingsCount,
    imagesCount,
    internalLinks: links.internal,
    externalLinks: links.external,
    keywordDensity,
    keywordInTitle,
    keywordInFirstParagraph,
    keywordInMetaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    titleLength: title.length,
    readabilityScore,
    nlpKeywords,
    issues,
    recommendations
  };
}
