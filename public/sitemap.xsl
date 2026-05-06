<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>XML Sitemap — ExtensionTo</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&amp;family=Outfit:wght@600;700;800&amp;display=swap" rel="stylesheet"/>
        <style>
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;padding:0}
          body{
            font-family:'DM Sans',system-ui,-apple-system,sans-serif;
            background:radial-gradient(1200px 600px at 10% -10%,rgba(34,211,238,.18),transparent 60%),radial-gradient(900px 500px at 100% 10%,rgba(59,130,246,.12),transparent 60%),#070b14;
            color:#e6edf6;min-height:100vh;line-height:1.55;
          }
          .wrap{max-width:1200px;margin:0 auto;padding:48px 24px 80px}
          .glass{
            background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));
            border:1px solid rgba(148,184,255,.14);
            border-radius:20px;backdrop-filter:blur(14px);
            box-shadow:0 30px 80px -40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);
          }
          header.glass{padding:32px 36px;margin-bottom:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px}
          .brand{display:flex;align-items:center;gap:14px}
          .logo{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#001018;font-family:'Outfit';font-weight:800;font-size:22px;box-shadow:0 10px 28px -8px rgba(34,211,238,.6)}
          h1{font-family:'Outfit';font-size:28px;letter-spacing:-.02em;margin:0;color:#fff}
          .sub{color:#94a3b8;font-size:14px;margin-top:4px}
          .stats{display:flex;gap:10px;flex-wrap:wrap}
          .chip{padding:8px 14px;border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.32);color:#67e8f9;font-weight:600;font-size:13px}
          .chip b{color:#fff;margin-right:6px}
          .controls{padding:18px 22px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
          .search{flex:1;min-width:260px;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(148,184,255,.16)}
          .search input{flex:1;background:transparent;border:0;outline:0;color:#e6edf6;font:inherit;font-size:14px}
          .search svg{opacity:.6;flex:none}
          table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:18px}
          thead th{background:rgba(255,255,255,.04);text-align:left;padding:14px 18px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;border-bottom:1px solid rgba(148,184,255,.14)}
          tbody td{padding:14px 18px;border-bottom:1px solid rgba(148,184,255,.08);font-size:14px;vertical-align:middle}
          tbody tr:nth-child(even){background:rgba(255,255,255,.015)}
          tbody tr:hover{background:rgba(34,211,238,.06)}
          tbody tr:last-child td{border-bottom:0}
          a{color:#67e8f9;text-decoration:none;word-break:break-all}
          a:hover{color:#a5f3fc;text-decoration:underline}
          .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
          .p-high{background:rgba(34,211,238,.18);color:#67e8f9;border:1px solid rgba(34,211,238,.35)}
          .p-mid{background:rgba(99,102,241,.16);color:#c7d2fe;border:1px solid rgba(99,102,241,.35)}
          .p-low{background:rgba(148,163,184,.14);color:#cbd5e1;border:1px solid rgba(148,163,184,.3)}
          .freq{color:#cbd5e1;text-transform:capitalize}
          .date{color:#94a3b8;font-variant-numeric:tabular-nums;white-space:nowrap}
          footer{margin-top:24px;text-align:center;color:#64748b;font-size:13px}
          footer a{color:#67e8f9}
          @media(max-width:720px){
            .wrap{padding:24px 14px 60px}
            header.glass{padding:22px}
            h1{font-size:22px}
            thead th,tbody td{padding:11px 12px;font-size:13px}
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header class="glass">
            <div class="brand">
              <div class="logo">E</div>
              <div>
                <h1>XML Sitemap</h1>
                <div class="sub">Live index of every page on extensionto.com — generated for search engines.</div>
              </div>
            </div>
            <div class="stats">
              <xsl:if test="sitemap:urlset">
                <span class="chip"><b><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></b> URLs</span>
              </xsl:if>
              <xsl:if test="sitemap:sitemapindex">
                <span class="chip"><b><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></b> Sitemaps</span>
              </xsl:if>
              <span class="chip">Schema 0.9</span>
            </div>
          </header>

          <div class="glass controls">
            <label class="search" for="q">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input id="q" type="search" placeholder="Filter URLs…" oninput="(function(v){document.querySelectorAll('tbody tr').forEach(function(r){r.style.display=r.innerText.toLowerCase().indexOf(v.toLowerCase())>-1?'':'none'})})(this.value)"/>
            </label>
          </div>

          <div class="glass" style="overflow:hidden">
            <xsl:if test="sitemap:sitemapindex">
              <table>
                <thead><tr><th>Sitemap</th><th>Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                      <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                      <td class="date"><xsl:value-of select="sitemap:lastmod"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>

            <xsl:if test="sitemap:urlset">
              <table>
                <thead>
                  <tr><th>URL</th><th>Priority</th><th>Frequency</th><th>Last modified</th></tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                      <td>
                        <xsl:choose>
                          <xsl:when test="sitemap:priority &gt;= 0.8"><span class="badge p-high"><xsl:value-of select="sitemap:priority"/></span></xsl:when>
                          <xsl:when test="sitemap:priority &gt;= 0.5"><span class="badge p-mid"><xsl:value-of select="sitemap:priority"/></span></xsl:when>
                          <xsl:otherwise><span class="badge p-low"><xsl:value-of select="sitemap:priority"/></span></xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="freq"><xsl:value-of select="sitemap:changefreq"/></td>
                      <td class="date"><xsl:value-of select="sitemap:lastmod"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>
          </div>

          <footer>Generated by <a href="https://extensionto.com">ExtensionTo</a> · Spec at <a href="https://sitemaps.org">sitemaps.org</a></footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
