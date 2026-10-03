# نتائج التجربة العادلة للذراعين (full — تشغيل #25، sha 85ab518c)

التاريخ: 2026-10-02 · النمط: full · 10 مواضيع · **3 محاولات مستقلة لكل ذراع لكل موضوع،
كل محاولة من الصفر، التوقف عند أول مقال يجتاز كل البوابات** (لا تخفيف بوابات، لا «قريب»،
لا اختيار أفضل مقال). المقالات artifacts فقط — لم يُنشر شيء على الموقع.

## قاعدة القرار (معدّلة بتاريخ 2026-10-02، العتبات حرفية كما كتبها المالك)

`adopt B iff success_within_3_attempts(B) >= success_within_3_attempts(A) AND
unsupported_claims(B) <= 0.60*unsupported_claims(A) AND
cost_per_successful_article(B) <= 8*cost_per_successful_article(A)`

## القرار

| المؤشر | الذراع A | الذراع B |
|---|---|---|
| النجاح خلال 3 محاولات | 7/10 (0.7) | 4/10 (0.4) |
| نجاح من أول محاولة | 3/10 (0.3) | 1/10 (0.1) |
| متوسط المحاولات | 2.1 | 2.6 |
| ادعاءات رقمية (المقالات الناجحة) | 166 | 37 |
| ادعاءات ترتيب/تفضيل | 101 | 48 |
| إجمالي الادعاءات | 243 | 79 |
| وُجد لها مصدر | 55 | 29 |
| **غير مدعومة** | **188** | **50** |
| نسبة غير المدعوم (B/A) | — | **0.263** (الشرط ≤ 0.60 ✓) |
| الكلفة الكلية (أرضية إدخال) | $0.0815 | $0.8186 |
| كلفة المقال الناجح | $0.0116 | $0.2046 |
| نسبة الكلفة (B/A) | — | **17.577×** (الشرط ≤ 8× ✗) |

**التطبيق الحرفي للقاعدة:**
1. النجاح خلال 3 محاولات: B (0.4) ≥ A (0.7)؟ → **لا** ✗
2. ادعاءات غير مدعومة: 0.263 ≤ 0.60؟ → نعم ✓
3. كلفة المقال الناجح: 17.577× ≤ 8×؟ → **لا** ✗

**القرار: `adopt_B = false` — KEEP A (improved pipeline); research agent may remain an optional tool**

حارس المقدمة: تحقق («both arms produced >=1 successful article») — القاعدة قُيّمت على بيانات حقيقية.

## جدول المواضيع (كل ذراع: نجاح/محاولات، كلمات، استدعاءات، كلفة $)

| الموضوع | A: نجاح | كلمات | نداءات | $ | B: نجاح | كلمات | نداءات | $ |
|---|---|---|---|---|---|---|---|---|
| best tab manager chrome extension | ✓ att1 | 2974 | 13 | 0.0041 | ✓ att2 | 2977 | 32 | 0.0863 |
| how to organize chrome bookmarks efficiently | ✓ att1 | 2854 | 9 | 0.0032 | ✗ 3/3 | 0 | 48 | 0.0950 |
| best free ad blocker for chrome android | ✓ att2 | 2925 | 27 | 0.0081 | ✗ 3/3 | 0 | 48 | 0.1162 |
| chrome extensions for students studying online | ✗ 3/3 | 0 | 38 | 0.0124 | ✗ 3/3 | 0 | 42 | 0.0753 |
| best password manager chrome extension 2026 | ✓ att2 | 2974 | 27 | 0.0074 | ✓ att2 | 3041 | 32 | 0.0927 |
| how to speed up a slow chrome browser | ✓ att2 | 2995 | 27 | 0.0086 | ✗ 3/3 | 0 | 42 | 0.0775 |
| best screenshot chrome extension full page | ✗ 3/3 | 0 | 40 | 0.0117 | ✓ att1 | 2601 | 16 | 0.0501 |
| youtube mp3 downloader chrome extension safe alternatives | ✓ att1 | 2930 | 13 | 0.0050 | ✓ att3 | 2801 | 48 | 0.1256 |
| chrome extensions for remote work productivity | ✓ att3 | 3002 | 37 | 0.0095 | ✗ 3/3 | 0 | 30 | 0.0165 |
| how to enable dark mode on every website chrome | ✗ 3/3 | 0 | 42 | 0.0115 | ✗ 3/3 | 0 | 48 | 0.0834 |

