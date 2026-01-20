import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArticleRequest {
  keyword: string;
  category: string;
  language: string;
  writingStyle: string;
  includeTableOfContents: boolean;
  includeFAQSection: boolean;
  includeImagePlaceholders: boolean;
  includeComparisonTable: boolean;
  extensions?: string[];
  autoLinkExtension?: boolean;
  // AI Provider settings
  aiProvider?: "lovable" | "openrouter" | "openai" | "gemini" | "groq";
  customApiKey?: string;
  model?: string;
}

// Extension data for auto-linking
const EXTENSIONS = [
  {
    name: "Quick Screenshot Lite",
    slug: "quick-screenshot-lite",
    description: "Capture full page or visible area screenshots instantly.",
    storeUrl: "https://chromewebstore.google.com/detail/quick-screenshot-lite/hddickadgkbfpcelmckpjhcfnoeognee",
    keywords: ["screenshot", "screen capture", "capture tool", "full page screenshot"]
  },
  {
    name: "Auto Dark Mode Switcher",
    slug: "auto-dark-mode-switcher",
    description: "Automatically switch between dark and light modes.",
    storeUrl: "https://chromewebstore.google.com/detail/auto-dark-mode-switcher-u/obbhliekbfgpcdippngphefofiicgjml",
    keywords: ["dark mode", "light mode", "theme switcher", "night mode"]
  },
  {
    name: "Redirect Shield",
    slug: "redirect-shield",
    description: "Stop automatic redirects and protect from malicious chains.",
    storeUrl: "https://chromewebstore.google.com/detail/redirect-shield-stop-auto/pofolffdhjffglfphiagpbnlegjbnbhp",
    keywords: ["redirect blocker", "security", "phishing protection"]
  },
  {
    name: "ProTab Suspender",
    slug: "protab-suspender",
    description: "Automatically suspend inactive tabs to save memory.",
    storeUrl: "https://chromewebstore.google.com/detail/protab-suspender-memory-s/gghjdfjjffegohpjhmcmgeonmcomilgj",
    keywords: ["tab suspender", "memory saver", "performance", "tab manager"]
  },
  {
    name: "Light Popup Blocker",
    slug: "light-popup-blocker",
    description: "Block annoying popups and intrusive ads.",
    storeUrl: "https://chromewebstore.google.com/detail/light-popup-blocker-ad-de/oimngcokgckajdlphggpjpbeljoakpii",
    keywords: ["popup blocker", "ad blocker", "block ads"]
  },
  {
    name: "Formula Builder Pro",
    slug: "formula-builder-pro",
    description: "Build and calculate complex formulas in your browser.",
    storeUrl: "https://chromewebstore.google.com/detail/formula-builder-pro/ecmfloopolmkamoklcepdonahkigjlnn",
    keywords: ["calculator", "formula builder", "math", "scientific calculator"]
  },
  {
    name: "SecuraKey Pro",
    slug: "securakey-pro",
    description: "Secure password manager with encryption.",
    storeUrl: "https://chromewebstore.google.com/detail/securakey-pro-password-ma/omeencccnkninlofbggfcfiohapajhgi",
    keywords: ["password manager", "security", "password generator", "encryption"]
  },
  {
    name: "Offline Reader Pro",
    slug: "offline-reader-pro",
    description: "Save web pages for offline reading.",
    storeUrl: "https://chromewebstore.google.com/detail/offline-reader-pro/bgbojccanmjdniomhccefkakjaedajhf",
    keywords: ["offline reader", "save pages", "read later"]
  },
  {
    name: "Cookie Banner Blocker",
    slug: "cookie-banner-blocker",
    description: "Automatically dismiss cookie consent banners.",
    storeUrl: "https://chromewebstore.google.com/detail/cookie-banner-blocker-pri/mlmiefaloipcahfcgfbccadnnjgpipge",
    keywords: ["cookie banner", "gdpr", "privacy", "consent popup"]
  }
];

