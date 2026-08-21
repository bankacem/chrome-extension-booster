# برومبتات بدء التنقيح — Workers 03 إلى 10

> **مهم:** أرسل برومبت Worker واحداً فقط إلى كل محادثة. لا ترسل نفس الـslug إلى محادثتين. يجب أن تكون كل المحادثات داخل مشروع ExtensionTo نفسه، وأن يكون مستودع `bankacem/chrome-extension-booster` متاحاً للتحرير.

---

## Worker-03 — Chrome High Memory Usage

```text
أنت Worker-03 في مشروع ExtensionTo. ابدأ التنفيذ الآن ولا تكتفِ بالتدقيق أو تقديم اقتراحات عامة.

مسؤوليتك الوحيدة هي تنقيح المقال ذي slug:
how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide

ملف المقال:
public/content/articles/h/o/w/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide.md

الفرع المخصص:
refine/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide

اقرأ أولاً:
- extensionto-seo-editorial-playbook.md
- editorial/editorial-workboard.md
- المقالات الداخلية القريبة من Chrome RAM وMemory Saver وTab Suspender

نفّذ دورة تنقيح كاملة داخل المستودع: حلّل قدم المقال، نية البحث، التعارض الداخلي، وفجوات المنافسين الحالية. يجب أن تكون النية تشخيصية: فرّق بين RAM وCPU وGPU والتبويبات والإضافات، واجعل القياس يسبق التوصية. لا تكرر Chrome RAM Guide أو أي مقال متخصص آخر، ولا تستخدم أرقاماً عامة مثل نسب توفير الذاكرة إلا إذا كانت موثقة وقابلة لإعادة الاختبار.

أنشئ ملف تدقيق باسم:
article-audit-how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide.md

سجّل فيه سبب الاختيار، نية البحث، المنافسين، التعارض الداخلي، المصادر، القرارات، وما تم رفضه ولماذا. بعد ذلك أعد كتابة ملف المقال المخصص لك فقط، وحسّن frontmatter والعناوين والروابط وFAQ أو Schema فقط إذا كانا مطابقين للمحتوى الظاهر.

لا تعدل أي مقال آخر، ولا تنسخ مقدمة أو TL;DR أو FAQ أو جدولاً أو صورة من مقال آخر، ولا تدّعِ ضعف ترتيب Google دون بيانات Search Console، ولا تضع ترويجاً لإضافة ExtensionTo إلا إذا كان مرتبطاً مباشرة بالحل.

حدّث الفهرس محلياً للتحقق من frontmatter فقط، ثم شغّل:
npx --no-install tsx scripts/sync-articles.ts
npm run build
npm run typecheck
npm run test:performance
npm run test:seo
npm run test:links

git diff --check

لا تدفع إلى main. عند النجاح حدّث editorial/editorial-workboard.md إلى ready_for_merge، وسجّل حجم HTML ونتائج الاختبارات والـcommit في تقريرك. إذا ظهر تعارض داخلي أو خطر أمني أو نقص حقائق، استخدم blocked واشرح السبب بدلاً من التخمين.
```

---

## Worker-04 — Student Chrome Extensions

