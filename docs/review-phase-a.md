# تقرير مراجعة «المرحلة السابقة» (Phase A Review)

> **النطاق:** كل ما دُفع مباشرة إلى `main` بعد عملية الدمج المرجعية `7b2c1a3f` (دمج PR #452 بتاريخ 2026‑10‑01)
> وحتى `ff2456fd` (دمج PR #437). هذا التقرير توثيقي فقط — **لا يُنفَّذ أي أمر revert منه**.

## 1) ملخص تنفيذي

خلال نافذة المرحلة السابقة دُفعت **5 عمليات دمج مباشرة إلى main** (أربع منها دمج فروع محلياً
بدون Pull Request، وواحدة دمج PR ‏#437 عبر واجهة GitHub). هذه العمليات عدّلت:
`seo-quality.yml` (مرتان)، ميزانية الأداء `scripts/performance-budget.mjs`،
**73 ملف مقال + vercel.json** في commit إصلاح الروابط الواحد، وملف `scripts/sync-articles.ts`
(عبر ‏#437). فاحص الروابط الداخلية الخاص بالمستودع (`scripts/internal-link-smoke-test.mjs`)
كان يرصد **72 رابطاً داخلياً مكسوراً** قبل إصلاحها في `1c5424cd` — القائمة الكاملة أدناه (بند 3).

**نتيجة CI الحالية على main: أخضر** (تشغيلتا `ff2456fd` و`1c5424cd` ناجحتان —
run ‏36920025363 و‏36912853367) بعد إصلاح `2237cdc1` الذي أضاف تثبيت اعتماديات بايثون
كان غيابها يُسقط `unittest discover` بخطأ `ModuleNotFoundError: anthropic` على كل فرع.

## 2) الـcommits الخمسة: الملفات، العدد، وأوامر revert الجاهزة (غير منفَّذة)

| # | Commit | التاريخ | الوصف | الملفات | الأمر الجاهز (لا تنفذه) |
|---|--------|---------|-------|---------|--------------------------|
| 1 | `2237cdc1` | 2026‑10‑01 | ci: install python deps for SEO quality unit tests | 1: `.github/workflows/seo-quality.yml` | `git revert -m 1 2237cdc1` |
| 2 | `fb678282` | 2026‑10‑01 | ci: raise seo-quality timeout 15 -> 40 minutes | 1: `.github/workflows/seo-quality.yml` | `git revert -m 1 fb678282` |
| 3 | `29c504a7` | 2026‑10‑01 | ci: raise sample-article HTML budget 30k -> 60k bytes | 1: `scripts/performance-budget.mjs` | `git revert -m 1 29c504a7` |
| 4 | `1c5424cd` | 2026‑10‑01 | fix(links): repair internal links surfaced by seo-quality gate | **74**: ‏73 مقالاً + `vercel.json` | `git revert -m 1 1c5424cd` |
| 5 | `ff2456fd` | 2026‑10‑01 | fix: fail loudly when any article frontmatter cannot be parsed (merge PR ‏#437) | 1: `scripts/sync-articles.ts` | `git revert -m 1 ff2456fd` |

ملاحظات على البند 4 (`1c5424cd`) — المقالات الـ73 المعدّلة بالاسم:

`a-game-changer-for-efficient-browsing`, `a-game-changer-for-productivity`, `ai-agent-browser-extensions-2026`, `ai-research-assistant-chrome-extensions`, `an-image-downloader-extension-for-chrome`, `android-chrome-adblocker`, `batch-open-tabs-scheduled-chrome`, `boosting-productivity-with-light-browser-extensions-for-slow-pc`, `calendar-chrome-extensions`, `chrome-extensions-for-students-studying-online-the-only-guide-youll-ever-need`, `chrome-passkeys-passwordless-guide-2026`, `chrome-pop-up-blocker`, `cookie-consent-blocker-chrome`, `discover-the-best-file-downloader-extension-chrome`, `discover-the-best-privacy-extension-chrome`, `enhancing-your-browsing-experience-with-avast-online-security-chrome`, `extension-ad-block-chrome`, `extension-ad-block-plus-faster-browsing`, `extension-adblock-chrome-android-2`, `extension-adblock-google-chrome-3`, `extension-auto-refresh-plus-3`, `ghostery-chrome-extension-winner`, `grammarly-extension-to-chrome-3`, `history-search-chrome-extensions`, `how-to-block-youtube-ads-with-ghostery-extension`, `how-to-enable-dark-mode-on-google-search`, `how-to-enable-extensions-in-chrome-android`, `how-to-run-chrome-extensions-on-brave-android`, `mouse-gestures-chrome-extensions`, `mute-noisy-tabs-chrome`, `new-tab-speed-dial-chrome`, `pdf-tools-chrome-extensions`, `pop-up-blocker-for-chrome-partial`, `popup-blocker-streaming-sites`, `qr-code-generator-scanner-chrome-extensions`, `rss-reader-chrome-extensions-2026`, `screen-grab-chrome-2025-1`, `screen-recorder-chrome-extensions`, `session-isolation-multiple-accounts`, `the-best-adblock-for-android-chrome`, `the-best-free-download-manager-for-chrome`, `the-latest-idm-extension-for-chrome-free`, `the-power-of-extension-adblock-chrome-android`, `the-power-of-ghostery-extension-chrome-2026`, `top-chrome-devtools-tips-for-mobile`, `tts-chrome-5`, `unlock-ad-free-youtube-browsing-youtube-ad-blocker-extension-chrome`, `unlock-online-privacy-the-power-of-avast-antitrack-extension-chrome`, `unlock-the-power-of-ad-blocking-on-android`, `unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper`, `unlock-the-power-of-responsive-design`, `unlock-the-power-of-youtube-subtitle-downloader-chrome`, `unlocking-ad-free-browsing-the-best-adblock-for-chrome-on-android`, `unlocking-efficiency-the-best-productivity-tools-for-chrome-browser`, `unlocking-efficiency-the-best-spreadsheets-software-for-small-business`, `unlocking-enhanced-browser-security-kaspersky-chrome`, `unlocking-online-privacy-ghostery-for-chrome-android`, `unlocking-online-security-the-power-of-avast-extension-google-chrome`, `unlocking-productivity-the-best-chrome-extensions-for-web-developers`, `unlocking-the-power-of-ad-blocking-adblock-in-chrome-mobile`, `unlocking-the-power-of-avast-extension-chrome`, `unlocking-the-power-of-avast-password-chrome-secure-browsing`, `unlocking-the-power-of-extension-brave-mobile`, `unlocking-the-power-of-google-chat-extension`, `unlocking-the-power-of-meta-tags-chrome-extension-for-meta-tags`, `unlocking-the-power-of-password-management`, `unlocking-the-power-of-yandex-browser-on-chrome-web-store`, `using-dark-mode-on-quora-for-better-focus-4`, `veepn-extension-to-chrome-4`, `vertical-tabs-chrome-sidebar-guide`, `web-highlighter-annotation-extensions-research`, `whatsapp-web-enhancer-extensions`, `windscribe-extension-to-chrome-9`

وتعديل `vercel.json` فيه اقتصر على **إضافة redirect واحد**: المسار
`/blog/enhance-your-browsing-experience`.

كل الأوامر أعلاه **جاهزة للتنفيذ عند الحاجة فقط**؛ وهي غير منفَّذة، والتقرير لا يوصي بتنفيذها
(الإصلاحات الثلاثة الأولى أعادت تشغيل CI بعد عطل اعتماديات، والرابعة أصلح روابط مكسورة فعلاً).

### سياق سابق خارج نافذة المرحلة

إعادة تفعيل أتمتة daily-article وتحويلها لمسار cleanapis تمت في `ec4b636e`
(«Agent system upgrade … re-enabled daily automation») وهي **قبل** نافذة هذه المراجعة،
وقد عُطّل الworkflow لاحقاً عبر API (الحالة الآن `disabled_manually`، الملف لم يُلمس).
كذلك موجة «unhide/stale‑308» (‏`b165f1e5` وأشباهها) عدّلت `vercel.json` قبل النافذة — خارج النطاق.

## 3) الروابط الـ72 المفكوكة (المقال، النص، الرابط الأصلي)

**المنهجية:** تشغيل نسخة طبق الأصل من فاحص المستودع الرسمي
(`scripts/internal-link-smoke-test.mjs`) ضد حالة **ما قبل الإصلاح** (`1c5424cd^`)
في worktree مؤقت — نفس الأداة التي أنتجت رقم 72 الأصلي.
النتيجة: **72 رابطاً مكسوراً موزعة على 17 هدفاً مميزاً** عبر 44 مقالاً (الجدول أدناه صف بكل رابط).
الهدف الأشيع `/undefined` (‏38 رابطاً) — خطأ توليد slug فارغ؛ ثم
`/blog/session-buddy-chrome-extension-guide` (‏10) وهكذا.
الإصلاح أعاد توجيهها إلى مقالات حية أو حذف الرابط، وأضاف الredirect المذكور أعلاه.

| المقال (slug) | النص (anchor) | الرابط الأصلي (مكسور) |
|---|---|---|
| `a-game-changer-for-efficient-browsing` | Unlocking Enhanced Productivity: The Power of Extension Auto Refresh Plus | `/undefined` |
| `boosting-productivity-with-light-browser-extensions-for-slow-pc` | Light Popup Blocker | `/undefined` |
| `boosting-productivity-with-light-browser-extensions-for-slow-pc` | OneTab | `/undefined` |
| `boosting-productivity-with-light-browser-extensions-for-slow-pc` | ProTab Suspender | `/undefined` |
| `discover-the-best-privacy-extension-chrome` | Ghostery for Chrome Android guide | `/undefined` |
| `enhancing-your-browsing-experience-with-avast-online-security-chrome` | Avast Password Manager | `/undefined` |
| `extension-ad-block-plus-faster-browsing` | Discover the Power of a Lightweight Ad Blocker Chrome: Boost Your Browsing Experience | `/undefined` |
| `extension-auto-refresh-plus-3` | Unlocking a Faster Browsing Experience: The Power of Extension Ad Block Plus | `/undefined` |
| `how-to-block-youtube-ads-with-ghostery-extension` | Unlocking Online Privacy: A Comprehensive Guide to Ghostery for Chrome Android | `/undefined` |
| `how-to-block-youtube-ads-with-ghostery-extension` | Unlocking Online Privacy: A Comprehensive Guide to Ghostery for Chrome Android | `/undefined` |
| `how-to-block-youtube-ads-with-ghostery-extension` | uBlock Origin vs Ghostery for Chrome Android: A Comprehensive Comparison | `/undefined` |
| `how-to-enable-dark-mode-on-google-search` | YouTube dark mode desktop 2026 | `/undefined` |
| `how-to-enable-dark-mode-on-google-search` | how to enable dark mode on Wikipedia for night reading | `/undefined` |
| `how-to-enable-dark-mode-on-google-search` | how to force dark mode on the Amazon website | `/undefined` |
| `how-to-enable-extensions-in-chrome-android` | React DevTools on Chrome Mobile: Does It Work? | `/undefined` |
| `how-to-enable-extensions-in-chrome-android` | React DevTools on Chrome Mobile: Does It Work? | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Quick Screenshot Lite | `/undefined` |
| `screen-grab-chrome-2025-1` | Redirect Shield | `/undefined` |
| `the-power-of-extension-adblock-chrome-android` | Unlock Ad-Free YouTube Browsing | `/undefined` |
| `unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper` | Facebook Pixel Helper vs Meta Pixel Helper: The 2026 Guide | `/undefined` |
| `unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper` | Facebook Pixel for Chrome: Tracking Made Easier | `/undefined` |
| `unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper` | How to Fix Facebook Pixel Helper Not Working 2026: A Comprehensive Guide to Troubleshoo... | `/undefined` |
| `unlocking-efficiency-the-best-productivity-tools-for-chrome-browser` | The Ultimate Browser Tools Guide: Boost Productivity & Efficiency | `/undefined` |
| `unlocking-enhanced-browser-security-kaspersky-chrome` | NoScript for Chrome: Better Security and Speed | `/undefined` |
| `unlocking-the-power-of-extension-brave-mobile` | Adblock in Chrome Mobile | `/undefined` |
| `unlocking-the-power-of-extension-brave-mobile` | Does Yandex Browser Support Chrome Extensions? | `/undefined` |
| `unlocking-the-power-of-extension-brave-mobile` | React DevTools on Chrome Mobile: Does It Work? | `/undefined` |
| `unlocking-the-power-of-extension-brave-mobile` | TubeBuddy for Chrome: Features Creators Want | `/undefined` |
| `unlocking-the-power-of-google-chat-extension` | Excel Extensions Worth Adding to Chrome | `/undefined` |
| `unlocking-the-power-of-yandex-browser-on-chrome-web-store` | NoScript for Chrome: Better Security and Speed | `/undefined` |
| `unlocking-the-power-of-yandex-browser-on-chrome-web-store` | NoScript for Chrome: Better Security and Speed | `/undefined` |
| `windscribe-extension-to-chrome-9` | Enpass Extension Chrome | `/undefined` |
| `batch-open-tabs-scheduled-chrome` | scheduling tab sessions | `/blog/session-buddy-chrome-extension-guide` |
| `mute-noisy-tabs-chrome` | Session Buddy Chrome Extension | `/blog/session-buddy-chrome-extension-guide` |
| `mute-noisy-tabs-chrome` | Session Buddy Chrome Extension: Save, Restore, and Audit Browser Sessions | `/blog/session-buddy-chrome-extension-guide` |
| `rss-reader-chrome-extensions-2026` | Session Buddy Chrome Extension | `/blog/session-buddy-chrome-extension-guide` |
| `rss-reader-chrome-extensions-2026` | extended reading sessions | `/blog/session-buddy-chrome-extension-guide` |
| `screen-recorder-chrome-extensions` | your recording sessions | `/blog/session-buddy-chrome-extension-guide` |
| `session-isolation-multiple-accounts` | Session Buddy | `/blog/session-buddy-chrome-extension-guide` |
| `session-isolation-multiple-accounts` | Session Buddy Chrome Extension: Save, Restore, and Audit Browser Sessions | `/blog/session-buddy-chrome-extension-guide` |
| `session-isolation-multiple-accounts` | isolated browsing sessions for each | `/blog/session-buddy-chrome-extension-guide` |
| `vertical-tabs-chrome-sidebar-guide` | width across sessions | `/blog/session-buddy-chrome-extension-guide` |
| `history-search-chrome-extensions` | translated to better user experience | `/blog/printfriendly-chrome-extension-guide` |
| `qr-code-generator-scanner-chrome-extensions` | PrintFriendly Chrome Extension | `/blog/printfriendly-chrome-extension-guide` |
| `rss-reader-chrome-extensions-2026` | PrintFriendly | `/blog/printfriendly-chrome-extension-guide` |
| `web-highlighter-annotation-extensions-research` | leads to better comprehension | `/blog/printfriendly-chrome-extension-guide` |
| `mouse-gestures-chrome-extensions` | custom ones without diving into | `/blog/chrome-new-tab-extension-guide` |
| `new-tab-speed-dial-chrome` | New Tab Dashboard Widgets | `/blog/chrome-new-tab-extension-guide` |
| `new-tab-speed-dial-chrome` | choosing a dashboard without losing control | `/blog/chrome-new-tab-extension-guide` |
| `calendar-chrome-extensions` | the Google Dictionary extension | `/blog/google-dictionary-chrome-extension-guide` |
| `history-search-chrome-extensions` | extensions and dictionary plugins that | `/blog/google-dictionary-chrome-extension-guide` |
| `pdf-tools-chrome-extensions` | PDF Editor Extensions for Chrome: What They Can Do | `/blog/unlocking-the-power-of-pdf-editor-chrome-extensions-a-comprehensive-guide-mo4si115nvz` |
| `pdf-tools-chrome-extensions` | This comprehensive guide cuts | `/blog/unlocking-the-power-of-pdf-editor-chrome-extensions-a-comprehensive-guide-mo4si115nvz` |
| `session-isolation-multiple-accounts` | Chrome Extensions and Separate Profiles: Keep Work and Personal Access Apart | `/blog/chrome-extensions-separate-profiles-guide` |
| `session-isolation-multiple-accounts` | or using separate browsers until | `/blog/chrome-extensions-separate-profiles-guide` |
| `whatsapp-web-enhancer-extensions` | Chrome Extension Keyboard Shortcuts: Set, Test, and Avoid Conflicts | `/blog/chrome-extension-keyboard-shortcuts-guide` |
| `whatsapp-web-enhancer-extensions` | test for conflicts by using | `/blog/chrome-extension-keyboard-shortcuts-guide` |
| `ai-agent-browser-extensions-2026` | User-Agent Switcher for Chrome | `/blog/user-agent-switcher-chrome-guide` |
| `chrome-extensions-for-students-studying-online-the-only-guide-youll-ever-need` | How to Use Google Docs for Remote Learning – A Step‑by‑Step Guide | `/guides/google-docs-remote-learning` |
| `chrome-extensions-for-students-studying-online-the-only-guide-youll-ever-need` | Top 10 Free Tools for Virtual Group Projects | `/guides/virtual-group-tools` |
| `chrome-extensions-for-students-studying-online-the-only-guide-youll-ever-need` | Chromebook Battery‑Saving Hacks for Students | `/guides/chromebook-battery-hacks` |
| `how-to-run-chrome-extensions-on-brave-android` | Pocket | `/extension/pocket` |
| `how-to-run-chrome-extensions-on-brave-android` | Grammarly | `/extension/grammarly` |
| `mouse-gestures-chrome-extensions` | Chrome Extension Side Panel: How It Works and Which Limits Matter | `/blog/chrome-extension-side-panel-guide` |
| `mouse-gestures-chrome-extensions` | How to Update Chrome Extensions Manually and Verify the Result | `/blog/update-chrome-extension-manually-guide` |
| `session-isolation-multiple-accounts` | access customer profiles without logging | `/blog/chrome-extension-profile-switch-guide` |

توزيع الأهداف الـ17: `/undefined`×38، ‏`session-buddy-chrome-extension-guide`×10،
`printfriendly-chrome-extension-guide`×4، ‏`chrome-new-tab-extension-guide`×3،
`chrome-extension-keyboard-shortcuts-guide`×2، ‏`chrome-extensions-separate-profiles-guide`×2،
`google-dictionary-chrome-extension-guide`×2، ‏`…pdf-editor-chrome-extensions…mo4si115nvz`×2،
و7 أهداف بمثيل واحد (`chrome-extension-side-panel-guide`، ‏`update-chrome-extension-manually-guide`،
`chrome-extension-profile-switch-guide`، ‏`guides/google-docs-remote-learning`،
`guides/virtual-group-tools`، ‏`guides/chromebook-battery-hacks`، ‏`user-agent-switcher-chrome-guide`،
`extension/pocket`، ‏`extension/grammarly` — الجدول أعلاه شامل).

## 4) «المقالات المحذوفة المستهدفة» — الدليل الكامل

فُحصت نافذة المرحلة بالكامل (`7b2c1a3f..ff2456fd`) بـ`git log --diff-filter=D`:
**لا يوجد أي commit في النافذة حذف أي ملف إطلاقاً** (ولا مقالاً ولا غيره).
ومع ذلك وُثّق أدناه كل ما يمكن إثباته يخص «الحذف» المرتبط بهذه المرحلة:

1. **مقال واحد محذوف فعلاً كان هدفاً للروابط المكسورة:**
   `unlocking-the-power-of-pdf-editor-chrome-extensions-a-comprehensive-guide-mo4si115nvz`
   حُذف قبل المرحلة في `57bf72ad` («purge old markdown articles») وظل رابطان يشيران إليه
   حتى أصلحهما `1c5424cd`.
2. **مقالات خط daily-article (المستهدفة بحذفٍ محتمل بقرار المالك) — 3 مقالات مميزة فقط:**
   - `chrome-extensions-for-students-studying-online-the-only-guide-youll-ever-need`
     (أُنشئ في `187f0966`، 2026‑09‑29) — **حيّ ومنشور**.
   - `chrome-extensions-for-focus-and-deep-work-sessions-the-only-hands-on-tested-privacy-audited-performance-benchmarked-guide`
     (أُنشئ في `f7173185`، 2026‑09‑30) — **حيّ ومنشور**.
   - `best-chrome-extensions-for-accessibility-boost-your-browsing-experience`
     (أُنشئ في `63815e8e`، 2026‑08‑05) — ملفه موجود على main (مصيره النهائي مرهون بفهرس النشر الحالي).
   ظهرت المقالان الأخيران في تشغيلات جانبية (فروع) قبل وصولها main — وهو ما فُسّر سابقاً كـ«404».
3. **خلاصة:** رقم «خمسة» لم يُعثر له على مقابل في تاريخ المستودع ضمن هذه النافذة أو خارجها
   (فحص كل عمليات حذف المقالات في التاريخ: 6 commits فقط — 1، ‏34، ‏1، ‏1، ‏1303، ‏23 ملفاً؛
   لا شيء منها خماسي ولا داخل النافذة). إن كان المالك يقصد خماسية محددة بعناوين معروفة،
   يكفي إرسال أسمائها لتُثبَّت في هذا التقرير فوراً.

## 5) ملاحظات ختامية

- حماية `main` دنيا (بلا required checks) ولذلك مرّت الدفعات المباشرة دون مانع تقني؛
  الأداة الوحيدة التي كانت ستوقفها هي فاحص الروابط (وقد أصلحتها نفسها لاحقاً).
- فحص `TestSprite Pre-Check` الخارجي فاشل مستودعياً على كل الرؤوس (عطل خارجي، لا يتعلق بهذه المرحلة).
- هذا الملف توثيق فقط: لا يحتوي أي تنفيذ، ولا يلمس أي كود إنتاجي.
