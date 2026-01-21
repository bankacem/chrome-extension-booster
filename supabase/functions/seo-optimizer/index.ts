import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptimizeRequest {
  content: string;
  title: string;
  metaDescription: string | null;
  targetKeyword: string;
  missingKeywords: string[];
  issues: { type: string; message: string; field: string }[];
  currentKeywordDensity: number;
  wordCount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      title, 
      metaDescription, 
      targetKeyword, 
      missingKeywords, 
      issues,
      currentKeywordDensity,
      wordCount
    }: OptimizeRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build optimization instructions based on issues
    const optimizationTasks: string[] = [];
    
    // Check keyword density
    if (currentKeywordDensity > 2.5) {
      optimizationTasks.push(`- Reduce keyword "${targetKeyword}" density from ${currentKeywordDensity.toFixed(1)}% to between 1-2.5% by using synonyms and variations`);
    } else if (currentKeywordDensity < 1) {
      optimizationTasks.push(`- Increase keyword "${targetKeyword}" usage to achieve 1-2% density naturally`);
    }
    
    // Check missing NLP keywords
    if (missingKeywords.length > 0) {
      optimizationTasks.push(`- Naturally incorporate these missing NLP keywords: ${missingKeywords.slice(0, 8).join(', ')}`);
    }
    
    // Check content length
    if (wordCount < 1200) {
      optimizationTasks.push(`- Expand the content to at least 1200 words (currently ${wordCount} words) by adding more detailed explanations and examples`);
    }
    
    // Check issues
    issues.forEach(issue => {
      if (issue.type === 'error' || issue.type === 'warning') {
        switch (issue.field) {
          case 'title':
            if (issue.message.includes('keyword not found')) {
              optimizationTasks.push(`- Ensure the title includes the target keyword "${targetKeyword}"`);
            }
            break;
          case 'content':
            if (issue.message.includes('first paragraph')) {
              optimizationTasks.push(`- Include the target keyword "${targetKeyword}" in the first paragraph`);
            }
            if (issue.message.includes('H2')) {
              optimizationTasks.push('- Add more H2 subheadings to improve content structure');
            }
            if (issue.message.includes('internal links')) {
              optimizationTasks.push('- Suggest adding internal links (use placeholder [INTERNAL_LINK])');
            }
            break;
          case 'meta_description':
            if (issue.message.includes('missing') || issue.message.includes('short')) {
              optimizationTasks.push(`- Create/improve meta description to be 120-160 characters including "${targetKeyword}"`);
            }
            break;
        }
      }
    });

    const systemPrompt = `You are an expert SEO content optimizer. Your task is to rewrite and optimize the given HTML article content to achieve a higher SEO score.

CRITICAL RULES:
1. Keep the same meaning and topic of the original content
2. Output ONLY valid HTML content - no markdown, no explanations
3. Maintain the same structure (headings hierarchy)
4. Do NOT change any existing links or image sources
5. Use natural language - avoid keyword stuffing
6. Keep the content professional and readable
7. Output must be clean HTML ready for direct use

OPTIMIZATION TASKS:
${optimizationTasks.join('\n')}

Target Keyword: "${targetKeyword}"
Current Word Count: ${wordCount}
Current Keyword Density: ${currentKeywordDensity.toFixed(2)}%`;

    const userPrompt = `Optimize this article content:

TITLE: ${title}

CURRENT META DESCRIPTION: ${metaDescription || 'MISSING - Create one'}

CONTENT:
${content}

Return a JSON object with these fields:
{
  "optimizedContent": "the fully optimized HTML content",
  "optimizedTitle": "improved title if needed, or original",
  "optimizedMetaDescription": "new meta description 120-160 chars",
  "changes": ["list of changes made"]
}`;

    console.log("Calling Lovable AI for SEO optimization...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const responseContent = aiResponse.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from AI");
    }

    console.log("AI Response received, parsing...");

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error, using raw response:", parseError);
      // If parsing fails, return the raw content as optimized
      result = {
        optimizedContent: responseContent,
        optimizedTitle: title,
        optimizedMetaDescription: metaDescription || "",
        changes: ["Content was processed but response format was unexpected"]
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SEO Optimizer error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to optimize content"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
