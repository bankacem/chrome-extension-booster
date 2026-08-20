import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/auth.ts";

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

// Helper function to call Groq API
async function callGroqAPI(apiKey: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });
  
  return { response, provider: "Groq" };
}

// Helper function to call Gemini API
async function callGeminiAPI(apiKey: string, systemPrompt: string, userPrompt: string) {
  const combinedContent = systemPrompt + "\n\n" + userPrompt;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: combinedContent }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      }
    }),
  });
  
  return { response, provider: "Gemini" };
}

// Extract content from provider response
interface ProviderResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  choices?: Array<{ message?: { content?: string } }>;
}

function extractContent(data: ProviderResponse, provider: string): string {
  if (provider === "Gemini") {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

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

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      throw new Error("No API key configured. Please add GROQ_API_KEY or GEMINI_API_KEY in Supabase Secrets.");
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

    const systemPrompt = `You are an expert SEO content optimizer. Your task is to optimize the given HTML article content for better SEO rankings.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW:
1. The target keyword "${targetKeyword}" MUST appear:
   - In the title (within first 60 characters)
   - In the first paragraph
   - Throughout content with 1.5-2% density (approximately 15-20 times per 1000 words)
2. KEEP ALL existing internal links (href="/...") - DO NOT REMOVE THEM
3. KEEP ALL existing external links - DO NOT REMOVE THEM
4. Title MUST be under 60 characters
5. Meta description MUST be 120-155 characters and include the target keyword
6. Output clean HTML only - no markdown, no JSON code blocks
7. Maintain the same topic and meaning
8. Use natural language - balance keyword usage

OPTIMIZATION TASKS:
${optimizationTasks.join('\n')}

Target Keyword: "${targetKeyword}"
Required Keyword Density: 1.5% - 2%
Current Word Count: ${wordCount}
Current Keyword Density: ${currentKeywordDensity.toFixed(2)}%`;

    const userPrompt = `Optimize this article for SEO:

CURRENT TITLE: ${title}
TARGET KEYWORD: ${targetKeyword}
CURRENT META DESCRIPTION: ${metaDescription || 'MISSING - Create one with target keyword'}

CONTENT TO OPTIMIZE:
${content}

IMPORTANT: 
- Title must contain "${targetKeyword}" and be under 60 characters
- First paragraph must contain "${targetKeyword}"
- Maintain keyword density between 1.5-2%
- Keep ALL internal and external links from the original

Return ONLY a valid JSON object (no markdown code blocks):
{
  "optimizedContent": "the optimized HTML content with target keyword properly distributed",
  "optimizedTitle": "short title under 60 chars with target keyword",
  "optimizedMetaDescription": "120-155 chars description with target keyword",
  "changes": ["list of specific changes made"]
}`;

    console.log("Starting SEO optimization with fallback providers...");

    let response: Response;
    let usedProvider: string;
    let responseContent: string = "";

    // Try Groq first, then Gemini as fallback
    if (GROQ_API_KEY) {
      console.log("Trying Groq API...");
      const groqResult = await callGroqAPI(GROQ_API_KEY, systemPrompt, userPrompt);
      response = groqResult.response;
      usedProvider = groqResult.provider;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API error:", response.status, errorText);
        
        // If Groq fails and we have Gemini, try Gemini
        if (GEMINI_API_KEY && (response.status === 429 || response.status >= 500)) {
          console.log("Groq failed, falling back to Gemini...");
          const geminiResult = await callGeminiAPI(GEMINI_API_KEY, systemPrompt, userPrompt);
          response = geminiResult.response;
          usedProvider = geminiResult.provider;
        } else if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
            { status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
          );
        } else if (response.status === 401) {
          return new Response(
            JSON.stringify({ error: "Invalid API key. Please check your GROQ_API_KEY secret." }),
            { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
          );
        }
      }
    } else if (GEMINI_API_KEY) {
      console.log("Using Gemini API (Groq not configured)...");
      const geminiResult = await callGeminiAPI(GEMINI_API_KEY, systemPrompt, userPrompt);
      response = geminiResult.response;
      usedProvider = geminiResult.provider;
    } else {
      throw new Error("No API keys configured");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${usedProvider} API error:`, response.status, errorText);
      throw new Error(`${usedProvider} API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    responseContent = extractContent(aiResponse, usedProvider);
    console.log(`Successfully got response from ${usedProvider}`);

    if (!responseContent) {
      throw new Error("No response from AI");
    }

    console.log("AI Response received, parsing...");

    // Parse the JSON response with robust cleaning
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Clean up control characters that break JSON parsing
        // Replace actual newlines inside string values with escaped newlines
        jsonString = jsonString
          .replace(/\r\n/g, '\\n')
          .replace(/\r/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t');
        
        // Try parsing the cleaned JSON
        try {
          result = JSON.parse(jsonString);
        } catch {
          // If still failing, try a more aggressive approach
          // Extract values manually using regex
          console.log("Standard parse failed, trying manual extraction...");
          
          const titleMatch = jsonString.match(/"optimizedTitle"\s*:\s*"([^"]+)"/);
          const metaMatch = jsonString.match(/"optimizedMetaDescription"\s*:\s*"([^"]+)"/);
          const changesMatch = jsonString.match(/"changes"\s*:\s*\[([\s\S]*?)\]/);
          
          // For content, extract everything between "optimizedContent": " and the next field
          const contentStartMatch = jsonString.match(/"optimizedContent"\s*:\s*"/);
          let extractedContent = responseContent; // fallback
          
          if (contentStartMatch) {
            const startIdx = jsonString.indexOf(contentStartMatch[0]) + contentStartMatch[0].length;
            // Find the end by looking for ","optimizedTitle" or similar patterns
            const endPatterns = [
              jsonString.indexOf('","optimizedTitle"', startIdx),
              jsonString.indexOf('",\\n"optimizedTitle"', startIdx),
              jsonString.indexOf('", "optimizedTitle"', startIdx)
            ].filter(idx => idx > startIdx);
            
            if (endPatterns.length > 0) {
              const endIdx = Math.min(...endPatterns);
              extractedContent = jsonString.substring(startIdx, endIdx)
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"');
            }
          }
          
          // Parse changes array
          let changes: string[] = ["Content was optimized"];
          if (changesMatch) {
            try {
              const changesStr = changesMatch[1].replace(/'/g, '"');
              const changeItems = changesStr.match(/"([^"]+)"/g);
              if (changeItems) {
                changes = changeItems.map((c: string) => c.replace(/"/g, ''));
              }
            } catch {
              // Keep default changes
            }
          }
          
          result = {
            optimizedContent: extractedContent,
            optimizedTitle: titleMatch ? titleMatch[1] : title,
            optimizedMetaDescription: metaMatch ? metaMatch[1] : (metaDescription || ""),
            changes: changes
          };
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error, using raw response:", parseError);
      // If parsing fails completely, return the raw content as optimized
      // Try to clean HTML from the response
      let cleanContent = responseContent;
      
      // If response starts with ``` or contains markdown, clean it
      if (responseContent.includes('```html')) {
        const htmlMatch = responseContent.match(/```html\s*([\s\S]*?)```/);
        if (htmlMatch) {
          cleanContent = htmlMatch[1].trim();
        }
      } else if (responseContent.includes('```')) {
        const codeMatch = responseContent.match(/```\s*([\s\S]*?)```/);
        if (codeMatch) {
          cleanContent = codeMatch[1].trim();
        }
      }
      
      result = {
        optimizedContent: cleanContent,
        optimizedTitle: title,
        optimizedMetaDescription: metaDescription || "",
        changes: ["Content was processed but response format was unexpected"]
      };
    }
    
    // Validate result has required fields
    if (!result.optimizedContent || typeof result.optimizedContent !== 'string') {
      result.optimizedContent = content; // Fallback to original
      result.changes = ["Optimization failed - using original content"];
    }
    if (!result.optimizedTitle) result.optimizedTitle = title;
    if (!result.optimizedMetaDescription) result.optimizedMetaDescription = metaDescription || "";
    if (!Array.isArray(result.changes)) result.changes = ["Content optimized"];
    
    console.log("Successfully parsed optimization result");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SEO Optimizer error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to optimize content"
      }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
