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

// Note: Google Search Console API requires OAuth 2.0, not just an API key
// This function currently returns simulated data based on article metrics
// To use real data, you need to set up OAuth 2.0 authentication
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleUrl, articleSlug, domain } = await req.json();
    
    // Check if OAuth tokens are configured
    const accessToken = Deno.env.get('GOOGLE_OAUTH_ACCESS_TOKEN');
    
    if (accessToken) {
      // Real API call with OAuth token
      try {
        const siteUrl = `sc-domain:${domain || 'extensionto.com'}`;
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions: ['query'],
              dimensionFilterGroups: [{
                filters: [{
                  dimension: 'page',
                  operator: 'contains',
                  expression: articleSlug
                }]
              }],
              rowLimit: 10
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rows = data.rows || [];
          
          // Calculate aggregates
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
            topQueries: rows.slice(0, 5).map((row: any) => ({
              query: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              position: Math.round(row.position * 10) / 10
            }))
          };

          return new Response(JSON.stringify({ 
            success: true, 
            data: result,
            source: 'google_api'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (apiError) {
        console.error('Google API error:', apiError);
        // Fall through to simulated data
      }
    }

    // Return simulated data with clear indication
    // This simulates realistic data based on common SEO patterns
    const simulatedData: SearchConsoleData = {
      position: Math.floor(Math.random() * 50) + 1,
      ctr: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      clicks: Math.floor(Math.random() * 200) + 10,
      impressions: Math.floor(Math.random() * 5000) + 100,
      topQueries: [
        { query: `${articleSlug?.replace(/-/g, ' ')} guide`, clicks: Math.floor(Math.random() * 50), impressions: Math.floor(Math.random() * 500), position: Math.random() * 20 + 1 },
        { query: `best ${articleSlug?.split('-')[0]} extension`, clicks: Math.floor(Math.random() * 30), impressions: Math.floor(Math.random() * 300), position: Math.random() * 30 + 5 },
        { query: `${articleSlug?.split('-')[0]} chrome`, clicks: Math.floor(Math.random() * 25), impressions: Math.floor(Math.random() * 250), position: Math.random() * 25 + 3 },
      ]
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: simulatedData,
      source: 'simulated',
      note: 'To get real data, configure GOOGLE_OAUTH_ACCESS_TOKEN with OAuth 2.0'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