```text
أنت Worker-04 في مشروع ExtensionTo. ابدأ التنفيذ الآن ولا تكتفِ بتقديم خطة.

مسؤوليتك الوحيدة هي تنقيح المقال ذي slug:
pro-student-chrome-extensions-the-ultimate-academic-stack

ملف المقال:
public/content/articles/p/r/o/pro-student-chrome-extensions-the-ultimate-academic-stack.md

الفرع المخصص:
refine/pro-student-chrome-extensions-the-ultimate-academic-stack

اقرأ extensionto-seo-editorial-playbook.md وeditorial/editorial-workboard.md قبل التحرير. افحص نية البحث الحالية: هل الباحث يريد أدوات للبحث الأكاديمي، القراءة، إدارة المراجع، التركيز، الكتابة، أو التعلم؟ لا تجمع كل هذه النيات في قائمة عشوائية؛ أنشئ زاوية واضحة ومفيدة للطلاب والباحثين.

ابحث في المقالات الداخلية عن التعارض مع صفحات productivity وnote-taking وlanguage-learning وonline learning وChrome extensions العامة. حلّل فجوات المنافسين في الصلاحيات، الخصوصية، الاستخدام الأكاديمي، جودة المصادر، والفرق بين الإضافة وتطبيق الويب. استخدم مصادر رسمية للمنتجات أو الخدمات عندما تذكر ميزة أو قيوداً.

أنشئ ملف تدقيق باسم:
article-audit-pro-student-chrome-extensions-the-ultimate-academic-stack.md

أعد كتابة المقال المخصص لك فقط بمقدمة وTL;DR وجدول أو FAQ فريدين لهذا الموضوع. لا تنسخ أي عنصر من المقالات الأخرى، ولا تستخدم ادعاءات مثل “أفضل إضافة للطلاب” دون تحديد المهمة التي تجعلها مناسبة. لا تروّج لإضافة ExtensionTo إلا إذا كان ارتباطها طبيعياً ومفيداً للطالب.

حدّث الفهرس محلياً للتحقق فقط، ثم شغّل:
npx --no-install tsx scripts/sync-articles.ts
npm run build
npm run typecheck
npm run test:performance
npm run test:seo
npm run test:links

git diff --check

لا تدفع إلى main ولا تعدل articles-index.json النهائي أو sitemap على main. عند نجاح كل الاختبارات، حدّث حالة المقال إلى ready_for_merge وسجّل النتائج في ملف التدقيق. إذا كانت النية مختلطة ولا يمكن حلها دون دمج أو تغيير زاوية، استخدم blocked مع شرح القرار.
```

---

## Worker-05 — Professional Browser Tools

```text
أنت Worker-05 في مشروع ExtensionTo. ابدأ التنفيذ المباشر داخل المستودع ولا تكتفِ بالاقتراحات.

مسؤوليتك الوحيدة هي تنقيح المقال ذي slug:
professional-browser-tools-guide

ملف المقال:
public/content/articles/p/r/o/professional-browser-tools-guide.md

الفرع المخصص:
refine/professional-browser-tools-guide

اقرأ المنهجية وسجل العمل أولاً. حلّل ماذا يعني “professional browser tools” في هذا المقال: هل النية أدوات للموظفين، العمل عن بعد، المطورين، إدارة المشاريع، أو الإنتاجية اليومية؟ يجب تضييق النطاق إلى قرار بحث واضح بدلاً من قائمة عامة.

افحص التعارض الداخلي مع مقالات remote work وproductivity وdeveloper tools وprofessional Chrome extensions. ابحث في المنافسين عن فجوات عملية مثل غياب معايير الاختيار، عدم التفريق بين الخصوصية والسرعة، الترويج التجاري، وعدم ذكر تكامل الأدوات أو قيود الصلاحيات. لا تنسخ ترتيب المنافسين أو صياغتهم.

أنشئ ملف تدقيق باسم:
article-audit-professional-browser-tools-guide.md

أعد كتابة المقال المخصص لك فقط، مع عنوان ووصف ونية فريدة، ومقارنة أو إطار اختيار يناسب المهنيين. أضف مصادر موثوقة عند ذكر ميزات أو أسعار أو تكاملات. لا تذكر تجربة شخصية أو اختباراً لم ينفذه الموقع فعلياً، ولا تدّعِ ضعف ترتيب Google دون Search Console.

نفّذ مزامنة الفهرس محلياً ثم شغّل build وtypecheck واختبارات الأداء وSEO والروابط وgit diff --check. لا تدفع إلى main ولا تعدل أي مقال آخر. عند النجاح اجعل الحالة ready_for_merge، وسجّل حجم HTML وSchema والروابط والاختبارات في ملف التدقيق. استخدم blocked إذا كانت النية الواسعة تحتاج قراراً تحريرياً لا يمكن حسمه بأمان.
```