إجمالي الاستدعاءات: A = 273، B = 386. الكلفة أرضية من أسعار الإدخال فقط
(أسعار الإخراج غير مؤكدة — مصرّح به). سقف التشغيل $5 — الاستهلاك الفعلي
$0.9001.

## الادعاءات الرقمية/السياسية لكل ذراع (على المقالات الناجحة فقط)

مصدر العدّ: `claims.json` لكل مقال فائز (تعريف مدقق مسبق: المصدر = رابط،
أو تحوّط من firsthand، أو حقيقة موجودة في مرجع SERP الخاص بالعدّاء — نفس
المجموعة للذراعين، بدون استدعاءات نموذج).

- **الذراع A** (7 مقالاً): إجمالي الادعاءات 243
  (رقمية 166، ترتيب/تفضيل 101) —
  وُجد لها مصدر 55 — **غير مدعومة 188**.
- **الذراع B** (4 مقالاً): إجمالي الادعاءات 79
  (رقمية 37، ترتيب/تفضيل 48) —
  وُجد لها مصدر 29 — **غير مدعومة 50**.

### قوائم الادعاءات غير المدعومة (4 مقالات على الأقل)

### best-tab-manager-chrome-extension-armA-attempt1 — 21 ادعاءً غير مدعوم

1. We lab-tested 10 leading tab managers with a real 100+ tab workload, measured actual memory, CPU, and battery impact, and audited every permission and Manifest V3 status.
2. The Marvellous Suspender and OneTab cut memory by 70-85% in one click; native took 45+ minutes to suspend the same 100 tabs. **4.
3. Every extension was tested on the same machine: MacBook Pro M2 / 16GB RAM, Chrome 126.0.6478.127 (64-bit), clean profile with no other extensions. **The 100+ Tab Workflow:** We opened 112 tabs — a realistic mix of heavy 
4. Cut RAM 84% (highest), 89KB, Manifest V3. **Pros:** 70-85% cut, shareable, no account. **Cons:** No auto-save/sync. **Verdict:** Fastest clear. ### 3.
5. Battery drain dropped to 9-11% per hour vs 22% baseline.
6. Workona and Toby added slight overhead (+120-210MB RAM idle) due to their rich UI, but still saved net 2.8GB when suspending. **Key Insight Competitors Miss:** Extensions that *only save* sessions (Session Buddy, Tab Ses
7. 7 of 10 are free forever.

**100% Free & Unlimited:** OneTab, Session Buddy, The Marvellous Suspender, Cluster, Tab Wrangler, Tab Session Manager, Auto Tab Discard.
8. These cover 90% of needs.
9. Session Buddy + Marvellous Suspender together give you premium backup + performance for $0.

**Freemium (Paid unlocks team/cloud power):**
- **Workona Free:** 10 workspaces, 50 tabs/workspace, basic suspend. **Pro $7/mo:
10. Worth it if you manage client projects.
- **Toby Free:** 3 collections, 30 saves/mo. **Teams $6/mo/user:** Unlimited, shared spaces.
11. Only for visual teams.
- **Partizion Free:** 3 partitions. **Pro $29/year:** Unlimited partitions & isolation.
12. When Chrome killed Manifest V2, over 40% of tab managers vanished or broke. **Abandonment Audit (2026):**
We flagged extensions with no update in 18+ months as HIGH RISK.
… و9 أخرى

### best-tab-manager-chrome-extension-armB-attempt2 — 12 ادعاءً غير مدعوم

1. Top tools auto-suspend inactive tabs, freeing up to 95% of memory while keeping tabs visible for one-click reload.
2. If every 30 minutes, you are a switcher.
3. For David, OneTab or Session Buddy is perfect: free, +5 ms overhead, no account needed.
4. In one snippet, OneTab showed only +5 ms of overhead, reflecting its lightweight, dormant-until-clicked design.
5. In contrast, workspace managers that inject content scripts into every page or constantly sync in the background can add 30 to 100 ms or more.
6. Some managers keep a persistent service worker alive that consumes 80 to 150 MB even when idle.
7. Features like automatic suspension after 15 minutes of inactivity, exclusion lists for audio or form-filled tabs, and lazy loading on restore are signs of a mature engine.
8. Our methodology for this 2026 guide blended evidence we could verify with practical frameworks you can apply in 10 minutes.
9. If it is over 2 GB with 30 tabs, you need strong suspension.
10. If it is under 1 GB but your tab bar is chaotic, you need organization.
11. It collapses all tabs into a list with a single click and can reduce memory usage by up to 95%, with independent lookups showing as little as +5 ms Page CPU Time overhead.
12. Toby, Workona, Amazing Tabs, and Marqly offer free tiers with limited workspaces or sync, then charge roughly $8 to $19 per month for premium features and team collaboration.

### how-to-organize-chrome-bookmarks-efficiently-armA-attempt1 — 15 ادعاءً غير مدعوم

1. Delete the auto-filled title and use a keyword format like `Tool - Use Case - Keyword` to make search 3x faster.
2. It is 10x faster.

## How to Show, Customize and Organize the Bookmarks Bar for Instant Access

The Bookmarks Bar is not for storage — it’s your speed-dial for instant access.
3. A 2023 browser UX study found users locate favicon-only bookmarks 47% faster than text-heavy ones.
4. A library of 1,500 bookmarks averages 12-18% duplicates and 8-12% dead links (404s), based on analysis of 2,000+ user libraries.

**1.
5. Native Chrome Search (Fastest Filter):**
In chrome://bookmarks, use the top search bar with operators.
6. One test of 1,200 bookmarks found 94 dead links in 3 minutes.
7. It’s the #1 time-saver for efficient bookmark organization.

**Use Tab Groups Before Bookmarking:** Before you bookmark, group tabs.
8. This separation prevents mobile clutter.

**Statistics:** Google reports bookmark sync failures affect ~2% of users after major Chrome updates.
9. Users with a recent HTML export recover in 2 minutes vs.
10. Yes, if unmanaged — but not how you think.

**Performance Statistics:** An internal Chromium benchmark shows that 1,000 bookmarks add ~120-180ms to Chrome startup time and ~15MB RAM if the Bookmarks Bar is set to show.
11. With 3,000+ bookmarks, startup can lag by 400-600ms and favicons can consume 50-80MB.
12. 3.  **Archive Aggressively:** Move 70% of your library out of the Bookmarks Bar tree into "Other bookmarks" > Archive.
… و3 أخرى

### best-free-ad-blocker-for-chrome-android-armA-attempt2 — 8 ادعاءً غير مدعوم

1. NextDNS (Private DNS) scored 91/100 (+0.2% battery) and AdGuard DNS 89/100 (+0.2%) – lightest, no app needed, but no cosmetic filtering.
2. Blokada 5 scored 87/100 (+3.1%).
3. They can skip 40-60% of ads when watching YouTube in Chrome via m.youtube.com using AdGuard's filters.
4. Private DNS alone blocks 0% of YouTube video ads.

### Q: Will Manifest V3 break ad blockers on Chrome Android?
5. A: Private DNS methods save 43% data with almost zero battery drain (+0.2%/hour).
6. VPN apps save slightly more data (47%) but use ~2.8% more battery per hour due to active filtering.

### Q: Is it safe to give an ad blocker VPN permission on Android?
7. It has a built-in ad blocker enabled by default, blocks trackers, and loads pages 3x faster.
8. In under a minute, Private DNS cuts page load times by 35%, saves 43% of mobile data, and blocks nearly 9 out of 10 ads in Chrome, while the free app pushes that to 96% with complete pop-up control.


## فقرة الصدق: ما الذي لم يقسه فحص المطابقة وكيف قاسته التجربة

- **فحص المطابقة (model-fit 12/12) لا يميّز**: كل النماذج الـ12 اجتازت فحص
  التطابق (بلا فشل ولا فاصل درجات) — أي أنه بلا قوة تمييزية على جودة
  القرار أو النقد أو الكتابة. لم يقس: جودة قرارات المنسّق (اختيار الزوايا
  وموعد التوقف)، جودة نقد الـCRITIC وفائدة إصلاحاته، وجودة النثر بمعنى
  قابلية القراءة والإقناع.
- **ما قاسته التجربة فعلاً**:
  1. *مسارات الاستدلال عبر journal*: كل خطوة ذراع B مسجلة JSONL
     (خطة → 3 باحثين متوازيين → كتابة → بوابات → إصلاحات قسوم → ناقد →
     بوابات) — تسمح بمراجعة سبب كل قرار لاحقاً، لكنها لا تقيّم جودته.
  2. *عدد الإصلاحات المبوّبة وأثرها*: repairs لكل محاولة مسجل
     (متوسط A أعلى من B على المواضيع الناجحة) — يقيس كم مرة احتاج
     النموذج تدخلاً، لا جودة النتيجة النهائية وحدها.
  3. *فرق البوابات (gates delta)*: البوابات الحتمية نفسها للذراعين —
     النجاح = اجتياز كلها. يقيس الامتثال الهيكلي لا الإتقان البلاغي.
  4. *الزوج المكفوف*: 3 أزواج بلا وسوم (pair1..3) — تُمكّن تقييماً بشرياً
     أعمى لجودة الكتابة، وهو ما لم يقسه أي فحص آلي. مفتاح فك التعمية
     بصمته في تعليق PR فقط، والمحتوى محفوظ artifact.
- **تحفظات**: 3 مواضيع فشلت فيها مراجع SERP (reference_results=0) —
  تدقيق الادعاءات اعتمد الروابط/التحوّط فقط (مصرّح به). كلفة B أعلى
  بنيوياً (منسّق + 3 باحثين + ناقد لكل مقال). عيّنة واحدة لكل موضوع
  ناجح (أول نجاح، بلا إعادة اختيار) — النتائج عرضة لتباين النموذج.

## محاسبة التكلفة (تصحيح التناقض $0.05 مقابل $1.23)

- **$1.23** (التقرير الأقدم) كان **تقديراً متشائماً** لا مشتقاً من artifacts —
  غير قابل لإعادة الإنتاج من أي بيانات أولية.
- **$0.05** (التقرير الأحدث) كان أرضية مقاسة جزئية: ذراع A فقط، مع تجاهل
  الاستهلاك الجزئي لذراع B عند الخطأ (خلل المحاسبة الذي أمر المالك
  بإصلاحه — أُصلح في PR #469: دفتر الاستخدام يُملأ من الحالة الحية عند أي
  خطأ، وjournal.jsonl يُكتب دائماً).
- **الرقم الصحيح** (من artifacts التشغيلات 8-25):
  - مقاس: runs 15-19 ذراع A فقط $0.0150 + تشخيصان #14 $0.0003 و#12 $0.0000
  - تقديري مصرّح به: استهلاك B الجزئي في runs 15-19 ≈ $0.05-0.15، وفحوص
    المفاتيح الحية ≈ $0.01-0.03
  - سموك هذه الجولة (#20-#24) مقاس بالكامل بالمحاسبة الجديدة: $0.048 +
    $0.061 + $0.062 + $0.057 + $0.105 = **$0.333**
  - full #25 مقاس: $0.901 (سقف $5 سليم)
- **الإجمالي عبر كل تشغيلات التجربة ≈ $1.25-1.35** (الأدق: مقاس $1.28
  + تقديري $0.06-0.18). طريقة الحساب: مجموع (input_tokens/1e6) × سعر
  الإدخال للنموذج المحلوم من `CLEANAPIS_CATALOG`، لكل استدعاء نجح في
  الوصول للمزود، تشمل المحاولات الفاشلة.

## أين توجد الملفات

- الأزواج المكفوفة: `pair1_A.md`/`pair1_B.md` (أفضل مدير تبويبات)،
  `pair2_A/B.md` (مدير كلمات المرور 2026)، `pair3_A/B.md` (بدائل تحويل
  YouTube MP3). A/B في الاسم = مرشح 1/مرشح 2 داخل الزوج — **ليس** الذراع.
- المقالات الناجحة بالاسم الصريح: `articles/<slug>-arm{A,B}-attempt<N>.md`.
- القراءة للحفاظ على التعمية: اقرأ الأزواج قبل مجلد articles.
