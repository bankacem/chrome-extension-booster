// SEO Agent Pro — multi-step pipeline using Lovable AI Gateway.
// Mirrors the Python agent: competitor analysis → strategy → article → CTR.
// Persists insights to seo_agent_memory for continuous learning.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  jsonMode = false,
): Promise<string> {
  const body: any = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add funds in Settings → Workspace → Usage.");
    throw new Error(`AI gateway error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function safeJSON<T = any>(text: string, fallback: T): T {
  try {
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : text);
  } catch {
    return fallback;
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const {
      keyword,
      niche = "",
      model = "google/gemini-3-flash-preview",
      category = "General",
    } = await req.json();

    if (!keyword) throw new Error("keyword is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Pull recent learnings to inform the strategy step (continuous learning).
    const { data: memoryRows } = await supabase
      .from("seo_agent_memory")
      .select("keyword, strategy, ctr, word_count")
      .order("created_at", { ascending: false })
      .limit(10);

    const learningsContext = memoryRows?.length
      ? `Past successful patterns from prior runs:\n${JSON.stringify(memoryRows, null, 2)}`
      : "No prior memory yet.";

    // 1. Competitor analysis
    const competitorRaw = await callAI(
      apiKey,
      model,
      "You are a senior SEO analyst. Analyze top-ranking content patterns.",
      `Analyze the competitive landscape for: "${keyword}".
Return JSON:
{
 "common_sections": [], "missing_gaps": [],
 "content_length_avg": "", "seo_patterns": [],
 "weaknesses": [], "why_they_rank": ""
}`,
      true,
    );
    const competitor = safeJSON(competitorRaw, {});

    // 2. Strategy decision (uses memory)
    const strategyRaw = await callAI(
      apiKey,
      model,
      "You are an SEO content strategist who learns from past wins.",
      `Keyword: "${keyword}"
Niche: ${niche}
Competitor data:
${JSON.stringify(competitor)}

${learningsContext}

Return JSON:
{
 "ideal_length": 1800,
 "required_sections": [],
 "must_have_elements": [],
 "unique_angle": "",
 "strategy": "aggressive|strategic",
 "reasoning": ""
}`,
      true,
    );
    const strategy = safeJSON<any>(strategyRaw, { ideal_length: 1800 });

    // 3. Article writer
    const article = await callAI(
      apiKey,
      model,
      "You are a professional SEO writer. Write clear, human, engaging English. Prioritize Information Gain.",
      `Write a high-ranking SEO article for: "${keyword}".

Specs:
- Target length: ${strategy.ideal_length || 1800} words
- Unique angle: ${strategy.unique_angle || ""}
- Required H2s: ${(strategy.required_sections || []).join(", ")}
- Must include: ${(strategy.must_have_elements || []).join(", ")}

Return ONLY the article in clean HTML (no markdown). Structure:
<h1>...</h1>
<p>strong 3-paragraph intro</p>
<h2>...</h2><p>...</p>
... (use <table>, <ul>, <ol> when useful)
<h2>Frequently Asked Questions</h2>
<h3>Q?</h3><p>A...</p>
<h2>Conclusion</h2><p>...</p>

Rules: keyword in first 100 words, density 1-2%, real data/examples, conversational tone, include insights competitors miss.`,
    );

    // 4. CTR optimization
    const ctrRaw = await callAI(
      apiKey,
      model,
      "You are a search CTR specialist.",
      `Keyword: "${keyword}"
Article opening:
${article.slice(0, 600)}

Return JSON:
{
 "titles": [], "descriptions": [],
 "recommended_title": "", "recommended_description": ""
}
Title <= 60 chars, description <= 155 chars, include keyword.`,
      true,
    );
    const ctr = safeJSON<any>(ctrRaw, {});

    const title = ctr.recommended_title || keyword;
    const meta = ctr.recommended_description || "";
    const wordCount = article.split(/\s+/).length;
    const slug = slugify(title || keyword);
    const excerpt = article.replace(/<[^>]+>/g, "").slice(0, 200);

    // Persist to memory for continuous learning
    await supabase.from("seo_agent_memory").insert({
      keyword,
      niche,
      model,
      strategy,
      competitor_data: competitor,
      ctr,
      word_count: wordCount,
      successful_patterns: {
        unique_angle: strategy.unique_angle,
        sections: strategy.required_sections,
      },
    });

    return new Response(
      JSON.stringify({
        title,
        content: article,
        excerpt,
        slug,
        readTime: Math.max(1, Math.round(wordCount / 200)),
        wordCount,
        meta_description: meta,
        keywords: [keyword, ...(strategy.required_sections || []).slice(0, 5)],
        category,
        strategy,
        competitor,
        ctr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("seo-agent-pro error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
