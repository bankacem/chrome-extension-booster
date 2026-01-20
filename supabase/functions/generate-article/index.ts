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
      extensions = []
    }: ArticleRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const styleDescriptions: Record<string, string> = {
      professional: "Professional and authoritative tone with formal language",
      casual: "Casual and friendly tone, easy to read",
      educational: "Educational and informative, explaining concepts clearly",
      persuasive: "Persuasive and engaging, encouraging action",
      technical: "Technical and detailed, with precise terminology"
    };

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

Article Structure Requirements:
- Use semantic HTML with proper heading hierarchy (H1 > H2 > H3 > H4)
- Start with an engaging H1 title
- Include an introduction paragraph that hooks the reader
- Use H2 for main sections and H3/H4 for subsections
- Write detailed, valuable content (minimum 1500 words)
- Use bullet points and numbered lists for readability
- Include relevant internal linking opportunities${tableOfContentsInstruction}${faqInstruction}${imageInstruction}${comparisonInstruction}${extensionsList}

HTML Formatting Guidelines:
- Wrap paragraphs in <p> tags
- Use <strong> for emphasis and important points
- Use <ul>/<ol> with <li> for lists
- Use <blockquote> for quotes or key takeaways
- Use proper table structure with <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Tables should have proper styling classes
- Ensure all content is SEO-optimized with the target keyword naturally integrated

Output only the HTML content, starting with the H1 title. Do not include any markdown or code blocks.`;

    const userPrompt = `Write a comprehensive, SEO-optimized article about: "${keyword}"

The article should:
1. Target the keyword "${keyword}" naturally throughout
2. Be engaging and valuable to readers
3. Follow all the structure and formatting requirements
4. Be written in ${language}
5. Fit the ${category} category

Generate the complete HTML article now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean up the content - remove any markdown code blocks if present
    content = content
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

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

    // Calculate read time (rough estimate: 200 words per minute)
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
      meta_description: excerpt
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