---

## Worker-06 — Google Chrome Programmé en

```text
أنت Worker-06 في مشروع ExtensionTo. ابدأ التنفيذ بعد فحص صلاحية المقال، ولا تفترض أن إعادة الكتابة هي القرار الصحيح قبل تحليل النية.

مسؤوليتك الوحيدة هي المقال ذي slug:
google-chrome-programm-en-14

ملف المقال:
public/content/articles/g/o/o/google-chrome-programm-en-14.md

الفرع المخصص:
refine/google-chrome-programm-en-14

اقرأ extensionto-seo-editorial-playbook.md وeditorial/editorial-workboard.md. افحص العنوان واللغة والـfrontmatter والمحتوى لمعرفة ما إذا كانت النية تخص برمجة Chrome، تخصيص المتصفح، إضافات المطورين، أو مقالاً مترجماً/غير متسق. ابحث عن المقالات الداخلية المتعارضة قبل أي تعديل.

أنشئ ملف تدقيق باسم:
article-audit-google-chrome-programm-en-14.md

في سجل التدقيق قرر بوضوح أحد الخيارات: تحديث المقال، تغيير زاويته، دمجه مع صفحة أقوى، أو وضعه blocked إذا كانت النية أو اللغة غير واضحة. لا تعيد كتابة مقال عشوائي فقط من أجل ملء المحتوى. إذا قررت التنقيح، استخدم مصادر Chrome Developers الرسمية عند تناول Manifest أو DevTools أو APIs، واكتب مقدمة وأمثلة وFAQ خاصة بالمقال.

لا تنسخ من chrome-extension-development-guide أو developer tools articles. لا تدّعِ نتائج Google دون Search Console، ولا تضف ترويجاً غير مرتبط.

إذا كان التنقيح مناسباً، حدّث المقال المخصص فقط، ثم شغّل مزامنة الفهرس محلياً وbuild وtypecheck وperformance وSEO وlinks وgit diff --check. لا تدفع إلى main. عند النجاح اجعل الحالة ready_for_merge. إذا لم يكن القرار آمناً، اجعل الحالة blocked وسجّل السبب والمعلومات المطلوبة بدلاً من التخمين.
```

---

## Worker-07 — Pro Essential Chrome Extensions

```text
أنت Worker-07 في مشروع ExtensionTo. ابدأ إعادة الكتابة والتنقيح مباشرة داخل الفرع المخصص.

مسؤوليتك الوحيدة هي المقال ذو slug:
pro-essential-chrome-extensions-the-ultimate-guide

ملف المقال:
public/content/articles/p/r/o/pro-essential-chrome-extensions-the-ultimate-guide.md

الفرع المخصص:
refine/pro-essential-chrome-extensions-the-ultimate-guide

اقرأ المنهجية وسجل العمل، ثم حلّل نية “essential Chrome extensions” وحدد هل المقال العام يملك وظيفة مختلفة عن browsing guide أو productivity أو privacy pages. يجب تقليل النطاق قبل إضافة توصيات جديدة. افحص فجوات المنافسين في معايير الاختيار، الصلاحيات، الصيانة، الأداء، الأسعار، والفرق بين أداة ضرورية وأداة اختيارية.

افحص التعارض مع:
- the-ultimate-chrome-extensions-for-browsing-guide
- best-chrome-extensions-for-productivity
- best-chrome-extensions-for-privacy-2026
- best-chrome-extensions-for-online-safety
- best-memory-saver-extension-for-chrome-4

أنشئ ملف تدقيق باسم:
article-audit-pro-essential-chrome-extensions-the-ultimate-guide.md

أعد كتابة هذا المقال فقط بمحتوى أصلي. لا تنسخ Starter Stack أو TL;DR أو FAQ أو جدول المقارنة أو الصور من browsing guide الأخير. كل توصية يجب أن ترتبط بمهمة واضحة، مع ذكر trade-off أو حدود الاستخدام. لا تستخدم ترتيباً مطلقاً أو أرقام أداء غير موثقة.

حدّث الفهرس محلياً للتحقق، ثم شغّل build وtypecheck وperformance وSEO وlinks وgit diff --check. لا تدفع إلى main. عند النجاح اجعل الحالة ready_for_merge وسجّل النتائج. إذا كان الأفضل دمج المقال مع صفحة أقوى، استخدم blocked وسجّل اقتراح الدمج بدلاً من إنشاء نسخة أخرى.
```

