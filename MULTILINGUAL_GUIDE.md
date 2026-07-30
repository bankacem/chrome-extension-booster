# دليل إعداد المقالات متعددة اللغات في مشروع ExtensionTo (Multilingual Articles Guide)

يوضح هذا الدليل أفضل وأحدث الممارسات المعمارية والبرمجية لإعداد ودعم اللغات المتعددة للمقالات في موقع **ExtensionTo** المبني باستخدام **Vite + React + TypeScript + Markdown**.

---

## 1. الهيكلية المعمارية المفضلة (Architectural Strategy)

بالنسبة لمواقع المحتوى والمقالات (Blogs)، هناك ثلاثة خيارات رئيسية لإدارة روابط اللغات:
1. **المجلدات الفرعية (Subfolders) مثل `extensionto.com/ar/blog/...`** (الخيار الأفضل والموصى به).
2. **النطاقات الفرعية (Subdomains) مثل `ar.extensionto.com/blog/...`**.
3. **نطاقات منفصلة (CcTLDs) مثل `extensionto.ae/blog/...`**.

### لماذا المجلدات الفرعية (Subfolders) هي الخيار الأفضل؟
* **تركيز قوة السيو (Authority Link Equity)**: تجمع المجلدات الفرعية كل روابط وقوة الموقع (Domain Authority) في نطاق واحد بدلاً من تشتيتها بين نطاقات فرعية.
* **سهولة الإعداد والصيانة**: لا تحتاج إلى إعداد شهادات SSL منفصلة أو إعدادات DNS معقدة لكل لغة.
* **التوافق التام مع Vercel**: يسهل توجيه المجلدات الفرعية مباشرة باستخدام ملف `vercel.json` أو مسارات `React Router`.

---

## 2. تنظيم ملفات المقالات (Content & Markdown Structure)

بما أن الموقع يعتمد على نظام هجين (Markdown + Database)، يفضل تنظيم المقالات بلغات مختلفة داخل مجلد `public/content/articles/` بالطرق التالية:

### أ. الهيكل المقترح للملفات (Directory-based vs Slug-based)

نظراً لأن المشروع يوزع الملفات حالياً بالاعتماد على أول 3 أحرف من الرابط (Partitioning)، يفضل دمج كود اللغة `lang` في بنية المجلدات أو في اسم الملف لمنع التداخل:

**الخيار الموصى به: المجلد الفرعي داخل الفهرس**
```
public/content/articles/
├── ar/  (المقالات باللغة العربية)
│   └── h/o/w/how-to-fix-chrome-ram.md
└── en/  (المقالات باللغة الإنجليزية)
    └── h/o/w/how-to-fix-chrome-ram.md
```

أو استخدام ميزة **الفهرسة الثنائية** في ملف الـ JSON الموحد، مع إبقاء المعرف الفرعي للمقال `id` متطابقاً لكل اللغات لربط الترجمات ببعضها.

### ب. هيكلة الـ Frontmatter في ملفات Markdown
يجب إضافة حقل `lang` وحقل يحدد الـ `id` المشترك للمقال لربط الترجمات:

```yaml
---
id: "b2c3d4e5-f6a7-4890-b1c2-d3e4f5a6b7c8"
title: "كيفية تقليل استهلاك الرام في متصفح كروم"
slug: "how-to-reduce-chrome-ram-usage"
lang: "ar"
status: "published"
category: "browsers"
published_at: "2026-06-25T12:00:00Z"
meta_description: "تعرف على أفضل الطرق والنصائح لتقليل استهلاك الذاكرة العشوائية (RAM) في متصفح جوجل كروم وتحسين أداء جهازك."
---
```

---

## 3. تعديل وتحديث سكربت المزامنة والفهرسة (`sync-articles.ts`)

نقوم بتحديث سكربت الفهرسة ليقوم بقراءة حقل `lang` الافتراضي وتضمينه في ملف `articles-index.json`.

```typescript
// نقوم بتعديل واجهة الفهرس لدعم اللغة
interface ArticleIndexItem {
  id: string;
  title: string;
  slug: string;
  lang: string; // الحقل الجديد للغة
  description: string;
  meta_description?: string;
  published_at: string;
  category: string;
  // ... باقي الحقول
}
```