function detectExtension(keyword: string, content: string) {
  const lowerKeyword = keyword.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  for (const ext of EXTENSIONS) {
    if (lowerKeyword.includes(ext.name.toLowerCase()) || 
        ext.name.toLowerCase().includes(lowerKeyword)) {
      return ext;
    }
    
    for (const kw of ext.keywords) {
      if (lowerKeyword.includes(kw) || lowerContent.includes(kw)) {
        return ext;
      }
    }
  }
  
  return null;
}

function generateExtensionBacklink(ext: typeof EXTENSIONS[0]) {
  return `
<div class="extension-backlink my-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
  <div class="flex flex-col md:flex-row items-center gap-4">
    <div class="flex-1 text-center md:text-left">
      <h4 class="text-lg font-bold mb-1">${ext.name}</h4>
      <p class="text-sm text-muted-foreground mb-2">${ext.description}</p>
    </div>
    <div class="flex flex-col sm:flex-row gap-2">
      <a href="/extension/${ext.slug}" class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors">
        Learn More
      </a>
      <a href="${ext.storeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors gap-2">
        Add to Chrome
      </a>
    </div>
  </div>
</div>`;
}

function generateFinalCTA(ext: typeof EXTENSIONS[0]) {
  return `
<div class="extension-cta-final mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 text-center">
  <h3 class="text-2xl font-bold mb-3">Get ${ext.name} Now</h3>
  <p class="text-muted-foreground mb-6 max-w-xl mx-auto">${ext.description}</p>
  <div class="flex flex-wrap justify-center gap-4">
    <a href="${ext.storeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors gap-2">
      Add to Chrome - It's Free
    </a>
    <a href="/extension/${ext.slug}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-primary/50 hover:bg-primary/10 text-primary font-semibold transition-colors">
      View Full Details
    </a>
  </div>
</div>`;
}

function addExtensionLinks(content: string, keyword: string, autoLinkExtension: boolean) {
  if (!autoLinkExtension) return { content, linkedExtension: null };
  
  const detectedExt = detectExtension(keyword, content);
  if (!detectedExt) return { content, linkedExtension: null };
  
  const h2Match = content.match(/<\/h2>/i);
  let modifiedContent: string;
  
  if (h2Match && h2Match.index !== undefined) {
    const insertPos = h2Match.index + h2Match[0].length;
    modifiedContent = content.slice(0, insertPos) + generateExtensionBacklink(detectedExt) + content.slice(insertPos);
  } else {
    const pMatch = content.match(/<\/p>/i);
    if (pMatch && pMatch.index !== undefined) {
      const insertPos = pMatch.index + pMatch[0].length;
      modifiedContent = content.slice(0, insertPos) + generateExtensionBacklink(detectedExt) + content.slice(insertPos);
    } else {
      modifiedContent = generateExtensionBacklink(detectedExt) + content;
    }
  }
  
  modifiedContent += generateFinalCTA(detectedExt);
  
  return { content: modifiedContent, linkedExtension: detectedExt };
}

// Provider-specific API configurations
interface ProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, messages: { role: string; content: string }[]) => object;
  extractContent: (data: any) => string;
}

const providerConfigs: Record<string, ProviderConfig> = {
  lovable: {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, messages) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://extensionto.com",
      "X-Title": "Extension SEO Generator",
    }),
    getBody: (model, messages) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, messages) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}",
    getHeaders: (_apiKey) => ({
      "Content-Type": "application/json",
    }),
    getBody: (_model, messages) => {
      // Combine system and user messages for Gemini
      const systemContent = messages.find(m => m.role === "system")?.content || "";
      const userContent = messages.find(m => m.role === "user")?.content || "";
      const combinedContent = systemContent + "\n\n" + userContent;
      
      return {
        contents: [{
          parts: [{ text: combinedContent }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
        }
      };
    },
    extractContent: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || "",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, messages) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
};