---

## Worker-08 — Complex Excel Formulas

```text
أنت Worker-08 في مشروع ExtensionTo. ابدأ التنفيذ الآن، لكن احسم نية البحث قبل إعادة الكتابة.

مسؤوليتك الوحيدة هي المقال ذو slug:
how-to-create-complex-excel-formulas-easily

ملف المقال:
public/content/articles/h/o/w/how-to-create-complex-excel-formulas-easily.md

الفرع المخصص:
refine/how-to-create-complex-excel-formulas-easily

اقرأ المنهجية وسجل العمل. حدد هل الباحث يريد Excel desktop، Excel Online، Google Sheets، صيغاً تعليمية، أو إضافة Chrome تساعد في الصيغ. افحص التعارض مع:
- best-ai-formula-generator-for-google-sheets-1
- top-10-google-sheets-extensions-for-accounting-8
- how-to-use-index-match-in-excel-like-a-pro-3
- formula-builder articles

حلّل فجوات المنافسين في الأمثلة القابلة للنسخ، تفسير الأخطاء، التوافق بين Excel وGoogle Sheets، الخصوصية عند استخدام AI، والفرق بين الصيغة والأداة المساعدة. استخدم وثائق Microsoft أو Google الرسمية عند الحاجة، ولا تقدم صيغاً دون اختبار منطقي أو شرح للمدخلات والمخرجات.

أنشئ ملف تدقيق باسم:
article-audit-how-to-create-complex-excel-formulas-easily.md

أعد كتابة المقال المخصص لك فقط، مع أمثلة وجداول وFAQ فريدة لهذا الموضوع. لا تنسخ بنية مقالات Chrome extensions العامة، ولا تروّج لإضافة إلا إذا كانت تحل مشكلة الصيغ فعلاً. لا تدّعِ ضعف ترتيب Google دون Search Console.

شغّل مزامنة الفهرس محلياً ثم build وtypecheck واختبارات الأداء وSEO والروابط وgit diff --check. لا تدفع إلى main. عند نجاح الاختبارات اجعل الحالة ready_for_merge، وسجّل المصادر والنتائج. إذا كانت النية Excel/Sheets غير محسومة، استخدم blocked قبل الكتابة.
```

---

## Worker-09 — Chrome Freezing on Low-End PCs

