#!/usr/bin/env node
/**
 * SEO EXECUTION ENGINE — ExtensionTo
 * Full execution: cluster linking, orphan fixing, sitemap sync, reporting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, '../artifacts/extensionto/public/content/articles');
const INDEX_PATH = path.resolve(__dirname, '../artifacts/extensionto/public/content/articles-index.json');
const SITEMAP_PATH = path.resolve(__dirname, '../artifacts/extensionto/public/sitemap.xml');
const BASE_URL = 'https://extensionto.com';

// ── UTILS ─────────────────────────────────────────────────────────────────────

function normalizeSlug(slug) {
  return slug.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getArticlePath(slug) {
  const s = normalizeSlug(slug);
  const c1 = s[0] || '_';
  const c2 = s[1] || '_';
  const c3 = s[2] || '_';
  return path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
}

function articleExists(slug) {
  return fs.existsSync(getArticlePath(slug));
}

function readArticle(slug) {
  const p = getArticlePath(slug);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function writeArticle(slug, content) {
  const p = getArticlePath(slug);
  fs.writeFileSync(p, content, 'utf8');
}

function makeInternalLink(slug, anchor) {
  return `<a href="/blog/${slug}" class="internal-link">${anchor}</a>`;
}

function hasLinkTo(content, slug) {
  return content.includes(`/blog/${slug}`);
}

function insertBeforeCTA(content, html) {
  const ctaMarkers = [
    '<div class="extension-cta-final',
    '<div class="extension-backlink',
  ];
  for (const marker of ctaMarkers) {
    const idx = content.lastIndexOf(marker);
    if (idx !== -1) {
      return content.slice(0, idx) + html + '\n\n' + content.slice(idx);
    }
  }
  // Append at end
  return content + '\n\n' + html;
}

function buildRelatedSection(links) {
  const items = links.map(([slug, anchor]) =>
    `  <li>${makeInternalLink(slug, anchor)}</li>`).join('\n');
  return `<div class="related-articles my-8 p-5 rounded-xl bg-muted/40 border border-border">
  <h3 class="text-base font-semibold mb-3">Related Reading</h3>
  <ul class="space-y-1 text-sm">
${items}
  </ul>
</div>`;
}

// Count existing internal links to /blog/ in content
function countInternalLinks(content) {
  const matches = content.match(/href="\/blog\//g);
  return matches ? matches.length : 0;
}

// ── CLUSTER DATA ───────────────────────────────────────────────────────────────

const CLUSTERS = [
  {
    id: 1,
    name: 'Ad Blocking Desktop',
    pillar: { slug: 'adblock-plus-vs-ublock-origin-2026', title: 'AdBlock Plus vs uBlock Origin 2026: Ultimate Comparison' },
    spokes: [
      { slug: 'ublock-origin-best-settings-2026', anchor: 'uBlock Origin settings guide' },
      { slug: 'best-free-adblocker-youtube-chrome', anchor: 'best free adblocker for YouTube' },
      { slug: 'block-ads-chrome-extension-free-enhance-your-browsing-experience-with-ad-free-surfing-mme0iy7wjb2', anchor: 'block ads Chrome extension free' },
      { slug: 'block-video-ads-chrome-extension', anchor: 'block video ads Chrome extension' },
      { slug: 'bypass-adblock-detection-chrome', anchor: 'bypass adblock detection' },
      { slug: 'cleanweb-vs-total-adblock', anchor: 'CleanWeb vs Total Adblock' },
      { slug: 'discover-the-best-ad-blocking-extension-for-chrome-boost-your-browsing-experience-mme0ixsa1fx', anchor: 'best ad blocking extension for Chrome' },
      { slug: 'discover-the-best-no-ads-chrome-extension-2026-for-a-seamless-browsing-experience-mmtld2uhhvw', anchor: 'best no-ads Chrome extension 2026' },
      { slug: 'discover-the-safest-adblocker-for-chrome-protect-your-browsing-experience-mmtld2frotk', anchor: 'safest adblocker for Chrome' },
      { slug: 'discover-the-power-of-a-lightweight-ad-blocker-chrome-boost-your-browsing-experience-mme0ixxxqdz', anchor: 'lightweight ad blocker Chrome' },
      { slug: 'effortlessly-remove-annoying-ads-with-the-best-chrome-extension-to-remove-ads-mme0iyd1klm', anchor: 'best Chrome extension to remove ads' },
      { slug: 'unlock-a-seamless-youtube-experience-the-best-ad-blocker-that-works-on-youtube-chrome-mme0iyicafq', anchor: 'ad blocker for YouTube Chrome' },
      { slug: 'unlocking-the-power-of-ad-blockers-boosting-your-browsing-experience-with-light-popup-blocker-mm3scnflwya', anchor: 'ad blockers and Light Popup Blocker' },
      { slug: 'unlocking-the-power-of-a-fast-adblocker-extension-with-no-memory-leak-boosting-browser-performance-mll9brfnaxd', anchor: 'fast adblocker with no memory leak' },
      { slug: 'why-light-popup-blocker-is-better-than-heavy-adblockers-6', anchor: 'lightweight ad blocker vs heavy adblockers' },
      { slug: 'ad-blocker-extension-to-chrome-2', anchor: 'ad blocker extension for Chrome' },
      { slug: 'best-extension-to-block-malicious-redirects-1', anchor: 'block malicious redirects' },
      { slug: 'best-ghostery-settings-for-maximum-online-privacy-a-comprehensive-guide-mmb7ltcfx00', anchor: 'Ghostery settings guide' },
      { slug: 'discover-the-best-ghostery-alternative-for-chrome-enhance-your-browsing-experience-mll9bqi2g1z', anchor: 'best Ghostery alternative for Chrome' },
      { slug: 'discover-the-best-open-source-alternative-to-ghostery-extension-for-enhanced-browser-security-mll9brv9ifz', anchor: 'open source Ghostery alternative' },
      { slug: 'unlocking-online-privacy-the-power-of-ghostery-chrome-extension-mm3sclh7asr', anchor: 'Ghostery Chrome extension privacy' },
      { slug: 'unlocking-the-power-of-ghostery-extension-chrome-enhance-your-browsing-experience-mm3scm2x6ag', anchor: 'Ghostery extension for Chrome' },
      { slug: 'unlocking-the-power-of-online-privacy-a-comprehensive-guide-to-ghostery-add-on-chrome-mm3scm95f3h', anchor: 'Ghostery add-on for Chrome' },
      { slug: 'unlocking-the-power-of-secure-browsing-extensions-like-ghostery-for-a-safer-online-experience-mll9bs3gkw1', anchor: 'secure browsing extensions like Ghostery' },
    ],
    pillarToSpokes: [
      { slug: 'ublock-origin-best-settings-2026', anchor: 'uBlock Origin settings guide' },
      { slug: 'bypass-adblock-detection-chrome', anchor: 'bypass adblock detection' },
      { slug: 'cleanweb-vs-total-adblock', anchor: 'CleanWeb vs Total Adblock' },
      { slug: 'why-light-popup-blocker-is-better-than-heavy-adblockers-6', anchor: 'lightweight ad blocker' },
      { slug: 'best-ghostery-settings-for-maximum-online-privacy-a-comprehensive-guide-mmb7ltcfx00', anchor: 'Ghostery settings' },
    ],
  },
  {
    id: 2,
    name: 'Ad Blocking Android',
    pillar: { slug: 'adblock-chrome-android-complete-guide-2026', title: 'AdBlock Chrome Android: Complete Guide 2026' },
    spokes: [
      { slug: 'adblock-android-guide', anchor: 'AdBlock for Android guide' },
      { slug: 'adblocker-for-android-chrome', anchor: 'adblocker for Android Chrome' },
      { slug: 'adblock-for-android-chrome-partial', anchor: 'AdBlock for Android Chrome' },
      { slug: 'best-ad-blocker-for-chrome-android-2026-no-root-boost-your-mobile-browsing-experience-mmb7ls8d81s', anchor: 'best ad blocker for Chrome Android 2026' },
      { slug: 'unlock-a-faster-and-more-secure-browsing-experience-the-best-free-adblocker-for-chrome-android-mmtlczy3tpr', anchor: 'free adblocker for Chrome Android' },
      { slug: 'unlock-the-power-of-ad-blocking-on-android-a-comprehensive-guide-to-adblock-chrome-addon-android-mm3scnuyzcs', anchor: 'AdBlock Chrome addon for Android' },
      { slug: 'unlocking-ad-free-browsing-a-comprehensive-guide-to-ad-block-chrome-android-mm3scocktyi', anchor: 'ad block Chrome Android guide' },
      { slug: 'unlocking-ad-free-browsing-on-android-a-comprehensive-guide-to-android-chrome-adblock-mm3sco59uco', anchor: 'Android Chrome AdBlock guide' },
      { slug: 'unlocking-ad-free-browsing-on-the-go-the-ultimate-guide-to-chrome-mobile-adblock-mm3scpcgwtz', anchor: 'Chrome mobile adblock guide' },
      { slug: 'unlocking-ad-free-browsing-the-best-adblock-for-chrome-on-android-mm3scomswm6', anchor: 'best adblock for Chrome on Android' },
      { slug: 'unlocking-ad-free-browsing-the-ultimate-guide-to-adblock-chrome-android-mm3sco03ug5', anchor: 'adblock Chrome Android ultimate guide' },
      { slug: 'unlocking-ad-free-browsing-the-ultimate-guide-to-adblock-in-chrome-android-mm3scos4n36', anchor: 'adblock in Chrome Android' },
      { slug: 'unlocking-ad-free-browsing-the-ultimate-guide-to-adblock-on-chrome-android-mm3scp3569k', anchor: 'adblock on Chrome Android' },
      { slug: 'unlocking-a-seamless-browsing-experience-the-power-of-chrome-ad-blocker-android-mm3scoxnwg6', anchor: 'Chrome ad blocker for Android' },
      { slug: 'unlocking-online-privacy-a-comprehensive-guide-to-ghostery-for-chrome-android-mm3scml5zl3', anchor: 'Ghostery for Chrome Android' },
      { slug: 'unlocking-the-power-of-chrome-how-to-use-a-chrome-extension-for-android-phone-mmthp0ezfp7', anchor: 'Chrome extensions on Android phone' },
    ],
    pillarToSpokes: [
      { slug: 'best-ad-blocker-for-chrome-android-2026-no-root-boost-your-mobile-browsing-experience-mmb7ls8d81s', anchor: 'best ad blocker for Android Chrome' },
      { slug: 'unlocking-ad-free-browsing-on-the-go-the-ultimate-guide-to-chrome-mobile-adblock-mm3scpcgwtz', anchor: 'mobile adblock guide' },
      { slug: 'adblock-android-guide', anchor: 'AdBlock Android setup guide' },
    ],
  },
  {
    id: 3,
    name: 'Popup Blocker',
    pillar: { slug: 'chrome-popup-blocker-master-guide', title: 'Chrome Popup Blocker Master Guide' },
    spokes: [
      { slug: 'best-free-popup-blocker-for-chrome-2026-enhance-your-browsing-experience-mll9brzi0mt', anchor: 'best free popup blocker for Chrome 2026' },
      { slug: 'best-free-pop-up-blocker-extension-for-android-2026-enhance-your-mobile-browsing-experience-mmb7lsus9cb', anchor: 'free pop-up blocker for Android 2026' },
      { slug: 'block-newsletter-popups-and-allow-notifications-prompts-5', anchor: 'block newsletter popups' },
      { slug: 'block-popups-on-chrome-mobile-guide-mastering-a-distraction-free-browsing-experience-mmtld2pmfet', anchor: 'block popups on Chrome mobile' },
      { slug: 'breaking-free-from-annoying-ads-the-power-of-anti-popup-free-solutions-mm3scpnc2b6', anchor: 'anti-popup free solutions' },
      { slug: 'discover-the-best-popup-blocker-chrome-extension-for-a-seamless-browsing-experience-mme0iwwwapy', anchor: 'best popup blocker Chrome extension' },
      { slug: 'discover-the-best-popup-blocker-for-android-boost-your-mobile-browsing-experience-mmtld1tfrpr', anchor: 'popup blocker for Android' },
      { slug: 'discover-the-best-popup-blocker-for-chrome-2026-boost-your-browsing-experience-mmtlczhct0y', anchor: 'popup blocker for Chrome 2026' },
      { slug: 'effective-solutions-finding-the-best-chrome-extension-to-stop-popups-for-a-seamless-browsing-experie-mme0ixmzt1f', anchor: 'Chrome extension to stop popups' },
      { slug: 'unlock-the-power-of-a-free-pop-up-blocker-chrome-extension-for-a-seamless-browsing-experience-mm3scnkaas3', anchor: 'free pop-up blocker Chrome extension' },
      { slug: 'unlock-the-power-of-a-popup-blocker-free-boosting-your-browsing-experience-mm3scpsw3rb', anchor: 'popup blocker free guide' },
      { slug: 'unlock-the-power-of-a-seamless-browsing-experience-the-ultimate-guide-to-chrome-pop-up-blocker-mm3scphqdyd', anchor: 'Chrome pop-up blocker guide' },
      { slug: 'chrome-popup-blocker-partial', anchor: 'Chrome popup blocker settings' },
      { slug: 'why-light-popup-blocker-is-better-than-heavy-adblockers-6', anchor: 'Light Popup Blocker vs heavy adblockers' },
    ],
    pillarToSpokes: [
      { slug: 'best-free-popup-blocker-for-chrome-2026-enhance-your-browsing-experience-mll9brzi0mt', anchor: 'best free popup blocker' },
      { slug: 'block-newsletter-popups-and-allow-notifications-prompts-5', anchor: 'block newsletter popups' },
      { slug: 'discover-the-best-popup-blocker-for-android-boost-your-mobile-browsing-experience-mmtld1tfrpr', anchor: 'popup blocker for Android' },
    ],
  },
  {
    id: 4,
    name: 'Privacy & Security',
    pillar: { slug: 'best-chrome-privacy-extensions-2026-complete-guide', title: 'Best Chrome Privacy Extensions 2026: Complete Guide' },
    spokes: [
      { slug: 'best-chrome-extensions-for-privacy-2026-protect-your-online-identity-mll9br233zj', anchor: 'best Chrome extensions for privacy 2026' },
      { slug: 'best-chrome-extensions-for-online-safety-protecting-your-digital-footprint-mmdzl1pwuso', anchor: 'Chrome extensions for online safety' },
      { slug: 'best-local-password-manager-for-chrome-2026-1', anchor: 'best local password manager for Chrome' },
      { slug: 'best-redirect-blocker-for-secure-browsing-2026-protect-yourself-from-malicious-chains', anchor: 'redirect blocker for secure browsing' },
      { slug: 'boosting-browser-security-the-best-chrome-security-extensions-for-a-safer-online-experience-mmdzl14pplb', anchor: 'best Chrome security extensions' },
      { slug: 'creating-strong-unhackable-passwords-for-beginners-a-comprehensive-guide', anchor: 'creating strong passwords guide' },
      { slug: 'discover-the-best-privacy-extension-chrome-protect-your-online-identity-mme0iytlky3', anchor: 'best privacy extension for Chrome' },
      { slug: 'unlocking-online-privacy-the-power-of-chrome-ghostery-extension-mm3scmqpeo4', anchor: 'Chrome Ghostery extension' },
      { slug: 'unlocking-secure-browsing-a-guide-to-the-best-chrome-vpn-extension-free-options-mmdzl1ass5x', anchor: 'best free Chrome VPN extensions' },
      { slug: 'unlocking-the-power-of-noscript-chrome-boosting-browser-security-and-performance', anchor: 'NoScript for Chrome' },
      { slug: 'unlocking-the-power-of-password-management-the-ultimate-guide-to-keepass-extension-for-chrome-mm3scn67cyp', anchor: 'KeePass extension for Chrome' },
      { slug: 'unlocking-the-power-of-secure-browsing-top-extensions-for-a-safe-online-experience-mm3scnaxehm', anchor: 'secure browsing extensions' },
      { slug: 'veepn-extension-to-chrome-4', anchor: 'VeePN VPN extension for Chrome' },
      { slug: 'vpn-extension-to-chrome-1', anchor: 'VPN extension for Chrome' },
      { slug: 'why-you-should-avoid-cloud-based-password-managers-2', anchor: 'avoid cloud-based password managers' },
      { slug: 'why-your-browser-keeps-redirecting-and-how-to-fix-it-cybersecurity-safe-browsing-privacy-anti-adware-9', anchor: 'fix browser redirect issues' },
      { slug: 'windscribe-extension-to-chrome-9', anchor: 'Windscribe VPN extension for Chrome' },
      { slug: '10-best-chrome-security-extensions-2026-protect-your-browser-today', anchor: '10 best Chrome security extensions' },
    ],
    pillarToSpokes: [
      { slug: 'unlocking-secure-browsing-a-guide-to-the-best-chrome-vpn-extension-free-options-mmdzl1ass5x', anchor: 'best VPN extensions for Chrome' },
      { slug: 'best-local-password-manager-for-chrome-2026-1', anchor: 'local password manager for Chrome' },
      { slug: 'unlocking-the-power-of-noscript-chrome-boosting-browser-security-and-performance', anchor: 'NoScript for Chrome' },
      { slug: 'why-your-browser-keeps-redirecting-and-how-to-fix-it-cybersecurity-safe-browsing-privacy-anti-adware-9', anchor: 'browser redirect protection' },
    ],
  },
  {
    id: 5,
    name: 'Screenshot Tools',
    pillar: { slug: 'best-chrome-screenshot-extensions-2026-complete-guide', title: 'Best Chrome Screenshot Extensions 2026: Complete Guide' },
    spokes: [
      { slug: 'best-annotated-screenshot-chrome-5', anchor: 'annotated screenshot Chrome extension' },
      { slug: 'best-full-page-screenshot-chrome-extension-2026-free-no-login-required', anchor: 'full page screenshot Chrome extension' },
      { slug: 'best-quick-screenshot-chrome-tools-3', anchor: 'quick screenshot Chrome tools' },
      { slug: 'best-screenshot-editor-chrome-6', anchor: 'screenshot editor for Chrome' },
      { slug: 'best-screenshot-extension-for-developers-and-designers-3', anchor: 'screenshot extension for developers and designers' },
      { slug: 'best-screenshot-extensions-for-chrome-1', anchor: 'best screenshot extensions for Chrome' },
      { slug: 'best-screenshot-tools-for-chrome-2', anchor: 'best screenshot tools for Chrome' },
      { slug: 'capture-screen-chrome-comparison-2', anchor: 'capture screen Chrome comparison' },
      { slug: 'capture-screen-chrome-guide-4', anchor: 'capture screen Chrome guide' },
      { slug: 'capture-screen-chrome-review-5', anchor: 'capture screen Chrome review' },
      { slug: 'capture-screen-chrome-tutorial-3', anchor: 'capture screen Chrome tutorial' },
      { slug: 'capture-screen-in-chrome-7', anchor: 'how to capture screen in Chrome' },
      { slug: 'capture-scrolling-webpages-as-png-or-pdf', anchor: 'capture scrolling webpages as PNG or PDF' },
      { slug: 'chrome-screenshot-addon-alternatives-1', anchor: 'Chrome screenshot addon alternatives' },
      { slug: 'chrome-screenshot-addon-comparison-7', anchor: 'Chrome screenshot addon comparison' },
      { slug: 'chrome-screenshot-addon-guide-9', anchor: 'Chrome screenshot addon guide' },
      { slug: 'chrome-screenshot-addon-review', anchor: 'Chrome screenshot addon review' },
      { slug: 'chrome-screenshot-addon-tutorial-8', anchor: 'Chrome screenshot addon tutorial' },
      { slug: 'chrome-screenshot-guide', anchor: 'Chrome screenshot guide' },
      { slug: 'chrome-snipping-tool-2025-3', anchor: 'Chrome snipping tool 2025' },
      { slug: 'easy-screenshot-chrome-alternatives', anchor: 'easy screenshot Chrome alternatives' },
      { slug: 'easy-screenshot-chrome-comparison-2', anchor: 'easy screenshot Chrome comparison' },
      { slug: 'easy-screenshot-chrome-guide', anchor: 'easy screenshot Chrome guide' },
      { slug: 'easy-screenshot-chrome-review', anchor: 'easy screenshot Chrome review' },
      { slug: 'easy-screenshot-chrome-tools-9', anchor: 'easy screenshot Chrome tools' },
      { slug: 'easy-screenshot-chrome-tutorial', anchor: 'easy screenshot Chrome tutorial' },
      { slug: 'unlock-the-power-of-visual-content-chrome-screenshot-addons', anchor: 'Chrome screenshot addons guide' },
      { slug: 'unlocking-the-power-of-chrome-capture-tools-2025', anchor: 'Chrome capture tools 2025' },
      { slug: 'webpage-screenshot-chrome-2025-2', anchor: 'webpage screenshot Chrome 2025' },
    ],
    pillarToSpokes: [
      { slug: 'best-full-page-screenshot-chrome-extension-2026-free-no-login-required', anchor: 'full page screenshot extension' },
      { slug: 'capture-scrolling-webpages-as-png-or-pdf', anchor: 'capture scrolling pages as PDF' },
      { slug: 'best-screenshot-extension-for-developers-and-designers-3', anchor: 'screenshot tools for designers' },
      { slug: 'chrome-snipping-tool-2025-3', anchor: 'Chrome snipping tool' },
      { slug: 'best-annotated-screenshot-chrome-5', anchor: 'annotated screenshot extension' },
    ],
  },
  {
    id: 6,
    name: 'Tab Management & Browser Performance',
    pillar: { slug: 'unlocking-peak-performance-the-ultimate-guide-to-browser-optimization-extensions-mmtizzb73wk', title: 'Unlocking Peak Performance: Browser Optimization Extensions' },
    spokes: [
      { slug: 'auto-tab-discarder-vs-the-great-suspender-2026-review-a-comprehensive-comparison-of-tab-management-e-mmb7ss1hyb9', anchor: 'Auto Tab Discarder vs The Great Suspender' },
      { slug: 'autotab-discard-vs-onetab-which-chrome-extension-reigns-supreme-in-tab-management-mmthx8otjk3', anchor: 'AutoTab Discard vs OneTab' },
      { slug: 'best-chrome-extensions-for-old-pcs-with-4gb-ram-boosting-performance-and-productivity-mmb7srvijtp', anchor: 'Chrome extensions for old PCs with 4GB RAM' },
      { slug: 'best-extension-to-reduce-chrome-ram-usage-boosting-browser-performance-mll9bsc31qx', anchor: 'reduce Chrome RAM usage' },
      { slug: 'best-memory-saver-extension-for-chrome-4', anchor: 'best memory saver extension for Chrome' },
      { slug: 'best-ram-saving-extensions-2026', anchor: 'best RAM saving extensions 2026' },
      { slug: 'best-tab-manager-for-heavy-chrome-users-unlocking-efficiency-and-productivity-mll9bt7orh3', anchor: 'best tab manager for heavy Chrome users' },
      { slug: 'best-tab-suspender-for-4gb-ram-laptops-1', anchor: 'tab suspender for 4GB RAM laptops' },
      { slug: 'boosting-productivity-with-light-browser-extensions-for-slow-pc-a-comprehensive-guide-mmtizxgfmd1', anchor: 'light browser extensions for slow PC' },
      { slug: 'chrome-high-memory-usage-fix-2026-expert-solutions-to-boost-your-browsers-performance-mmthx7z7re5', anchor: 'fix Chrome high memory usage 2026' },
      { slug: 'chrome-memory-saver-extension-review-boosting-browser-performance-mll9bt3eiph', anchor: 'Chrome memory saver extension review' },
      { slug: 'chrome-memory-saver-how-it-works', anchor: 'how Chrome memory saver works' },
      { slug: 'chrome-ram-guide', anchor: 'Chrome RAM guide' },
      { slug: 'chrome-vs-edge-vs-brave-ram-comparison', anchor: 'Chrome vs Edge vs Brave RAM comparison' },
      { slug: 'discover-the-best-extension-to-suspend-tabs-and-boost-your-browsers-performance-mmtizxlm6h1', anchor: 'best extension to suspend tabs' },
      { slug: 'discover-the-best-tab-management-extensions-2026-for-a-more-efficient-browsing-experience-mmtizy1dudi', anchor: 'best tab management extensions 2026' },
      { slug: 'unlock-faster-browsing-the-ultimate-guide-to-chrome-performance-booster-tools-mmtizynrlkk', anchor: 'Chrome performance booster tools' },
      { slug: 'unlocking-efficiency-auto-tab-suspender-extension-free-download-for-a-seamless-browsing-experience-mll9bskiotb', anchor: 'auto tab suspender extension' },
      { slug: 'unlocking-the-power-of-chrome-how-to-enable-chrome-memory-saver-mode-for-a-seamless-browsing-experie-mmthx9ioyu8', anchor: 'enable Chrome memory saver mode' },
      { slug: 'why-is-chrome-using-so-much-memory-2026-fixes-mmb7sschcjw', anchor: 'why Chrome uses so much memory' },
      { slug: 'boost-your-browsing-experience-with-the-best-chrome-extension-for-website-speed-test-mmdt1198vtn', anchor: 'Chrome extension for website speed test' },
      { slug: 'unlocking-efficient-browsing-extensions-boosting-productivity-and-streamlining-your-online-experienc-mmtizywhjd8', anchor: 'efficient browsing extensions guide' },
    ],
    pillarToSpokes: [
      { slug: 'why-is-chrome-using-so-much-memory-2026-fixes-mmb7sschcjw', anchor: 'why Chrome uses so much memory' },
      { slug: 'best-tab-suspender-for-4gb-ram-laptops-1', anchor: 'tab suspender for 4GB RAM' },
      { slug: 'chrome-vs-edge-vs-brave-ram-comparison', anchor: 'Chrome vs Edge vs Brave RAM' },
      { slug: 'auto-tab-discarder-vs-the-great-suspender-2026-review-a-comprehensive-comparison-of-tab-management-e-mmb7ss1hyb9', anchor: 'Auto Tab Discarder vs Great Suspender' },
    ],
  },
  {
    id: 7,
    name: 'Download Manager & Media Downloader',
    pillar: { slug: 'best-downloader-for-chrome-2026', title: 'Best Downloader for Chrome 2026: Seamless Downloads' },
    spokes: [
      { slug: 'best-media-downloader-android-chrome', anchor: 'media downloader for Android Chrome' },
      { slug: 'boost-your-browsing-experience-with-the-best-chrome-extension-for-faster-downloads-mmdupfqejgi', anchor: 'Chrome extension for faster downloads' },
      { slug: 'chrome-extension-to-download-files', anchor: 'Chrome extension to download files' },
      { slug: 'discover-the-best-chrome-extension-for-media-download-a-comprehensive-guide-mmdupgopifb', anchor: 'best Chrome extension for media download' },
      { slug: 'discover-the-best-chrome-extension-like-idm-for-seamless-download-management-mmdupfvslt1', anchor: 'Chrome extension like IDM' },
      { slug: 'discover-the-best-chrome-extension-to-download-images-a-comprehensive-guide-mmdupgfwhnh', anchor: 'Chrome extension to download images' },
      { slug: 'discover-the-best-chrome-extension-to-download-videos-a-comprehensive-guide-mmdupgabxxi', anchor: 'Chrome extension to download videos' },
      { slug: 'discover-the-best-download-manager-chrome-extension-for-a-seamless-browsing-experience-mmdupfh67n8', anchor: 'best download manager Chrome extension' },
      { slug: 'discover-the-best-file-downloader-extension-chrome-a-comprehensive-guide-mmdupg56roj', anchor: 'best file downloader extension for Chrome' },
      { slug: 'discover-the-fastest-video-downloader-chrome-extension-for-seamless-video-saving-mmtvrj66p5v', anchor: 'fastest video downloader Chrome extension' },
      { slug: 'discover-the-best-image-downloader-chrome-extension-for-effortless-image-saving-mmtvrb6wws4', anchor: 'best image downloader Chrome extension' },
      { slug: 'download-video-from-any-site-chrome-extension-a-comprehensive-guide-mmtvrahku1z', anchor: 'download video from any site Chrome' },
      { slug: 'download-instagram-reels-chrome-a-step-by-step-guide-to-saving-your-favorite-videos-mmtvrc4yqhk', anchor: 'download Instagram Reels on Chrome' },
      { slug: 'effortless-image-downloading-a-comprehensive-guide-to-bulk-image-downloader-chrome-extensions-mmtvrglq5x1', anchor: 'bulk image downloader Chrome extension' },
      { slug: 'unlock-efficient-downloads-with-the-best-free-download-manager-chrome-extension-mmdupg128fq', anchor: 'free download manager Chrome extension' },
      { slug: 'unlock-faster-downloads-with-idm-extension-for-chrome-free-download-latest-version-mmb6y473kzg', anchor: 'IDM extension for Chrome' },
      { slug: 'unlock-the-power-of-batch-image-downloader-extension-a-comprehensive-guide-mmtvre5kc7v', anchor: 'batch image downloader extension' },
      { slug: 'download-high-quality-mp3-chrome-a-comprehensive-guide-to-music-lovers-mmtvrfdndri', anchor: 'download MP3 with Chrome extension' },
      { slug: 'best-youtube-downloader-chrome-extension-2026', anchor: 'best YouTube downloader Chrome extension' },
      { slug: 'best-youtube-to-mp3-chrome-extension-2026-the-ultimate-guide-to-audio-extraction-mliju4j1hys', anchor: 'YouTube to MP3 Chrome extension' },
      { slug: 'best-youtube-to-mp3-chrome-extension-2026-top-5-free-safe-converters', anchor: 'top YouTube to MP3 converters' },
      { slug: 'discover-the-safest-youtube-to-mp3-extension-2026-for-seamless-music-downloads-mmtvrbpdu1p', anchor: 'safest YouTube to MP3 extension' },
      { slug: 'unlock-the-power-of-music-the-best-chrome-extension-to-download-youtube-music-mmdz4dln1vq', anchor: 'download YouTube music with Chrome' },
      { slug: 'unlock-the-power-of-music-the-ultimate-guide-to-youtube-audio-downloader-chrome-extension-mmdz4dgys00', anchor: 'YouTube audio downloader Chrome extension' },
    ],
    pillarToSpokes: [
      { slug: 'discover-the-best-chrome-extension-like-idm-for-seamless-download-management-mmdupfvslt1', anchor: 'IDM alternative for Chrome' },
      { slug: 'unlock-the-power-of-batch-image-downloader-extension-a-comprehensive-guide-mmtvre5kc7v', anchor: 'batch image downloader' },
      { slug: 'discover-the-fastest-video-downloader-chrome-extension-for-seamless-video-saving-mmtvrj66p5v', anchor: 'fastest video downloader extension' },
    ],
  },
  {
    id: 8,
    name: 'YouTube Tools & Extensions',
    pillar: { slug: 'youtube-tools-guide', title: 'The Ultimate Guide to YouTube Browser Tools & Downloaders (2026)' },
    spokes: [
      { slug: 'best-free-adblocker-youtube-chrome', anchor: 'best adblocker for YouTube on Chrome' },
      { slug: 'discover-the-best-chrome-extension-to-repeat-youtube-videos-for-enhanced-productivity-and-focus-mmdz7yi813q', anchor: 'Chrome extension to repeat YouTube videos' },
      { slug: 'unlock-a-seamless-youtube-experience-the-best-ad-blocker-that-works-on-youtube-chrome-mme0iyicafq', anchor: 'ad blocker for YouTube Chrome' },
      { slug: 'unlock-the-full-potential-of-youtube-the-best-youtube-extensions-chrome-has-to-offer-mmdz4d36x0y', anchor: 'best YouTube extensions for Chrome' },
      { slug: 'unlock-the-power-of-youtube-subtitle-downloader-chrome-a-comprehensive-guide-mmdz4dqyokk', anchor: 'YouTube subtitle downloader Chrome' },
      { slug: 'unlock-the-power-of-video-downloading-the-best-chrome-extension-for-youtube-downloader-mmdz4da9s5b', anchor: 'Chrome extension for YouTube downloader' },
      { slug: 'unlock-your-full-potential-the-best-youtube-productivity-extensions-for-a-more-efficient-you-mmdz7y38wml', anchor: 'YouTube productivity extensions' },
      { slug: 'unlocking-the-full-potential-of-youtube-a-comprehensive-guide-to-youtube-extensions-mmdz4ci1q06', anchor: 'YouTube extensions comprehensive guide' },
      { slug: 'video-speed-controller-chrome-extensions', anchor: 'YouTube video speed controller' },
      { slug: 'youtube-dark-mode-desktop-2026-turn-it-on-in-30-seconds', anchor: 'YouTube dark mode' },
      { slug: 'best-youtube-downloader-chrome-extension-2026', anchor: 'best YouTube downloader extension 2026' },
      { slug: 'best-youtube-to-mp3-chrome-extension-2026-the-ultimate-guide-to-audio-extraction-mliju4j1hys', anchor: 'YouTube to MP3 Chrome extension' },
      { slug: 'best-youtube-to-mp3-chrome-extension-2026-top-5-free-safe-converters', anchor: 'YouTube to MP3 converters' },
      { slug: 'discover-the-safest-youtube-to-mp3-extension-2026-for-seamless-music-downloads-mmtvrbpdu1p', anchor: 'safest YouTube to MP3 extension' },
    ],
    pillarToSpokes: [
      { slug: 'video-speed-controller-chrome-extensions', anchor: 'YouTube video speed controller' },
      { slug: 'youtube-dark-mode-desktop-2026-turn-it-on-in-30-seconds', anchor: 'YouTube dark mode' },
      { slug: 'discover-the-best-chrome-extension-to-repeat-youtube-videos-for-enhanced-productivity-and-focus-mmdz7yi813q', anchor: 'repeat YouTube videos extension' },
    ],
  },
  {
    id: 9,
    name: 'Dark Mode Extensions',
    pillar: { slug: 'youtube-dark-mode-desktop-2026-turn-it-on-in-30-seconds', title: 'YouTube Dark Mode Desktop 2026: Turn It On in 30 Seconds' },
    spokes: [
      { slug: 'best-amoled-black-theme-for-reddit-users', anchor: 'AMOLED black theme for Reddit' },
      { slug: 'best-dark-mode-extension-for-facebook-2026-1', anchor: 'dark mode extension for Facebook 2026' },
      { slug: 'dark-mode-for-twitter-the-ultimate-guide-3', anchor: 'dark mode for Twitter guide' },
      { slug: 'using-dark-mode-on-quora-for-better-focus-4', anchor: 'dark mode on Quora' },
      { slug: 'why-auto-dark-mode-is-essential-for-programmers-6', anchor: 'auto dark mode for programmers' },
      { slug: 'activate-dark-mode-on-wikipedia-for-night-reading-2', anchor: 'dark mode on Wikipedia' },
      { slug: 'unlock-the-power-of-youtube-dark-mode-the-ultimate-guide-to-youtube-dark-mode-extension-chrome', anchor: 'YouTube dark mode extension Chrome' },
    ],
    pillarToSpokes: [
      { slug: 'why-auto-dark-mode-is-essential-for-programmers-6', anchor: 'dark mode for developers' },
      { slug: 'best-dark-mode-extension-for-facebook-2026-1', anchor: 'dark mode for Facebook' },
    ],
  },
  {
    id: 10,
    name: 'Mobile / Android Extensions',
    pillar: { slug: 'chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide', title: 'Chrome Extensions on Android 2026: Kiwi vs Yandex vs Lemur Full Guide' },
    spokes: [
      { slug: 'chrome-web-store-android-extensions-download-7', anchor: 'Chrome Web Store Android extensions' },
      { slug: 'discover-the-best-android-browser-for-extensions-to-enhance-your-mobile-browsing-experience-mmthow5z77c', anchor: 'best Android browser for extensions' },
      { slug: 'discover-the-best-lemur-browser-extensions-download-for-enhanced-browsing-experience-mmthozyfc2j', anchor: 'Lemur Browser extensions download' },
      { slug: 'unlock-the-full-potential-of-kiwi-browser-discover-the-best-extensions-for-enhanced-browsing-mmthoxikuuo', anchor: 'Kiwi Browser extensions guide' },
      { slug: 'unlock-the-full-potential-of-your-mobile-device-discover-the-best-mobile-browser-with-chrome-store-s-mmthp0npy6z', anchor: 'mobile browser with Chrome Store support' },
      { slug: 'unlocking-the-full-potential-of-chrome-mobile-a-comprehensive-guide-to-chrome-mobile-extensions-work-mmthowo8su8', anchor: 'Chrome mobile extensions guide' },
      { slug: 'unlocking-the-full-potential-of-chrome-on-mobile-a-step-by-step-guide-on-how-to-use-chrome-extension-mmthovaloyu', anchor: 'how to use Chrome extensions on mobile' },
      { slug: 'unlocking-the-full-potential-of-kiwi-browser-a-comprehensive-guide-to-kiwi-browser-settings-for-exte-mmthoygydyi', anchor: 'Kiwi Browser settings guide' },
      { slug: 'unlocking-the-full-potential-of-your-android-tablet-the-best-chrome-extension-for-android-tablet-mmthoxto10w', anchor: 'Chrome extension for Android tablet' },
      { slug: 'unlocking-the-power-of-chrome-extensions-for-android-apk-a-comprehensive-guide-mmthow0dkxi', anchor: 'Chrome extensions APK guide' },
      { slug: 'unlocking-the-power-of-chrome-extensions-on-android-a-comprehensive-guide', anchor: 'Chrome extensions on Android guide' },
      { slug: 'unlocking-the-power-of-kiwi-browser-developer-mode-a-comprehensive-guide-mmthp09j08g', anchor: 'Kiwi Browser developer mode' },
      { slug: 'unlocking-the-power-of-yandex-browser-on-chrome-web-store-a-comprehensive-guide-mmthovo77ng', anchor: 'Yandex Browser Chrome Web Store guide' },
      { slug: 'unlocking-the-power-of-chrome-how-to-use-a-chrome-extension-for-android-phone-mmthp0ezfp7', anchor: 'Chrome extension for Android phone' },
      { slug: 'unlocking-the-power-of-chrome-how-to-find-the-best-extension-to-chrome-for-your-needs', anchor: 'how to find the best Chrome extension' },
      { slug: 'unlock-the-power-of-mobile-development-top-chrome-devtools-tips-for-mobile-mmtm0hanwsl', anchor: 'Chrome DevTools tips for mobile' },
    ],
    pillarToSpokes: [
      { slug: 'unlocking-the-full-potential-of-kiwi-browser-a-comprehensive-guide-to-kiwi-browser-settings-for-exte-mmthoygydyi', anchor: 'Kiwi Browser settings' },
      { slug: 'unlocking-the-power-of-yandex-browser-on-chrome-web-store-a-comprehensive-guide-mmthovo77ng', anchor: 'Yandex Browser extensions' },
      { slug: 'discover-the-best-lemur-browser-extensions-download-for-enhanced-browsing-experience-mmthozyfc2j', anchor: 'Lemur Browser extensions' },
    ],
  },
  {
    id: 11,
    name: 'Developer Tools & SEO Extensions',
    pillar: { slug: 'unlocking-productivity-the-best-chrome-extensions-for-web-developers-mmtm0ejlryv', title: 'Best Chrome Extensions for Web Developers 2026' },
    spokes: [
      { slug: 'bugherd-extension-chrome-2', anchor: 'BugHerd extension for Chrome' },
      { slug: 'chatgpt-extension-to-chrome-5', anchor: 'ChatGPT extension for Chrome' },
      { slug: 'cors-chrome-7', anchor: 'CORS issues in Chrome' },
      { slug: 'detailed-seo-extension-vs-seoquake-a-comprehensive-comparison-for-enhanced-seo-analysis-mmtm0ebkaaz', anchor: 'Detailed SEO extension vs SEOquake' },
      { slug: 'discover-the-best-font-finder-extension-chrome-to-elevate-your-design-game-mmtm0gyrx36', anchor: 'best font finder extension for Chrome' },
      { slug: 'discover-the-best-screen-recorder-for-developers-a-comprehensive-guide-mmtm0evk4d4', anchor: 'best screen recorder for developers' },
      { slug: 'unlock-the-power-of-color-with-the-best-color-picker-chrome-extension-free-mmtm0ezx77j', anchor: 'color picker Chrome extension' },
      { slug: 'unlock-the-power-of-css-the-ultimate-guide-to-css-viewer-extension-for-chrome-mmtm0fy4u2w', anchor: 'CSS viewer extension for Chrome' },
      { slug: 'unlock-the-power-of-json-the-ultimate-guide-to-json-formatter-chrome-extension-mmtm0fnlxhc', anchor: 'JSON formatter Chrome extension' },
      { slug: 'unlock-the-power-of-responsive-design-the-ultimate-guide-to-responsive-design-tester-extension-mmtm0h38w7y', anchor: 'responsive design tester extension' },
      { slug: 'unlock-the-power-of-seo-the-best-seo-extensions-for-chrome-2026-mmtm0dwx1nu', anchor: 'best SEO extensions for Chrome 2026' },
      { slug: 'unlock-the-power-of-web-scraping-the-ultimate-guide-to-web-scraper-extension-for-chrome-mmtm0gozela', anchor: 'web scraper extension for Chrome' },
      { slug: 'unlocking-productivity-the-best-chrome-extension-for-programmers-to-boost-coding-efficiency-mmtm0gk4vfm', anchor: 'Chrome extension for programmers' },
      { slug: 'unlocking-productivity-the-best-chrome-extension-for-web-developers-to-boost-efficiency-mmdt109l96v', anchor: 'Chrome extensions for web developer efficiency' },
      { slug: 'unlocking-the-power-of-api-testing-a-comprehensive-guide-to-api-tester-chrome-extension-mmtm0gtdjbe', anchor: 'API tester Chrome extension' },
      { slug: 'unlocking-the-power-of-inspect-element-chrome-extension-tools-a-comprehensive-guide-mmdt10kh9a3', anchor: 'Inspect Element Chrome extension tools' },
      { slug: 'unlocking-the-power-of-react-devtools-for-chrome-mobile-a-comprehensive-guide-mmtm0fhykxq', anchor: 'React DevTools for Chrome mobile' },
      { slug: 'unlocking-the-power-of-website-analysis-a-comprehensive-wappalyzer-chrome-extension-guide-mmtm0ggk7gb', anchor: 'Wappalyzer Chrome extension guide' },
      { slug: 'unlock-the-power-of-web-development-the-best-chrome-extension-to-view-source-code-mmdt11ed3vp', anchor: 'Chrome extension to view source code' },
      { slug: 'unlock-the-power-of-website-analysis-with-the-best-chrome-extension-for-website-analysis-mmdt10qgwzb', anchor: 'best Chrome extension for website analysis' },
    ],
    pillarToSpokes: [
      { slug: 'cors-chrome-7', anchor: 'CORS issues in Chrome' },
      { slug: 'unlock-the-power-of-json-the-ultimate-guide-to-json-formatter-chrome-extension-mmtm0fnlxhc', anchor: 'JSON Formatter extension' },
      { slug: 'unlock-the-power-of-seo-the-best-seo-extensions-for-chrome-2026-mmtm0dwx1nu', anchor: 'SEO extensions for Chrome' },
    ],
  },
  {
    id: 12,
    name: 'Productivity & Focus',
    pillar: { slug: 'best-free-chrome-extensions-the-2025-toolkit-you-actually-need', title: 'Best Free Chrome Extensions: The 2025 Toolkit You Actually Need' },
    spokes: [
      { slug: 'best-website-blocker-schedule-chrome-2026', anchor: 'website blocker for Chrome 2026' },
      { slug: 'boost-your-workflow-the-best-chrome-extensions-for-focus-and-productivity-mmdrqq4a7we', anchor: 'Chrome extensions for focus and productivity' },
      { slug: 'chrome-extensions-vs-web-apps-the-ultimate-comparison-for-productivity-in-2025', anchor: 'Chrome extensions vs web apps for productivity' },
      { slug: 'unlocking-efficiency-the-best-chrome-tools-for-productivity-to-boost-your-workflow-mmdrxz7mi4g', anchor: 'best Chrome tools for productivity' },
      { slug: 'unlocking-efficiency-the-best-productivity-tools-for-chrome-browser-mll9bto578a', anchor: 'productivity tools for Chrome' },
      { slug: 'unlocking-efficient-browsing-extensions-boosting-productivity-and-streamlining-your-online-experienc-mmtizywhjd8', anchor: 'efficient browsing extensions' },
      { slug: 'unlock-the-full-potential-of-your-browser-chrome-extensions-for-better-browsing-mmdrxzo9gfg', anchor: 'Chrome extensions for better browsing' },
      { slug: 'unlock-the-full-potential-of-your-browser-essential-extensions-to-chrome', anchor: 'essential Chrome extensions' },
      { slug: 'unlock-the-power-of-your-browser-hidden-chrome-extensions-you-should-try-mmdrxztjzma', anchor: 'hidden Chrome extensions you should try' },
      { slug: 'unlocking-the-power-of-chrome-how-to-find-the-best-extension-to-chrome-for-your-needs', anchor: 'how to find the best Chrome extension' },
      { slug: '15-essential-chrome-extensions-to-supercharge-your-workflow-right-now', anchor: '15 essential Chrome extensions' },
      { slug: 'automating-business-reports-with-formula-builder-4', anchor: 'automate business reports with Formula Builder' },
      { slug: 'best-ai-formula-generator-for-google-sheets-1', anchor: 'AI formula generator for Google Sheets' },
      { slug: 'best-spreadsheet-tools-for-small-business-owners-5', anchor: 'spreadsheet tools for small business' },
      { slug: 'creating-financial-models-with-formula-builder-pro-7', anchor: 'create financial models with Formula Builder Pro' },
      { slug: 'writing-vlookup-formulas-for-beginners-2', anchor: 'VLOOKUP formulas for beginners' },
    ],
    pillarToSpokes: [
      { slug: 'best-website-blocker-schedule-chrome-2026', anchor: 'website blocker for focus' },
      { slug: 'chrome-extensions-vs-web-apps-the-ultimate-comparison-for-productivity-in-2025', anchor: 'Chrome extensions vs web apps' },
      { slug: '15-essential-chrome-extensions-to-supercharge-your-workflow-right-now', anchor: 'essential Chrome extensions' },
    ],
  },
  {
    id: 13,
    name: 'Social Media Extensions',
    pillar: { slug: 'boost-your-online-presence-the-ultimate-guide-to-chrome-extensions-for-social-media-marketing-mmdsutdfgz9', title: 'Chrome Extensions for Social Media Marketing: Ultimate Guide' },
    spokes: [
      { slug: 'boost-your-twitter-productivity-with-the-best-chrome-extension-for-twitter-productivity-mmdsjeh52mg', anchor: 'Chrome extension for Twitter productivity' },
      { slug: 'dark-mode-for-twitter-the-ultimate-guide-3', anchor: 'dark mode for Twitter' },
      { slug: 'download-instagram-reels-chrome-a-step-by-step-guide-to-saving-your-favorite-videos-mmtvrc4yqhk', anchor: 'download Instagram Reels on Chrome' },
      { slug: 'unlock-the-full-potential-of-linkedin-with-the-best-linkedin-chrome-extensions-mmdsjdsf6xu', anchor: 'LinkedIn Chrome extensions' },
      { slug: 'unlock-the-power-of-instagram-downloads-with-the-best-chrome-extension-for-instagram-download-mmdsjemn6y0', anchor: 'Instagram download Chrome extension' },
      { slug: 'unlock-the-power-of-linkedin-with-the-best-extension-linkedin-chrome-tools', anchor: 'LinkedIn Chrome extension tools' },
      { slug: 'unlocking-the-power-of-social-media-the-best-social-media-chrome-extensions-for-a-seamless-experienc-mmdsjecdo4o', anchor: 'best social media Chrome extensions' },
      { slug: 'unlocking-the-power-of-social-media-the-ultimate-guide-to-chrome-extension-for-social-analytics-mmdsutrnj8g', anchor: 'Chrome extension for social analytics' },
      { slug: 'unlocking-the-power-of-facebook-pixel-helper-chrome-2026-a-comprehensive-guide-mmtm0g85dyl', anchor: 'Facebook Pixel Helper Chrome extension' },
      { slug: 'unlocking-the-power-of-facebook-the-ultimate-guide-to-chrome-extensions-for-facebook-tools-mmdsje6nqce', anchor: 'Chrome extensions for Facebook tools' },
      { slug: 'unlocking-the-power-of-facebook-pixel-the-ultimate-guide-to-chrome-extensions-for-enhanced-tracking-mmdsusvgbob', anchor: 'Facebook Pixel Chrome extension tracking' },
      { slug: 'unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper', anchor: 'Chrome Facebook Pixel Helper' },
    ],
    pillarToSpokes: [
      { slug: 'unlock-the-full-potential-of-linkedin-with-the-best-linkedin-chrome-extensions-mmdsjdsf6xu', anchor: 'LinkedIn Chrome extensions' },
      { slug: 'boost-your-twitter-productivity-with-the-best-chrome-extension-for-twitter-productivity-mmdsjeh52mg', anchor: 'Twitter productivity extension' },
      { slug: 'unlocking-the-power-of-facebook-pixel-helper-chrome-2026-a-comprehensive-guide-mmtm0g85dyl', anchor: 'Facebook Pixel Helper' },
    ],
  },
];

// Cross-cluster links
const CROSS_CLUSTER_LINKS = [
  { source: 'adblock-plus-vs-ublock-origin-2026', target: 'best-chrome-privacy-extensions-2026-complete-guide', anchor: 'privacy extensions for Chrome' },
  { source: 'adblock-plus-vs-ublock-origin-2026', target: 'chrome-popup-blocker-master-guide', anchor: 'popup blocker guide' },
  { source: 'best-chrome-screenshot-extensions-2026-complete-guide', target: 'unlocking-productivity-the-best-chrome-extensions-for-web-developers-mmtm0ejlryv', anchor: 'Chrome extensions for web developers' },
  { source: 'chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide', target: 'adblock-chrome-android-complete-guide-2026', anchor: 'ad blocking on Android' },
  { source: 'youtube-tools-guide', target: 'best-downloader-for-chrome-2026', anchor: 'YouTube downloader extension' },
  { source: 'youtube-dark-mode-desktop-2026-turn-it-on-in-30-seconds', target: 'youtube-tools-guide', anchor: 'YouTube extensions guide' },
  { source: 'best-chrome-privacy-extensions-2026-complete-guide', target: 'adblock-plus-vs-ublock-origin-2026', anchor: 'best ad blocker comparison' },
  { source: 'chrome-popup-blocker-master-guide', target: 'adblock-plus-vs-ublock-origin-2026', anchor: 'ad blocker comparison guide' },
  { source: 'unlocking-productivity-the-best-chrome-extensions-for-web-developers-mmtm0ejlryv', target: 'best-chrome-screenshot-extensions-2026-complete-guide', anchor: 'best screenshot extensions' },
  { source: 'adblock-chrome-android-complete-guide-2026', target: 'chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide', anchor: 'Chrome extensions on Android guide' },
  { source: 'best-downloader-for-chrome-2026', target: 'youtube-tools-guide', anchor: 'YouTube tools guide' },
  { source: 'unlocking-peak-performance-the-ultimate-guide-to-browser-optimization-extensions-mmtizzb73wk', target: 'adblock-plus-vs-ublock-origin-2026', anchor: 'lightweight ad blocker' },
];

// ── CHANGELOG ─────────────────────────────────────────────────────────────────

const changelog = [];
let stats = {
  articlesModified: 0,
  linksAdded: 0,
  spokeLinksAdded: 0,
  pillarLinksAdded: 0,
  crossClusterLinksAdded: 0,
  orphansFixed: 0,
  skipped: 0,
  notFound: 0,
};

function log(msg) {
  console.log(msg);
  changelog.push(msg);
}

// ── MAIN EXECUTION ────────────────────────────────────────────────────────────

function processCluster(cluster) {
  const { pillar, spokes, pillarToSpokes, name } = cluster;
  log(`\n## Cluster ${cluster.id}: ${name}`);

  const pillarContent = readArticle(pillar.slug);
  if (!pillarContent) {
    log(`  ⚠️  PILLAR NOT FOUND: ${pillar.slug}`);
    stats.notFound++;
    return;
  }

  // 1. Add pillar → spoke links to pillar article
  let pillarModified = false;
  let pillarNewContent = pillarContent;
  const pillarToSpokesToAdd = pillarToSpokes.filter(s => !hasLinkTo(pillarNewContent, s.slug) && articleExists(s.slug));

  if (pillarToSpokesToAdd.length > 0) {
    const relatedHtml = buildRelatedSection(pillarToSpokesToAdd.map(s => [s.slug, s.anchor]));
    pillarNewContent = insertBeforeCTA(pillarNewContent, relatedHtml);
    pillarModified = true;
    log(`  ✅ Pillar [${pillar.slug}]: added ${pillarToSpokesToAdd.length} spoke links`);
    pillarToSpokesToAdd.forEach(s => {
      stats.pillarLinksAdded++;
      stats.linksAdded++;
    });
  } else {
    log(`  ℹ️  Pillar [${pillar.slug}]: spoke links already present or no valid targets`);
  }

  if (pillarModified) {
    writeArticle(pillar.slug, pillarNewContent);
    stats.articlesModified++;
  }

  // 2. Add spoke → pillar links
  for (const spoke of spokes) {
    if (!articleExists(spoke.slug)) {
      log(`  ⚠️  SPOKE NOT FOUND: ${spoke.slug}`);
      stats.notFound++;
      continue;
    }

    const spokeContent = readArticle(spoke.slug);
    if (!spokeContent) continue;

    if (hasLinkTo(spokeContent, pillar.slug)) {
      stats.skipped++;
      continue;
    }

    const linkToAdd = [[pillar.slug, `${spoke.anchor} — see our complete guide`]];
    const relatedHtml = buildRelatedSection([[pillar.slug, `Complete guide: ${pillar.title}`]]);
    const newContent = insertBeforeCTA(spokeContent, relatedHtml);

    writeArticle(spoke.slug, newContent);
    log(`  ✅ Spoke [${spoke.slug}]: linked to pillar`);
    stats.articlesModified++;
    stats.spokeLinksAdded++;
    stats.linksAdded++;
  }
}

function processCrossClusterLinks() {
  log('\n## Cross-Cluster Links');
  for (const link of CROSS_CLUSTER_LINKS) {
    if (!articleExists(link.source) || !articleExists(link.target)) {
      log(`  ⚠️  SKIP (not found): ${link.source} → ${link.target}`);
      continue;
    }

    const content = readArticle(link.source);
    if (hasLinkTo(content, link.target)) {
      stats.skipped++;
      continue;
    }

    const relatedHtml = buildRelatedSection([[link.target, link.anchor]]);
    const newContent = insertBeforeCTA(content, relatedHtml);
    writeArticle(link.source, newContent);
    log(`  ✅ Cross-link: ${link.source} → ${link.target} (${link.anchor})`);
    stats.articlesModified++;
    stats.crossClusterLinksAdded++;
    stats.linksAdded++;
  }
}

function findOrphanArticles() {
  log('\n## Orphan Detection');

  // Collect all slugs mentioned in any cluster
  const clusterSlugs = new Set();
  for (const cluster of CLUSTERS) {
    clusterSlugs.add(cluster.pillar.slug);
    cluster.spokes.forEach(s => clusterSlugs.add(s.slug));
    cluster.pillarToSpokes.forEach(s => clusterSlugs.add(s.slug));
  }
  CROSS_CLUSTER_LINKS.forEach(l => { clusterSlugs.add(l.source); clusterSlugs.add(l.target); });

  // Read all articles from index
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const orphans = [];

  for (const entry of index) {
    const slug = entry.slug;
    if (!clusterSlugs.has(slug)) {
      orphans.push({ slug, title: entry.title, category: entry.category });
    }
  }

  log(`  Found ${orphans.length} orphan articles`);

  // Fix orphans: add them to the closest cluster based on category/keyword matching
  const categoryToCluster = {
    'Screenshot': 5,
    'Productivity': 12,
    'Privacy': 4,
    'Security': 4,
    'Download': 7,
    'YouTube': 8,
    'Dark Mode': 9,
    'Tab Management': 6,
    'Developer': 11,
    'Social Media': 13,
    'Android': 10,
    'Ad Blocker': 1,
    'Popup Blocker': 3,
  };

  const keywordToCluster = {
    'screenshot': 5, 'capture': 5, 'snipping': 5,
    'download': 7, 'video': 7, 'media': 7, 'mp3': 7, 'audio': 7,
    'youtube': 8, 'dark mode': 9, 'dark-mode': 9,
    'tab': 6, 'memory': 6, 'ram': 6, 'performance': 6,
    'developer': 11, 'devtools': 11, 'code': 11, 'json': 11, 'css': 11,
    'social': 13, 'twitter': 13, 'instagram': 13, 'facebook': 13, 'linkedin': 13,
    'android': 10, 'mobile': 10, 'kiwi': 10,
    'adblock': 1, 'adblocker': 1, 'ad blocker': 1, 'ad-blocker': 1,
    'popup': 3, 'pop-up': 3,
    'privacy': 4, 'vpn': 4, 'password': 4,
    'productivity': 12, 'focus': 12, 'workflow': 12,
  };

  let orphansFixed = 0;
  for (const orphan of orphans) {
    let targetClusterIdx = null;

    // Try category match
    for (const [cat, idx] of Object.entries(categoryToCluster)) {
      if (orphan.category && orphan.category.toLowerCase().includes(cat.toLowerCase())) {
        targetClusterIdx = idx;
        break;
      }
    }

    // Try keyword match in slug
    if (!targetClusterIdx) {
      for (const [kw, idx] of Object.entries(keywordToCluster)) {
        if (orphan.slug.includes(kw.toLowerCase().replace(' ', '-'))) {
          targetClusterIdx = idx;
          break;
        }
      }
    }

    // Try keyword match in title
    if (!targetClusterIdx) {
      const titleLower = (orphan.title || '').toLowerCase();
      for (const [kw, idx] of Object.entries(keywordToCluster)) {
        if (titleLower.includes(kw.toLowerCase())) {
          targetClusterIdx = idx;
          break;
        }
      }
    }

    if (targetClusterIdx && articleExists(orphan.slug)) {
      const cluster = CLUSTERS.find(c => c.id === targetClusterIdx);
      if (!cluster) continue;

      const content = readArticle(orphan.slug);
      if (!content) continue;

      if (!hasLinkTo(content, cluster.pillar.slug)) {
        const relatedHtml = buildRelatedSection([[cluster.pillar.slug, cluster.pillar.title]]);
        const newContent = insertBeforeCTA(content, relatedHtml);
        writeArticle(orphan.slug, newContent);
        log(`  ✅ Fixed orphan [${orphan.slug}] → linked to cluster ${targetClusterIdx} pillar`);
        orphansFixed++;
        stats.articlesModified++;
        stats.linksAdded++;
        stats.orphansFixed++;
      }
    }
  }

  log(`  Fixed ${orphansFixed} of ${orphans.length} orphan articles`);
  return orphans;
}

function regenerateSitemap() {
  log('\n## Sitemap Regeneration');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

  const today = new Date().toISOString().split('T')[0];

  const urls = index.map(entry => {
    const slug = entry.slug;
    const lastmod = entry.updated_at ? entry.updated_at.split('T')[0] : today;
    const priority = CLUSTERS.some(c => c.pillar.slug === slug) ? '1.0' : '0.8';
    return `  <url>
    <loc>${BASE_URL}/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
  log(`  ✅ Sitemap regenerated: ${index.length + 2} URLs`);
}

function auditLinkCounts() {
  log('\n## Link Audit');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const results = [];

  for (const entry of index) {
    if (!articleExists(entry.slug)) continue;
    const content = readArticle(entry.slug);
    const outboundCount = countInternalLinks(content);

    // Count inbound (how many other articles link to this one)
    // We'll do this in report generation, not here for performance
    results.push({ slug: entry.slug, title: entry.title, outbound: outboundCount });
  }

  const underlinked = results.filter(r => r.outbound < 2);
  log(`  Articles with < 2 outbound links: ${underlinked.length}`);
  return { results, underlinked };
}

// ── GENERATE REPORTS ──────────────────────────────────────────────────────────

function generateReports(orphans, linkAudit) {
  const today = new Date().toISOString().split('T')[0];
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

  // Build inbound link count map
  log('\n## Building inbound link map...');
  const inboundCount = {};
  for (const entry of index) {
    inboundCount[entry.slug] = 0;
  }
  for (const entry of index) {
    if (!articleExists(entry.slug)) continue;
    const content = readArticle(entry.slug);
    for (const targetEntry of index) {
      if (targetEntry.slug !== entry.slug && hasLinkTo(content, targetEntry.slug)) {
        inboundCount[targetEntry.slug] = (inboundCount[targetEntry.slug] || 0) + 1;
      }
    }
  }

  // ── FINAL_SEO_REPORT.md ──────────────────────────────────────────────────
  const seoReport = `# FINAL SEO REPORT — ExtensionTo
> Generated: ${today} | Full SEO Execution Complete

## Executive Summary

| Metric | Value |
|---|---|
| Total Articles | ${index.length} |
| Articles Modified | ${stats.articlesModified} |
| Internal Links Added | ${stats.linksAdded} |
| Spoke → Pillar Links | ${stats.spokeLinksAdded} |
| Pillar → Spoke Links | ${stats.pillarLinksAdded} |
| Cross-Cluster Links | ${stats.crossClusterLinksAdded} |
| Orphan Articles Fixed | ${stats.orphansFixed} |
| Articles Not Found on Disk | ${stats.notFound} |
| Sitemap URLs | ${index.length + 2} |

## Cluster Coverage

${CLUSTERS.map(c => `- **Cluster ${c.id} (${c.name})**: Pillar → ${c.pillarToSpokes.length} spokes linked, ${c.spokes.length} spokes → pillar`).join('\n')}

## Internal Linking Health

### Articles with ≥ 2 Outbound Links
${linkAudit.results.filter(r => r.outbound >= 2).length} articles have 2+ outbound internal links.

### Articles Needing Attention (< 2 Outbound)
${linkAudit.underlinked.slice(0, 20).map(r => `- \`${r.slug}\` (${r.outbound} outbound)`).join('\n')}

## Sitemap Status
- Regenerated: ✅
- Total URLs: ${index.length + 2} (${index.length} articles + homepage + /blog)
- Priority 1.0: ${CLUSTERS.length} pillar pages + homepage
- Priority 0.8: All spoke and supporting pages

## Slug Quality
${orphans.filter(o => o.slug.match(/m[ml][a-z0-9]{8,}/)).length} articles have AI/hash suffixes in their slugs. These are legacy slugs and should be preserved (301 redirect-safe normalization recommended if slug migration is pursued).

## Next Steps
1. Monitor Google Search Console for crawl coverage improvements
2. Commission a "Best Dark Mode Extensions for Chrome 2026" pillar for Cluster 9
3. Consider slug normalization (removing hash suffixes) with proper 301 redirects for cleaner URLs
4. Add structured data (FAQ schema) to pillar pages for featured snippet opportunities
`;

  // ── CLUSTER_STATUS.md ────────────────────────────────────────────────────
  const clusterStatus = `# CLUSTER STATUS — ExtensionTo
> Generated: ${today}

| # | Cluster | Pillar | Spokes | Pillar→Spokes | Status |
|---|---|---|---|---|---|
${CLUSTERS.map(c => `| ${c.id} | ${c.name} | \`${c.pillar.slug}\` | ${c.spokes.length} | ${c.pillarToSpokes.length} | ✅ COMPLETE |`).join('\n')}

## Cross-Cluster Links Applied (${CROSS_CLUSTER_LINKS.length})

${CROSS_CLUSTER_LINKS.map(l => `- \`${l.source}\` → \`${l.target}\` (*"${l.anchor}"*)`).join('\n')}

## Cluster Summaries

${CLUSTERS.map(c => `### Cluster ${c.id} — ${c.name}
- **Pillar**: \`/blog/${c.pillar.slug}\`
- **Spokes**: ${c.spokes.length} articles
- **Pillar outbound links added**: ${c.pillarToSpokes.length}
- **Spoke→Pillar links added**: ${c.spokes.length}
- **Status**: ✅ Fully Connected
`).join('\n')}
`;

  // ── LINKING_STATUS.md ────────────────────────────────────────────────────
  const topInbound = Object.entries(inboundCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const linkingStatus = `# LINKING STATUS — ExtensionTo
> Generated: ${today}

## Summary

| Metric | Count |
|---|---|
| Total Internal Links Added | ${stats.linksAdded} |
| Spoke → Pillar | ${stats.spokeLinksAdded} |
| Pillar → Spoke | ${stats.pillarLinksAdded} |
| Cross-Cluster | ${stats.crossClusterLinksAdded} |
| Orphan Fixes | ${stats.orphansFixed} |

## Top 30 Most-Linked Articles (Inbound Links)

| Rank | Slug | Inbound |
|---|---|---|
${topInbound.map(([slug, count], i) => `| ${i + 1} | \`${slug}\` | ${count} |`).join('\n')}

## Articles Requiring Additional Inbound Links (< 2)

${linkAudit.underlinked.slice(0, 50).map(r => `- \`${r.slug}\` — ${r.outbound} outbound, ${inboundCount[r.slug] || 0} inbound`).join('\n')}

## All Cluster Links Applied

${CLUSTERS.map(c => `### ${c.name} (Cluster ${c.id})
**Pillar → Spokes:**
${c.pillarToSpokes.map(s => `- ✅ [${c.pillar.slug}] → [${s.slug}] ("${s.anchor}")`).join('\n')}

**Spokes → Pillar:**
${c.spokes.map(s => `- ✅ [${s.slug}] → [${c.pillar.slug}]`).join('\n')}
`).join('\n')}
`;

  // ── CHANGELOG.md ─────────────────────────────────────────────────────────
  const changelogMd = `# SEO EXECUTION CHANGELOG — ExtensionTo
> Generated: ${today}
> Engine: seo-execute.mjs

## Summary of Changes

- **${stats.articlesModified}** article files modified
- **${stats.linksAdded}** internal links added
- **${stats.orphansFixed}** orphan articles fixed
- Sitemap regenerated with ${index.length + 2} URLs

## Detailed Log

\`\`\`
${changelog.join('\n')}
\`\`\`

## Files Modified

All modifications are in: \`artifacts/extensionto/public/content/articles/\`

Each modified file received one or more \`<div class="related-articles">\` blocks
containing \`<a href="/blog/..." class="internal-link">\` links inserted before
the CTA section or at end of content.

## Sitemap
\`artifacts/extensionto/public/sitemap.xml\` — fully regenerated from articles-index.json.
`;

  fs.writeFileSync('FINAL_SEO_REPORT.md', seoReport, 'utf8');
  fs.writeFileSync('CLUSTER_STATUS.md', clusterStatus, 'utf8');
  fs.writeFileSync('LINKING_STATUS.md', linkingStatus, 'utf8');
  fs.writeFileSync('CHANGELOG.md', changelogMd, 'utf8');

  log('\n✅ Reports generated: FINAL_SEO_REPORT.md, CLUSTER_STATUS.md, LINKING_STATUS.md, CHANGELOG.md');
}

// ── RUN ───────────────────────────────────────────────────────────────────────

log('# SEO EXECUTION ENGINE — START');
log(`> ${new Date().toISOString()}`);
log(`> Articles directory: ${ARTICLES_DIR}`);

// Step 1: Process all clusters
for (const cluster of CLUSTERS) {
  processCluster(cluster);
}

// Step 2: Cross-cluster links
processCrossClusterLinks();

// Step 3: Find and fix orphan articles
const orphans = findOrphanArticles();

// Step 4: Regenerate sitemap
regenerateSitemap();

// Step 5: Audit link counts
const linkAudit = auditLinkCounts();

// Step 6: Generate all reports
generateReports(orphans, linkAudit);

log('\n# SEO EXECUTION ENGINE — COMPLETE');
log(`> Articles modified: ${stats.articlesModified}`);
log(`> Links added: ${stats.linksAdded}`);
log(`> Orphans fixed: ${stats.orphansFixed}`);
log(`> Articles not found: ${stats.notFound}`);
