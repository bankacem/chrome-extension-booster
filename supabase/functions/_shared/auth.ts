import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = new Set([
  "https://extensionto.com",
  "https://www.extensionto.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://extensionto.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scheduled-publish-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export type AdminAuth = {
  user: User;
};

export async function requireAdmin(req: Request): Promise<AdminAuth | Response> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(req, { error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !publishableKey) {
    console.error("Supabase auth configuration is incomplete");
    return jsonResponse(req, { error: "Authentication is unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(req, { error: "Invalid or expired session" }, 401);
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError) {
    console.error("Admin role lookup failed:", roleError.message);
    return jsonResponse(req, { error: "Unable to verify administrator role" }, 503);
  }

  if (role?.role !== "admin") {
    return jsonResponse(req, { error: "Administrator role required" }, 403);
  }

  return { user: userData.user };
}

export async function requireAdminOrScheduledSecret(req: Request): Promise<AdminAuth | Response> {
  const configuredSecret = Deno.env.get("SCHEDULED_PUBLISH_SECRET");
  const suppliedSecret = req.headers.get("x-scheduled-publish-secret");
  if (configuredSecret && suppliedSecret && suppliedSecret === configuredSecret) {
    return { user: { id: "scheduled-job", aud: "service", role: "service", email: "scheduled-job@internal" } as User };
  }
  return requireAdmin(req);
}