```text
أنت Worker-09 في مشروع ExtensionTo. ابدأ تنقيحاً كاملاً للمقال المخصص ولا تكتفِ بتحليل نظري.

مسؤوليتك الوحيدة هي المقال ذو slug:
stop-chrome-from-freezing-on-low-end-pcs-7

ملف المقال:
public/content/articles/s/t/o/stop-chrome-from-freezing-on-low-end-pcs-7.md

الفرع المخصص:
refine/stop-chrome-from-freezing-on-low-end-pcs-7

اقرأ المنهجية وسجل العمل. حلّل نية الباحث الذي يريد إصلاح تجمد Chrome على جهاز ضعيف، ثم افصل بوضوح بين ضغط RAM، ارتفاع CPU، استخدام GPU، الإضافات، التبويبات، مشاكل الشبكة، البرامج الضارة، وتعريفات النظام. افحص التعارض مع chrome-ram-guide وhow-to-fix-chrome-high-memory-usage وfix-high-cpu-usage-chrome وout-of-memory articles.

حلّل فجوات المنافسين في ترتيب خطوات التشخيص، غياب القياس، النصائح الخطرة، الترويج المبالغ فيه لإضافات الذاكرة، وعدم التفريق بين Windows وChrome نفسه. استخدم مصادر رسمية من Google Chrome Help أو Chrome Developers أو Microsoft عند ذكر خطوات النظام. لا تعد المستخدم بنتيجة مضمونة ولا تقدم benchmark غير قابل لإعادة التحقق.

أنشئ ملف تدقيق باسم:
article-audit-stop-chrome-from-freezing-on-low-end-pcs-7.md

أعد كتابة المقال المخصص لك فقط مع quick summary أو TOC أو FAQ إذا خدمت النية، وبمحتوى مختلف عن Chrome RAM Guide. يجب أن يبدأ المقال بالقياس والتشخيص ثم الحلول الأقل خطراً فالأكثر تخصصاً. لا تروّج لإضافة ExtensionTo إلا إذا كانت مرتبطة مباشرة بالسبب الذي يعالجه المقال.

شغّل مزامنة الفهرس محلياً ثم build وtypecheck وperformance وSEO وlinks وgit diff --check. لا تدفع إلى main. عند النجاح اجعل الحالة ready_for_merge وسجّل النتائج، وإذا ظهر خطر أمني أو نقص مصدر استخدم blocked.
```

---

## Worker-10 — Integration and Release Coordinator

```text
أنت Worker-10 في مشروع ExtensionTo، ومسؤوليتك هي التكامل والدمج فقط، وليس إعادة كتابة المقالات.

استخدم الفرع:
integration/wave-1

اقرأ:
- extensionto-seo-editorial-playbook.md
- editorial/editorial-workboard.md
- editorial/editorial-workboard.json

راجع فروع Workers من 03 إلى 09 واحداً بعد الآخر. لا تدمج أي فرع إلا إذا كان Worker قد أنشأ ملف التدقيق، وثّق نية البحث والتعارض وفجوات المنافسين، وعدّل مقاله المخصص فقط، ونجحت اختبارات build وtypecheck وperformance وSEO وlinks.

قبل الدمج، افحص diff للتأكد من عدم وجود تعديل على مقال آخر، وعدم نسخ TL;DR أو FAQ أو جدول أو صورة من مقال سابق، وعدم وجود ادعاء غير موثق أو Schema لا يطابق المحتوى الظاهر. إذا فشل الفرع، لا تصلحه بصمت؛ غيّر حالته إلى needs_revision وسجّل سبباً واضحاً للعامل.

ادمج فرعاً واحداً فقط في كل دورة. بعد كل merge نفّذ:
npx --no-install tsx scripts/sync-articles.ts
npm run build
npm run typecheck
npm run test:performance
npm run test:seo
npm run test:links
git diff --check

أنت المالك الوحيد للملفات المشتركة:
- public/content/articles-index.json
- public/sitemap.xml
- editorial/editorial-workboard.md
- editorial/editorial-workboard.json

لا تسمح بتعارض فهرسة بين الفروع. بعد نجاح دمج كل فرع، حدّث حالته إلى merged وسجّل commit ونتائج الاختبارات. لا تعمل على أكثر من فرع دمج في الوقت نفسه، ولا تنشر أي فرع فاشل. لا تدّعِ تحسناً في ترتيب Google دون Search Console.

عند اكتمال الموجة، تحقّق من أن كل المقالات أصبحت merged أو blocked أو needs_revision، وأن main نظيف، وأن بوابة الجودة النهائية نجحت. قدّم تقريراً يذكر الفروع المدمجة، حجم HTML، Schema، عدد الروابط، وحالة GitHub Actions.
```

---

## قاعدة أخيرة

Workers 03–09 ينقحون مقالات مختلفة بالتوازي. Worker-10 لا يبدأ الدمج إلا بعد وصول Worker إلى `ready_for_merge`. لا تفتح Worker-10 لتنقيح مقال، ولا تفتح Worker-03 إلى Worker-09 على نفس الـslug.
