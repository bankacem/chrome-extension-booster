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
        <meta name="robots" content="noindex,follow"/>
        <title>XML Sitemap — ExtensionTo</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&amp;family=Outfit:wght@600;700;800&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet"/>
        <style>
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;padding:0;scroll-behavior:smooth}
          body{
            font-family:'DM Sans',system-ui,-apple-system,sans-serif;
            background:
              radial-gradient(ellipse 1400px 700px at 8% -5%, rgba(34,211,238,.15) 0%, transparent 55%),
              radial-gradient(ellipse 1000px 600px at 95% 8%, rgba(59,130,246,.12) 0%, transparent 55%),
              radial-gradient(ellipse 800px 400px at 50% 100%, rgba(99,102,241,.08) 0%, transparent 60%),
              #060a12;
            color:#dde6f3;min-height:100vh;line-height:1.6;
          }
          ::-webkit-scrollbar{width:6px;height:6px}
          ::-webkit-scrollbar-track{background:rgba(255,255,255,.03)}
          ::-webkit-scrollbar-thumb{background:rgba(148,184,255,.25);border-radius:3px}

          /* ── Layout ── */
          .wrap{max-width:1300px;margin:0 auto;padding:48px 24px 100px}

          /* ── Glass card ── */
          .glass{
            background:linear-gradient(160deg,rgba(255,255,255,.055) 0%,rgba(255,255,255,.018) 100%);
            border:1px solid rgba(148,184,255,.16);
            border-radius:22px;
            backdrop-filter:blur(18px);
            box-shadow:
              0 40px 100px -50px rgba(0,0,0,.7),
              0 0 0 1px rgba(255,255,255,.03) inset,
              0 1px 0 rgba(255,255,255,.07) inset;
          }

          /* ── Header ── */
          header.glass{
            padding:32px 40px;margin-bottom:20px;
            display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;
          }
          .brand{display:flex;align-items:center;gap:16px}
          .logo{
            width:50px;height:50px;border-radius:16px;
            display:grid;place-items:center;flex:none;
            background:linear-gradient(135deg,#22d3ee 0%,#3b82f6 60%,#6366f1 100%);
            color:#001018;font-family:'Outfit';font-weight:800;font-size:24px;
            box-shadow:0 12px 32px -8px rgba(34,211,238,.55),0 0 0 1px rgba(255,255,255,.12);
            letter-spacing:-.02em;
          }
          .brand-text h1{font-family:'Outfit';font-size:26px;letter-spacing:-.025em;margin:0;color:#fff;font-weight:700}
          .brand-text p{color:#64748b;font-size:13.5px;margin:3px 0 0;line-height:1.4}

          /* ── Stat chips ── */
          .stats{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
          .chip{
            padding:7px 14px;border-radius:999px;
            font-weight:600;font-size:13px;line-height:1;
            display:inline-flex;align-items:center;gap:6px;
          }
          .chip-cyan{background:rgba(34,211,238,.13);border:1px solid rgba(34,211,238,.34);color:#67e8f9}
          .chip-blue{background:rgba(59,130,246,.14);border:1px solid rgba(59,130,246,.35);color:#93c5fd}
          .chip-violet{background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.32);color:#c4b5fd}
          .chip-slate{background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.25);color:#94a3b8}
          .chip b{color:#fff}

          /* ── Controls bar ── */
          .controls{
            padding:18px 24px;margin-bottom:18px;
            display:flex;gap:12px;flex-wrap:wrap;align-items:center;
          }
          .search-wrap{
            flex:1;min-width:260px;max-width:480px;
            display:flex;align-items:center;gap:10px;
            padding:10px 16px;border-radius:14px;
            background:rgba(255,255,255,.045);border:1px solid rgba(148,184,255,.18);
            transition:border-color .2s;
          }
          .search-wrap:focus-within{border-color:rgba(34,211,238,.5)}
          .search-wrap svg{opacity:.5;flex:none;color:#94a3b8}
          .search-wrap input{
            flex:1;background:transparent;border:0;outline:0;
            color:#e6edf6;font:inherit;font-size:14px;
          }
          .search-wrap input::placeholder{color:#4b5563}

          .filter-group{display:flex;gap:6px;flex-wrap:wrap}
          .f-btn{
            padding:7px 14px;border-radius:10px;border:1px solid rgba(148,184,255,.18);
            background:rgba(255,255,255,.04);color:#94a3b8;
            font:inherit;font-size:13px;font-weight:500;cursor:pointer;
            transition:all .18s;
          }
          .f-btn:hover{background:rgba(34,211,238,.1);border-color:rgba(34,211,238,.35);color:#67e8f9}
          .f-btn.active{background:rgba(34,211,238,.18);border-color:rgba(34,211,238,.5);color:#22d3ee;font-weight:600}

          .count-badge{
            margin-left:auto;padding:6px 14px;border-radius:10px;
            background:rgba(255,255,255,.04);border:1px solid rgba(148,184,255,.12);
            color:#64748b;font-size:13px;white-space:nowrap;
          }
          .count-badge b{color:#94a3b8}

          /* ── Table ── */
          .tbl-wrap{overflow-x:auto;border-radius:18px}
          table{width:100%;border-collapse:separate;border-spacing:0;min-width:680px}
          thead th{
            background:rgba(255,255,255,.035);
            text-align:left;padding:13px 18px;
            font-size:11px;text-transform:uppercase;letter-spacing:.09em;
            color:#64748b;font-weight:700;
            border-bottom:1px solid rgba(148,184,255,.12);
            position:sticky;top:0;z-index:1;
          }
          thead th:first-child{border-radius:18px 0 0 0}
          thead th:last-child{border-radius:0 18px 0 0}
          thead th.sort-btn{cursor:pointer;user-select:none;transition:color .15s}
          thead th.sort-btn:hover{color:#94a3b8}
          thead th .sort-icon{opacity:.4;margin-left:4px;display:inline-block;transition:opacity .15s}
          thead th.sort-btn:hover .sort-icon{opacity:.7}

          tbody tr{transition:background .12s}
          tbody tr:nth-child(even){background:rgba(255,255,255,.012)}
          tbody tr:hover{background:rgba(34,211,238,.055)}
          tbody tr:last-child td{border-bottom:0}
          tbody td{
            padding:13px 18px;
            border-bottom:1px solid rgba(148,184,255,.07);
            font-size:13.5px;vertical-align:middle;
          }

          .url-cell{max-width:520px}
          .url-cell a{
            color:#67e8f9;text-decoration:none;
            font-family:'JetBrains Mono',monospace;font-size:12.5px;
            word-break:break-all;line-height:1.4;
            transition:color .12s;
          }
          .url-cell a:hover{color:#a5f3fc;text-decoration:underline}
          .url-path{opacity:.45;font-size:11.5px;display:block;margin-top:2px;font-family:'JetBrains Mono',monospace}

          /* ── Priority badges ── */
          .badge{
            display:inline-flex;align-items:center;gap:4px;
            padding:4px 11px;border-radius:999px;
            font-size:12px;font-weight:700;letter-spacing:.01em;white-space:nowrap;
          }
          .p-critical{background:rgba(34,211,238,.2);color:#22d3ee;border:1px solid rgba(34,211,238,.45)}
          .p-high{background:rgba(59,130,246,.18);color:#93c5fd;border:1px solid rgba(59,130,246,.4)}
          .p-mid{background:rgba(99,102,241,.16);color:#c4b5fd;border:1px solid rgba(99,102,241,.38)}
          .p-low{background:rgba(148,163,184,.12);color:#94a3b8;border:1px solid rgba(148,163,184,.28)}

          /* ── Freq / Date ── */
          .freq-cell{color:#6b7280;text-transform:capitalize;font-size:13px}
          .date-cell{
            color:#6b7280;font-variant-numeric:tabular-nums;
            white-space:nowrap;font-size:13px;
            font-family:'JetBrains Mono',monospace;
          }

          /* ── Empty state ── */
          .empty{
            text-align:center;padding:60px 24px;
            color:#4b5563;
          }
          .empty svg{opacity:.3;margin-bottom:12px}
          .empty p{font-size:15px;margin:0}

          /* ── Footer ── */
          footer{
            margin-top:24px;text-align:center;
            color:#374151;font-size:13px;
            display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;
          }
          footer a{color:#4b6a8a;text-decoration:none;transition:color .15s}
          footer a:hover{color:#67e8f9}
          .footer-dot{color:#1e2d3d}

          /* ── Responsive ── */
          @media(max-width:768px){
            .wrap{padding:20px 14px 60px}
            header.glass{padding:22px 20px}
            .brand-text h1{font-size:20px}
            .controls{padding:14px 16px;gap:10px}
            .search-wrap{min-width:100%;max-width:100%}
            thead th,tbody td{padding:11px 13px}
          }
        </style>
      </head>
      <body>
        <div class="wrap">

          <!-- ── Header ── -->
          <header class="glass">
            <div class="brand">
              <div class="logo">E</div>
              <div class="brand-text">
                <h1>XML Sitemap</h1>
                <p>Complete URL index · extensionto.com · W3C Schema 0.9</p>
              </div>
            </div>
            <div class="stats">
              <xsl:if test="sitemap:urlset">
                <span class="chip chip-cyan"><b><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></b> URLs indexed</span>
                <span class="chip chip-blue"><b><xsl:value-of select="count(sitemap:urlset/sitemap:url[sitemap:priority &gt;= 0.8])"/></b> High priority</span>
                <span class="chip chip-violet"><b><xsl:value-of select="count(sitemap:urlset/sitemap:url[sitemap:changefreq = 'daily' or sitemap:changefreq = 'weekly'])"/></b> Frequently updated</span>
              </xsl:if>
              <xsl:if test="sitemap:sitemapindex">
                <span class="chip chip-cyan"><b><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></b> Sitemaps</span>
              </xsl:if>
              <span class="chip chip-slate">Schema 0.9</span>
            </div>
          </header>

          <!-- ── Controls ── -->
          <div class="glass controls">
            <label class="search-wrap" for="q">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input id="q" type="search" placeholder="Filter by URL, priority, frequency…" autocomplete="off" spellcheck="false"/>
            </label>
            <div class="filter-group" id="pfilter">
              <button class="f-btn active" data-p="all">All</button>
              <button class="f-btn" data-p="1.0">1.0 Critical</button>
              <button class="f-btn" data-p="0.9">0.9 High</button>
              <button class="f-btn" data-p="0.8">0.8 Standard</button>
              <button class="f-btn" data-p="low">≤ 0.7 Low</button>
            </div>
            <div class="count-badge" id="rowcount"><b>–</b> results</div>
          </div>

          <!-- ── Table ── -->
          <div class="glass" style="overflow:hidden">
            <div class="tbl-wrap">

              <!-- Sitemap index -->
              <xsl:if test="sitemap:sitemapindex">
                <table>
                  <thead>
                    <tr>
                      <th>Sitemap URL</th>
                      <th>Last modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                      <tr>
                        <td class="url-cell"><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                        <td class="date-cell"><xsl:value-of select="sitemap:lastmod"/></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </xsl:if>

              <!-- URL set -->
              <xsl:if test="sitemap:urlset">
                <table id="sitemap-table">
                  <thead>
                    <tr>
                      <th style="width:55%">URL</th>
                      <th style="width:10%;text-align:center">Priority</th>
                      <th style="width:13%">Frequency</th>
                      <th style="width:15%">Last modified</th>
                    </tr>
                  </thead>
                  <tbody id="sitemap-body">
                    <xsl:for-each select="sitemap:urlset/sitemap:url">
                      <tr>
                        <td class="url-cell">
                          <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                        </td>
                        <td style="text-align:center">
                          <xsl:choose>
                            <xsl:when test="sitemap:priority = 1.0 or sitemap:priority = '1.0'">
                              <span class="badge p-critical">1.0</span>
                            </xsl:when>
                            <xsl:when test="sitemap:priority &gt;= 0.9">
                              <span class="badge p-high"><xsl:value-of select="sitemap:priority"/></span>
                            </xsl:when>
                            <xsl:when test="sitemap:priority &gt;= 0.7">
                              <span class="badge p-mid"><xsl:value-of select="sitemap:priority"/></span>
                            </xsl:when>
                            <xsl:otherwise>
                              <span class="badge p-low"><xsl:value-of select="sitemap:priority"/></span>
                            </xsl:otherwise>
                          </xsl:choose>
                        </td>
                        <td class="freq-cell"><xsl:value-of select="sitemap:changefreq"/></td>
                        <td class="date-cell"><xsl:value-of select="sitemap:lastmod"/></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
                <div class="empty" id="no-results" style="display:none">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6M11 8v6"/></svg>
                  <p>No URLs match your filter.</p>
                </div>
              </xsl:if>

            </div>
          </div>

          <footer>
            <span>Generated by <a href="https://extensionto.com">ExtensionTo</a></span>
            <span class="footer-dot">·</span>
            <span>Spec: <a href="https://sitemaps.org/protocol.html">sitemaps.org/protocol</a></span>
            <span class="footer-dot">·</span>
            <span>Submit via <a href="https://search.google.com/search-console">Google Search Console</a></span>
            <span class="footer-dot">·</span>
            <span><a href="https://extensionto.com/sitemap.xml">View raw XML</a></span>
          </footer>
        </div>

        <script>
        (function(){
          var rows = Array.from(document.querySelectorAll('#sitemap-body tr'));
          var countEl = document.getElementById('rowcount');
          var noRes = document.getElementById('no-results');
          var qEl = document.getElementById('q');
          var activeP = 'all';

          function priority(row) {
            var badge = row.querySelector('.badge');
            return badge ? badge.textContent.trim() : '';
          }

          function matchesP(row) {
            if (activeP === 'all') return true;
            var p = priority(row);
            if (activeP === 'low') return parseFloat(p) <= 0.7;
            return p === activeP;
          }

          function applyFilters() {
            var q = qEl.value.toLowerCase();
            var visible = 0;
            rows.forEach(function(r) {
              var text = r.textContent.toLowerCase();
              var show = (q === '' || text.indexOf(q) > -1) && matchesP(r);
              r.style.display = show ? '' : 'none';
              if (show) visible++;
            });
            countEl.innerHTML = '<b>' + visible + '</b> results';
            if (noRes) noRes.style.display = visible === 0 ? '' : 'none';
          }

          // Initial count
          countEl.innerHTML = '<b>' + rows.length + '</b> results';

          // Search input
          qEl.addEventListener('input', applyFilters);

          // Priority filter buttons
          document.getElementById('pfilter').addEventListener('click', function(e) {
            var btn = e.target.closest('.f-btn');
            if (!btn) return;
            document.querySelectorAll('.f-btn').forEach(function(b){ b.classList.remove('active'); });
            btn.classList.add('active');
            activeP = btn.getAttribute('data-p');
            applyFilters();
          });

          // Keyboard shortcut: / to focus search
          document.addEventListener('keydown', function(e) {
            if (e.key === '/' &amp;&amp; document.activeElement !== qEl) {
              e.preventDefault();
              qEl.focus();
            }
            if (e.key === 'Escape') { qEl.value = ''; applyFilters(); }
          });
        })();
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
