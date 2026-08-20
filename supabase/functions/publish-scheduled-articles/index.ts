import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse, requireAdminOrScheduledSecret } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const auth = await requireAdminOrScheduledSecret(req);
  if (auth instanceof Response) return auth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all scheduled articles where scheduled_at <= now
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled articles:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No articles to publish", published: 0 }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Update each scheduled article to published
    const publishedIds: string[] = [];
    const errors: string[] = [];

    for (const article of scheduledArticles) {
      const { data: updatedArticle, error: updateError } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", article.id)
        .eq("status", "scheduled")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError);
        errors.push(`${article.title}: ${updateError.message}`);
      } else if (updatedArticle) {
        publishedIds.push(article.id);
        console.log(`Published article: ${article.title}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Published ${publishedIds.length} articles`,
        published: publishedIds.length,
        publishedIds,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
