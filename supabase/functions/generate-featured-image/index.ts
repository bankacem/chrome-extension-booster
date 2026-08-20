import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Category color themes for varied image styles
const CATEGORY_THEMES: Record<string, string> = {
  "Performance & Memory": "blue and cyan technology themed",
  "Ad Blocking": "green and teal shield/protection themed",
  "Privacy & Security": "dark purple and indigo security themed",
  "Screenshot Tools": "orange and amber camera/capture themed",
  "Media & Downloads": "red and pink media/entertainment themed",
  "Redirect & Navigation": "emerald and green navigation themed",
  "Appearance & Themes": "violet and magenta design themed",
  "Productivity & Tools": "sky blue and white productivity themed",
  "Security & Privacy": "dark blue and gold security themed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId, title, category, slug } = await req.json();

    if (!articleId || !title) {
      return new Response(
        JSON.stringify({ error: "articleId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a theme based on category
    const theme = CATEGORY_THEMES[category || ""] || "modern blue technology themed";

    // Shorten title for image prompt if too long
    const shortTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;

    const prompt = `Create a professional blog featured image for an article titled "${shortTitle}". 
The image should be ${theme} with a clean, modern design. 
Include the article title "${shortTitle}" as large, bold, legible white text centered on the image.
Use a gradient or abstract geometric background. The text must be clearly readable.
Style: professional tech blog header image, 16:9 aspect ratio feel, no stock photo people.
Make the text the PRIMARY focus - it should be large and impossible to miss.`;

    // Call Lovable AI Gateway for image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "No image generated from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(
        JSON.stringify({ error: "Invalid image data format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageFormat = base64Match[1]; // png, jpeg, webp etc.
    const base64Data = base64Match[2];
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const fileName = `featured/${slug || articleId}.webp`;
    
    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(fileName, imageBytes, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("article-images")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update article in database
    const { error: updateError } = await supabase
      .from("articles")
      .update({ featured_image: publicUrl })
      .eq("id", articleId);

    if (updateError) {
      console.error("DB update error:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        articleId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
