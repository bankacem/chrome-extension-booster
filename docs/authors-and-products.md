# Authors & Products — جرد قراءة فقط (بند 4 من توجيه المالك 2026-10-06)

**الحالة:** وثيقة جرد وتحليل — لا تعدّل أي مقال أو كود. كل الأرقام محسوبة آلياً من main الحالي (`c2d5fec5` تحضيراً للدفعة 6) بتاريخ 2026-10-06، بلا أي استدعاء نموذج.

---

## (أ) المؤلفون في المقالات المنشورة

### قيم author وauthor_image (881 مقالاً منشوراً)

| author | مقالات | author_image الغالبة |
|---|---|---|
| `James Mitchell` | **791** | `/content/images/authors/james-mitchell.png` (791) |
| *(بدون قيمة)* | **61** | *(بدون قيمة — ضمن 89 بلا صورة)* |
| `Admin` | **14** | *(بدون قيمة)* |
| `Miccart Phen` | **13** | *(بدون قيمة)* |
| `Manus AI` | **1** | *(بدون قيمة)* |
| `James Carter` | **1** | `/content/images/authors/james-carter.png` (1) |

القيمتان غير منضبطتين: 5 قيم author و3 حالات author_image، مع 61 مقالاً بلا author و89 بلا author_image. لا توجد قيم مؤلف بالعربية.

### هل توجد صفحات مؤلفين أو سِيَر أو شهادات؟

- **لا توجد صفحات مؤلفين**: لا مسار `/author/...` ولا `/authors` في `src/App.tsx`؛ لا صفحة سيرة لكل كاتب.
- **السِيَر موجودة مركزياً فقط**: `src/lib/editorialProfiles.ts` يحوي profile لكل اسم (name/role/bio/type Person|Organization/url/image) وتُعرض في `/editorial-policy` (بما فيها مرسات `#reviewers`).
- **لا توجد شهادات (testimonials)** معروضة في أي صفحة أو مكوّن (فحص نصي على `src/` — الصيغ الوحيدة لكلمة testimonial هي أنماط كشف في بوابات `agents_v2/gates`).

### أين يظهر الكاتب في الصفحة وفي JSON-LD؟

المصدر الوحيد المعروض هو `editorialProfiles.ts` — حقل `article.author` الخام **لا يُعرض أبداً**، بل يُستخدم مفتاح بحث فقط (`getEditorialProfile(article.author)` في `BlogPost.tsx:320`):

1. **رأس المقال**: صورة شخصية 48×48 (`editorialProfile.image`) + "Written by {profile.name}" كرابط إلى `/editorial-policy` (أو `#reviewers`).
2. **JSON-LD** (`schemaData.author`): `{@type: Person|Organization, name: profile.name, url: <origin>+profile.url, image}` + حقل `reviewedBy: ExtensionTo Editorial Team`.
3. **وسم `article:author`** في `SEO.tsx` = `editorialProfile.name` (يمرر من BlogPost).

### تحويل مركزي إلى "ExtensionTo Editorial Team" (اقتراح بلا تنفيذ)

البنية الحالية تسمح بالتحويل **بتعديل ملف واحد** بدل مئات الملفات، لأن العرض كله يمر عبر `editorialProfiles.ts`:

- **الخيار الموصى به**: في `getEditorialProfile()` أعد `defaultEditorialProfile` (وهو أصلاً `Admin` = "ExtensionTo Editorial Team"، type: Organization) **لكل مفتاح بحث** — أي تجاهل اسم المقال. النتيجة: 881 مقالاً تتحول فوراً في الصفحة وفي JSON-LD وفي `article:author` دون لمس ملف .md واحد. المقالات الـ61 بلا مؤلف تتصرف كذلك أصلاً اليوم عبر نفس المسار.
- **بديل أخف**: أبقِ خريطة profiles لكن غيّر كل profile إلى `name: "ExtensionTo Editorial Team"` و`type: "Organization"` — نفس النتيجة مع بقاء البنية قابلة للعكس.
- **بقايا نثرية تحتاج انتباهاً عند أي تنفيذ**: نص في `src/pages/EditorialPolicy.tsx` (سطر ~61) يذكر James Mitchell وMiccart Phen نصاً — يلزم تعديل سطري واحد؛ وحقلا `author`/`author_image` في واجهات 881 مقالاً سيبقيان كما هما (غير معروضين — يمكن تنظيفهما لاحقاً أو إبقاؤهما، مع الانتباه إلى أن خط الأنابيب نحو Supabase قد ينقل هذين الحقلين كما هما).
- **لا يوصى** بتحويل ملف-بملف: 881 تعديلاً مقابل صفر فائدة عرضية.

## (ب) صفحات extension/* في المستودع

### القائمة (9 صفحات، مصدر البيانات: `src/lib/extensionsData.ts`، المسار `/extension/:slug` عبر `ExtensionPage.tsx`)

| # | slug | مقالات تُوصي به أولاً (أول رابط `/extension/` في المتن) |
|---|---|---|
| 1 | `quick-screenshot-lite` | **287** |
| 2 | `protab-suspender` | **281** |
| 3 | `redirect-shield` | **148** |
| 4 | `light-popup-blocker` | **45** |
| 5 | `auto-dark-mode-switcher` | **26** |
| 6 | `securakey-pro` | **14** |
| 7 | `formula-builder-pro` | **8** |
| 8 | `cookie-banner-blocker` | **3** |
| 9 | `offline-reader-pro` | **1** |

- **813 مقالاً منشوراً** (من 881) تحوي رابط `/extension/...` واحداً على الأقل؛ الجدول يعدّ **أول رابط** في متن كل مقال (أي "التوصية الأولى" ظاهرياً في الصفحة). الروابط اللاحقة داخل المقال غير محسوبة هنا.
- الأسماء كلها من بيانات `extensionsData.ts` التسعة (لا روابط ميتة إلى صفحات extension غير معرَّفة ضمن أول رابط).

### هل فيها إفصاح ملكية؟

**لا.** `extensionsData.ts` لا يحوي حقلا من نوع publisher/owner/developer، و`ExtensionPage.tsx` لا يعرض أي سطر "published by ExtensionTo" أو ما يشبهه. كما لا يوجد في المستودع مجلد كود إضافة (`extension/`) أو `manifest.json` يُثبت ملكية ExtensionTo لأي من هذه المنتجات التسعة — وهو نفس الجدول الذي منع إفصاح الملكية في بند 2(د) من هذا التوجيه: **الشرط غير قابل للتأكيد من المستودع، فلا يضاف إفصاح.**
