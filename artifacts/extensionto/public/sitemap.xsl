<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" version="5.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>XML Sitemap - ExtensionTo</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #070c15;
            color: #cbd5e1;
            min-height: 100vh;
            padding: 40px 20px 80px;
          }
          .wrap { max-width: 1100px; margin: 0 auto; }
          header {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(148,184,255,0.15);
            border-radius: 16px;
            padding: 28px 32px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
          }
          .brand { display: flex; align-items: center; gap: 14px; }
          .logo {
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, #22d3ee, #3b82f6);
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 20px; color: #001018;
            flex-shrink: 0;
          }
          h1 { font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.02em; }
          .sub { font-size: 13px; color: #64748b; margin-top: 3px; }
          .badge {
            padding: 6px 14px; border-radius: 999px;
            background: rgba(34,211,238,0.12);
            border: 1px solid rgba(34,211,238,0.3);
            color: #67e8f9; font-size: 13px; font-weight: 600;
          }
          .badge b { color: #fff; }
          .card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(148,184,255,0.12);
            border-radius: 16px;
            overflow: hidden;
          }
          table { width: 100%; border-collapse: collapse; }
          thead th {
            background: rgba(255,255,255,0.04);
            text-align: left;
            padding: 12px 18px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
            font-weight: 700;
            border-bottom: 1px solid rgba(148,184,255,0.1);
          }
          tbody tr:nth-child(even) { background: rgba(255,255,255,0.01); }
          tbody tr:hover { background: rgba(34,211,238,0.05); }
          tbody td {
            padding: 11px 18px;
            border-bottom: 1px solid rgba(148,184,255,0.07);
            font-size: 13px;
            vertical-align: middle;
          }
          tbody tr:last-child td { border-bottom: none; }
          td.url a {
            color: #67e8f9;
            text-decoration: none;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
          }
          td.url a:hover { text-decoration: underline; color: #a5f3fc; }
          td.pri { text-align: center; }
          .p1 { color: #22d3ee; font-weight: 700; }
          .p09 { color: #60a5fa; font-weight: 600; }
          .p07 { color: #a78bfa; font-weight: 600; }
          .plo { color: #94a3b8; }
          td.freq { color: #94a3b8; text-transform: capitalize; }
          td.date { color: #64748b; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12px; }
          footer { text-align: center; margin-top: 20px; color: #374151; font-size: 12px; }
          footer a { color: #4b6a8a; }
        </style>
      </head>
      <body>
        <div class="wrap">

          <header>
            <div class="brand">
              <div class="logo">E</div>
              <div>
                <h1>XML Sitemap</h1>
                <p class="sub">extensionto.com - Sitemaps Protocol 0.9</p>
              </div>
            </div>
            <xsl:if test="sm:urlset">
              <span class="badge">
                <b><xsl:value-of select="count(sm:urlset/sm:url)"/></b>
                <xsl:text> URLs indexed</xsl:text>
              </span>
            </xsl:if>
            <xsl:if test="sm:sitemapindex">
              <span class="badge">
                <b><xsl:value-of select="count(sm:sitemapindex/sm:sitemap)"/></b>
                <xsl:text> Sitemaps</xsl:text>
              </span>
            </xsl:if>
          </header>

          <div class="card">

            <xsl:if test="sm:sitemapindex">
              <table>
                <thead>
                  <tr>
                    <th>Sitemap</th>
                    <th>Last Modified</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sm:sitemapindex/sm:sitemap">
                    <tr>
                      <td class="url">
                        <a href="{sm:loc}">
                          <xsl:value-of select="sm:loc"/>
                        </a>
                      </td>
                      <td class="date">
                        <xsl:value-of select="sm:lastmod"/>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>

            <xsl:if test="sm:urlset">
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Priority</th>
                    <th>Frequency</th>
                    <th>Last Modified</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sm:urlset/sm:url">
                    <tr>
                      <td class="url">
                        <a href="{sm:loc}">
                          <xsl:value-of select="sm:loc"/>
                        </a>
                      </td>
                      <td class="pri">
                        <xsl:choose>
                          <xsl:when test="sm:priority = '1.0'">
                            <span class="p1"><xsl:value-of select="sm:priority"/></span>
                          </xsl:when>
                          <xsl:when test="sm:priority &gt;= 0.9">
                            <span class="p09"><xsl:value-of select="sm:priority"/></span>
                          </xsl:when>
                          <xsl:when test="sm:priority &gt;= 0.7">
                            <span class="p07"><xsl:value-of select="sm:priority"/></span>
                          </xsl:when>
                          <xsl:otherwise>
                            <span class="plo"><xsl:value-of select="sm:priority"/></span>
                          </xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="freq">
                        <xsl:value-of select="sm:changefreq"/>
                      </td>
                      <td class="date">
                        <xsl:value-of select="sm:lastmod"/>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>

          </div>

          <footer>
            <xsl:text>Generated by </xsl:text>
            <a href="https://extensionto.com">extensionto.com</a>
            <xsl:text> - </xsl:text>
            <a href="https://sitemaps.org/protocol.html">Sitemaps Protocol</a>
          </footer>

        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