أثناء قراءة الملفات، إذا لم يتوفر حقل `lang` في ملف المارك داون، نعتبره افتراضياً `"en"`.

---

## 4. إعداد المسارات الديناميكية في الواجهة الأمامية (`React Router`)

في ملف `src/App.tsx` نقوم بتعديل المسارات لتدعم كود اللغة بشكل ديناميكي واختياري:

```tsx
<Routes>
  {/* المسارات الافتراضية (اللغة الإنجليزية) */}
  <Route path="/" element={<Index />} />
  <Route path="/blog" element={<Blog />} />
  <Route path="/blog/:slug" element={<BlogPost />} />

  {/* مسارات اللغات الأخرى (مثال: العربية ar، الفرنسية fr) */}
  <Route path="/:lang" element={<Index />} />
  <Route path="/:lang/blog" element={<Blog />} />
  <Route path="/:lang/blog/:slug" element={<BlogPost />} />
</Routes>
```

### معالجة المسار داخل مكون `BlogPost.tsx`:
عند جلب المقال من الفهرس، نعتمد على كود اللغة `lang` القادم من الرابط لتصفية المقالات:

```typescript
const { lang = 'en', slug } = useParams<{ lang?: string; slug: string }>();

// جلب المقال من الفهرس الموحد بناءً على الرابط واللغة
const matched = allArticles.find(
  a => a.slug === slug && (a.lang || 'en') === lang
);
```

---

## 5. السيو التقني للمواقع متعددة اللغات (Multilingual SEO & hreflang)

لضمان أرشفة جوجل للنسخ المختلفة بشكل صحيح ومنع مشاكل المحتوى المكرر (Duplicate Content)، يجب إعداد وسوم الـ `hreflang`:

### أ. وسم الـ hreflang في المكون `SEO.tsx`
نقوم بإضافة روابط بديلة (Alternate Links) في ترويسة الصفحة تخبر جوجل بالروابط المتاحة لنفس المقال باللغات الأخرى:

```tsx
{/* في مكون SEO.tsx */}
<Helmet>
  <html lang={currentLang} />

  {/* الرابط الرئيسي للصفحة الحالية */}
  <link rel="canonical" href={currentUrl} />

  {/* الروابط البديلة للغات المختلفة لنفس المقال */}
  {translations.map((trans) => (
    <link
      key={trans.lang}
      rel="alternate"
      hrefLang={trans.lang}
      href={`${SITE_URL}/${trans.lang}/blog/${trans.slug}`}
    />
  ))}

  {/* النسخة الافتراضية العامة */}
  <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/blog/${defaultSlug}`} />
</Helmet>
```

### ب. خريطة الموقع الديناميكية (Sitemap.xml)
تتيح جوجل ربط اللغات داخل ملف الـ `sitemap.xml` باستخدام ميزة `xhtml:link`. نقوم بتعديل المولد (`api/sitemap.ts` و `scripts/generate-sitemap.ts`) ليقوم بتجميع المقالات التي تحمل نفس الـ `id` وصياغتها كالتالي:

```xml
<url>
  <loc>https://extensionto.com/blog/how-to-fix-chrome-ram</loc>
  <xhtml:link
    rel="alternate"
    hreflang="ar"
    href="https://extensionto.com/ar/blog/how-to-reduce-chrome-ram-usage" />
  <xhtml:link
    rel="alternate"
    hreflang="en"
    href="https://extensionto.com/blog/how-to-fix-chrome-ram" />
</url>
```

---

## 6. خطوات التنفيذ العملي (Execution Steps)

1. **تحديث قاعدة البيانات (Supabase)**: إضافة عمود `lang` (نوع text بقيمة افتراضية `'en'`) في جدول `articles`.
2. **تحديث سكربت جلب البيانات (`sync-db-to-md.ts`)**: ليقوم بحفظ المقالات في مسار منظم حسب اللغة أو إضافة حقل `lang` في الـ frontmatter.
3. **تطبيق الترجمة السهلة (UI i18n)**: استخدام مكتبة مثل `react-i18next` لترجمة القوائم، الأزرار، والـ Footer، أو عمل قاموس مصطلحات بسيط محلي لتقليل حجم الحزمة (Bundle Size).
