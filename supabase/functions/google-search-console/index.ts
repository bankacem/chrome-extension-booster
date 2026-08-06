import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchConsoleData {
  position: number;
  ctr: number;
  clicks: number;
  impressions: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

// ── Service-account JWT assertion flow ───────────────────────────────
// Search Console read access needs the 'webmasters.readonly' scope.
// A raw OAuth access token (the old approach here) expires in ~1 hour,
// which makes it useless as a static secret for a function that might be
// called anytime. A service-account private key is long-lived instead —
// this signs a short-lived JWT assertion per-request and exchanges it for
// a fresh access token every time, so nothing here ever goes stale.
async function getAccessTokenFromServiceAccount(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: key.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${b64url(header)}.${b64url(claimSet)}`;

  // PEM -> CryptoKey
  const pemBody = key.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${unsigned}.${sigB64}`;

  const tokenRes = await fetch(key.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    throw new Error(`Token exchange failed (${tokenRes.status}): ${detail.slice(0, 300)}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleSlug, domain } = await req.json();

    // Preferred: a long-lived service-account key (GOOGLE_SERVICE_ACCOUNT_JSON,
    // the full JSON key content as a single env var). Falls back to a raw
    // short-lived access token (GOOGLE_OAUTH_ACCESS_TOKEN) for backward
    // compatibility only — that one WILL go stale within an hour.
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const staticAccessToken = Deno.env.get('GOOGLE_OAUTH_ACCESS_TOKEN');

    let accessToken: string | null = null;
    let authError: string | null = null;

    if (serviceAccountJson) {
      try {
        const key: ServiceAccountKey = JSON.parse(serviceAccountJson);
        accessToken = await getAccessTokenFromServiceAccount(key);
      } catch (e) {
        authError = `Service account auth failed: ${e instanceof Error ? e.message : String(e)}`;
        console.error(authError);
      }
    } else if (staticAccessToken) {
      accessToken = staticAccessToken;
    }

    if (accessToken) {
      try {
        const siteUrl = `sc-domain:${domain || 'extensionto.com'}`;
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const body: Record<string, unknown> = {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 25,
        };
        if (articleSlug) {
          body.dimensionFilterGroups = [{
            filters: [{ dimension: 'page', operator: 'contains', expression: articleSlug }],
          }];
        }

        const response = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rows = data.rows || [];

          const totalClicks = rows.reduce((sum: number, row: any) => sum + row.clicks, 0);
          const totalImpressions = rows.reduce((sum: number, row: any) => sum + row.impressions, 0);
          const avgPosition = rows.length > 0
            ? rows.reduce((sum: number, row: any) => sum + row.position, 0) / rows.length
            : 0;
          const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

          const result: SearchConsoleData = {
            position: Math.round(avgPosition * 10) / 10,
            ctr: Math.round(avgCtr * 100) / 100,
            clicks: totalClicks,
            impressions: totalImpressions,
            topQueries: rows.slice(0, 10).map((row: any) => ({
              query: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              position: Math.round(row.position * 10) / 10,
            })),
          };

          return new Response(JSON.stringify({
            success: true,
            data: result,
            source: 'google_api',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const detail = await response.text();
          authError = `Search Console API returned ${response.status}: ${detail.slice(0, 300)}. ` +
            `If this is a 403, the service account email likely hasn't been added as a user in ` +
            `Search Console (Settings -> Users and permissions) for this property yet.`;
          console.error(authError);
        }
      } catch (apiError) {
        authError = `Search Console request failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
        console.error(authError);
      }
    }

    // No credentials configured, or the real call failed — be honest about
    // it instead of returning plausible-looking random numbers. A previous
    // version of this function returned Math.random()-generated position/
    // clicks/impressions here, indistinguishable from real data at a glance.
    // That's a serious problem for a metrics endpoint: it can silently drive
    // real decisions off fake numbers. Fail honestly instead, always.
    return new Response(JSON.stringify({
      success: false,
      data: null,
      source: 'unavailable',
      reason: authError ||
        'No Search Console credentials configured (set GOOGLE_SERVICE_ACCOUNT_JSON). ' +
        'This endpoint will not return simulated/fake numbers.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