// Helper function for fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 120000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function for retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      const response = await fetchWithTimeout(url, options, 120000);
      
      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error (5xx), retry
      console.log(`Server error (${response.status}), will retry...`);
      lastError = new Error(`Server returned ${response.status}`);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`Request failed: ${error.message || 'Unknown error'}`);
      lastError = error;
      
      if (error.name === 'AbortError') {
        console.log('Request timed out, will retry...');
      }
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      keyword, 
      category, 
      language, 
      writingStyle,
      includeTableOfContents,
      includeFAQSection,
      includeImagePlaceholders,
      includeComparisonTable,
      extensions = [],
      autoLinkExtension = true,
      aiProvider = "lovable",
      customApiKey,
      model
    }: ArticleRequest = await req.json();

    // Get the appropriate API key
    let apiKey: string;
    if (aiProvider === "lovable") {
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      if (!apiKey) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }
    } else {
      if (!customApiKey) {
        throw new Error(`API key required for ${aiProvider}`);
      }
      apiKey = customApiKey;
    }

    // Get provider config
    const providerConfig = providerConfigs[aiProvider];
    if (!providerConfig) {
      throw new Error(`Unknown AI provider: ${aiProvider}`);
    }

    // Determine model to use
    const selectedModel = model || (aiProvider === "lovable" ? "google/gemini-3-flash-preview" : undefined);
    if (!selectedModel) {
      throw new Error("Model is required");
    }

    const styleDescriptions: Record<string, string> = {
      professional: "Professional and authoritative tone with formal language",
      casual: "Casual and friendly tone, easy to read",
      educational: "Educational and informative, explaining concepts clearly",
      persuasive: "Persuasive and engaging, encouraging action",
      technical: "Technical and detailed, with precise terminology"
    };

    const extensionContext = EXTENSIONS.map(ext => 
      `- ${ext.name}: ${ext.description} (Page: /extension/${ext.slug}, Store: ${ext.storeUrl})`
    ).join('\n');

    const extensionsList = extensions.length > 0 
      ? `\n\nInclude internal links to these Chrome extensions where relevant:\n${extensions.map(ext => `- ${ext}`).join('\n')}`
      : '';

    const tableOfContentsInstruction = includeTableOfContents 
      ? `\n- Include a Table of Contents at the beginning with anchor links to each section`
      : '';

    const faqInstruction = includeFAQSection 
      ? `\n- Include a FAQ section at the end with 5-7 relevant questions and detailed answers`
      : '';

    const imageInstruction = includeImagePlaceholders 
      ? `\n- Include image placeholders with descriptive alt text like: <img src="placeholder-image.jpg" alt="descriptive alt text" class="w-full rounded-lg my-4" />`
      : '';

    const comparisonInstruction = includeComparisonTable 
      ? `\n- Include a comparison table with relevant features/options`
      : '';

    const systemPrompt = `You are a professional SEO content writer specializing in Chrome extensions and web tools. 
Write high-quality, comprehensive articles in HTML format that are optimized for search engines.

Writing Style: ${styleDescriptions[writingStyle] || styleDescriptions.professional}
Language: ${language}
Category: ${category}

IMPORTANT: Our Chrome Extensions (link to these where relevant):
${extensionContext}

Article Structure Requirements:
- Use semantic HTML with proper heading hierarchy (H1 > H2 > H3 > H4)
- Start with an engaging H1 title
- Include an introduction paragraph that hooks the reader
- Use H2 for main sections and H3/H4 for subsections
- Write detailed, valuable content (minimum 1500 words)
- Use bullet points and numbered lists for readability
- If the article is about one of our extensions, mention it prominently and link to its page
- Include internal links to related extensions where naturally appropriate${tableOfContentsInstruction}${faqInstruction}${imageInstruction}${comparisonInstruction}${extensionsList}

HTML Formatting Guidelines:
- Wrap paragraphs in <p> tags
- Use <strong> for emphasis and important points
- Use <ul>/<ol> with <li> for lists
- Use <blockquote> for quotes or key takeaways
- Use proper table structure with <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Tables should have proper styling classes
- For extension links use: <a href="/extension/SLUG" class="text-primary font-medium hover:underline">Extension Name</a>
- Ensure all content is SEO-optimized with the target keyword naturally integrated

Output only the HTML content, starting with the H1 title. Do not include any markdown or code blocks.`;

    const userPrompt = `Write a comprehensive, SEO-optimized article about: "${keyword}"

The article should:
1. Target the keyword "${keyword}" naturally throughout
2. Be engaging and valuable to readers
3. Follow all the structure and formatting requirements
4. Be written in ${language}
5. Fit the ${category} category
6. If this is related to any of our Chrome extensions, prominently feature and link to them

Generate the complete HTML article now.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // Construct the API URL (Gemini has a different URL pattern)
    let apiUrl = providerConfig.url;
    if (aiProvider === "gemini") {
      apiUrl = apiUrl.replace("{model}", selectedModel).replace("{apiKey}", apiKey);
    }

    console.log(`Using provider: ${aiProvider}, model: ${selectedModel}`);
    console.log(`API URL: ${apiUrl}`);

    // Use retry logic with timeout
    let response: Response;
    try {
      response = await fetchWithRetry(
        apiUrl,
        {
          method: "POST",
          headers: providerConfig.getHeaders(apiKey),
          body: JSON.stringify(providerConfig.getBody(selectedModel, messages)),
        },
        3, // max retries
        2000 // delay between retries
      );
    } catch (retryError) {
      console.error(`All retry attempts failed:`, retryError);
      return new Response(JSON.stringify({ 
        error: `Connection failed after multiple attempts. Please try again later.`,
        details: String(retryError)
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${aiProvider} API error - Status: ${response.status}`);
      console.error(`${aiProvider} API error - Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));
      console.error(`${aiProvider} API error - Body:`, errorText);
      
      // Parse error details for better messaging
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
        
        // Check for specific Groq errors
        if (errorJson.error?.code === 'model_decommissioned') {
          return new Response(JSON.stringify({ 
            error: `The model "${selectedModel}" has been discontinued. Please select a different model.`,
            suggestedModel: "llama-3.3-70b-versatile"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (errorJson.error?.code === 'insufficient_quota' || errorJson.error?.type === 'insufficient_quota') {
          return new Response(JSON.stringify({ 
            error: `Your ${aiProvider} account has run out of credits. Please add more credits to continue.`
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        // Not JSON, use raw text
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please wait a moment and try again.",
          retryAfter: response.headers.get('retry-after') || '60'
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402 || response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ 
          error: `Authentication failed. Please verify your ${aiProvider} API key is correct and has sufficient credits.`,
          details: errorDetails
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `AI generation failed (${response.status})`,
        details: errorDetails
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = providerConfig.extractContent(data);

    // Clean up the content
    content = content
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Auto-link extension if enabled
    const linkResult = addExtensionLinks(content, keyword, autoLinkExtension);
    content = linkResult.content;

    // Extract title from H1
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch 
      ? titleMatch[1].replace(/<[^>]*>/g, '').trim() 
      : keyword;

    // Generate excerpt from first paragraph
    const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
    const excerpt = paragraphMatch 
      ? paragraphMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 160) 
      : '';

    // Calculate read time
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const wordCount = textContent.split(' ').filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Generate slug
    const slug = keyword
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);

    return new Response(JSON.stringify({
      title,
      content,
      excerpt,
      slug,
      readTime,
      wordCount,
      category,
      keywords: [keyword],
      meta_description: excerpt,
      linkedExtension: linkResult.linkedExtension ? linkResult.linkedExtension.slug : null,
      provider: aiProvider,
      model: selectedModel
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate article error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
