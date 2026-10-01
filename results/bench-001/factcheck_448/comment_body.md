## فحص حقائق الادعاءات الرقمية والسياسية في هذا المقال (يدوي + مصادر رسمية مُجلبَة)

**المنهجية:** استُخرج كل ادعاء رقمي/تاريخي/متعلق بسياسات Chrome Web Store من نص هذا الـPR، ثم جرى التحقق من كل ادعاء بمصدر رسمي (developer.chrome.com / مستودع GoogleChrome الرسمي المصدر لهذه الصفحات / support.google.com). الاقتباسات أدناه **حرفية ومجلوبة فعلاً أثناء الفحص بتاريخ 2026-10-01**. حين لا يوجد مصدر رسمي يُكتب **«غير مؤكد»** — وحين يتعارض الادعاء مع المصدر يُنصح بتعديله قبل الدمج. لم يُعدَّل أي ملف في هذا الفرع.

### 1) ادعاءات تتعارض مع المصدر الرسمي أو مصدرها ميت — تُنصح بالمراجعة قبل الدمج

| # | الادعاء في المقال | المصدر الرسمي المُجلَب | الاقتباس الداعم/المعارض | الحكم |
|---|---|---|---|---|
| 1 | «قوالب Google لسياسة الخصوصية» متوفرة على `support.google.com/chrome_webstore/answer/3268502` (المقال يضعها رابطاً) | جلب مباشر للرابط | **HTTP 404 Not Found** عند الجلب الفعلي (2026-10-01) | ⚠️ **تعارض/رابط ميت** — لا توجد صفحة قالب رسمية بهذا العنوان. يُنصح بحذف الرابط أو استبداله بصفحة سياسات الخصوصية الفعلية (Program Policies → Privacy Policies) |
| 2 | «الاستئناف يتم عبر Chrome Developer Dashboard بخيار "Request a review" أو "Appeal rejection"» | وثيقة المراجعة الرسمية: developer.chrome.com/docs/webstore/review-process | خطوات الاستئناف الموثقة: «Use the following steps to appeal a takedown or warning: 1. Open the **One Stop Support contact form**. 2. Select "My item (extensions, app, or theme)". 3. Select **"My item was warned / removed / rejected"**…» | ⚠️ **تعارض** — القناة الرسمية الموثقة للاستئناف هي نموذج One Stop Support وليس زراً باسم "Request a review / Appeal rejection" في الـDashboard. إعادة الإرسال المحدَّث عبر الـDashboard صحيحة كمفهوم، لكن وصف قناة الاستئناف يحتاج تصحيحاً |
| 3 | «زمن مراجعة الاستئناف النموذجي 3–5 أيام عمل» | الوثيقة نفسها (قسم Review times) | «Chrome Web Store review times **can vary**. In early 2021, most submissions completed review in **less than 24 hours**, with **over 90% completed within three days**.» + «If your extension is pending review for **more than three weeks**, please contact developer support.» | ⚠️ **تعارض** — لا يوجد في المصدر الرسمي أي "3–5 business days". الرقم مُختلَق بدقة زائفة. يُنصح بصياغة "متغير؛ أكثر من 90% تُنجز خلال ثلاثة أيام (بيان 2021)" |
| 4 | «30–40% من أولى عمليات الإرسال تُرفض» | — | لا تصدر Google إحصاءات رسمية عن نسب الرفض؛ لا مصدر متاح | ⚠️ **غير مؤكد** — رقم بلا مصدر؛ يُنصح بحذفه أو تخفيفه ("كثير من الإرسالات الأولى") |
| 5 | «Chrome Extension Preview Program يتيح اختبار الإضافة قبل الإرسال» (المقال يربطه بمقال داخلي) | بحث + تجربة روابط رسمية مرشحة (`/docs/webstore/preview-program` وبدائلها) | **404** على كل المسارات الرسمية المرشحة؛ لا صفحة رسمية بهذا الاسم في نتائج البحث | ⚠️ **غير مؤكد** — لا دليل على وجود برنامج رسمي بهذا الاسم تحديداً؛ والأهم: الرابط في المقال يشير إلى مقال داخلي في extensionto.com لا إلى مصدر رسمي |

### 2) ادعاءات مدعومة بمصادر رسمية (اقتباسات حرفية)

| # | الادعاء في المقال | المصدر الرسمي | الاقتباس الداعم | الحكم |
|---|---|---|---|---|
| 6 | «Google تشترط سياسة خصوصية علنية تكشف ما يُجمَع/يُستخدَم/يُشارَك ومع من» | Program Policies → Privacy Policies (مصدر الرسمي على GitHub: `program-policies/privacy/index.md`) | «If your Product handles any user data, then you must post an accurate and up to date privacy policy… comprehensively disclose: How your Product collects, uses and shares user data; All parties the user data will be shared with… accessible by providing a link in the designated Chrome Web Store Developer Dashboard field.» | ✅ مدعوم |
| 7 | «يجب أن تتضمن السياسة بيان الاحتفاظ بالبيانات (data retention)» | Program Policies → user-data FAQ | «how users can access, change, or delete their data; and **how long users' data is retained**.» | ✅ مدعوم |
| 8 | «مبدأ أقل صلاحية: اطلب الحد الأدنى من الأذونات الضرورية فقط» | Program Policies → Use of Permissions | «Request access to the **narrowest permissions necessary**… If more than one permission could be used… you must request those with the **least access to data or functionality**. Don't attempt to "future proof" your Product…» | ✅ مدعوم |
| 9 | «activeTab تمنح وصولاً مؤقتاً للتبويب النشط عند تفاعل المستخدم مع الإضافة» | developer.chrome.com/docs/extensions/develop/concepts/activeTab | «The "activeTab" permission gives an extension **temporary access to the currently active tab when the user invokes the extension**… Access to the tab lasts while the user is on that page, and is **revoked when the user navigates away** or closes the tab.» | ✅ مدعوم — مع ملاحظة صياغة: عبارة المقال «لا تشمل document وscript APIs» مربكة؛ الرسمي: activeTab يتيح البرمجة عبر `scripting` دون صلاحية host، والمقال نفسه يصحح ذلك لاحقاً («تحتاج activeTab + صلاحية scripting») |
| 10 | «Remote Code: تحميل سكربتات من خوادم خارجية وقت التشغيل سبب رفض» | Program Policies → Additional Requirements for Manifest V3 | «The extension may reference and load data… but these external resources **must not contain any logic**. Some common violations include: Including a `<script>` tag that points to a resource that is **not within the extension's package**…» | ✅ مدعوم |
| 11 | «Deceptive UI: حقن محتوى يخدع المستخدم بشأن مصدره سبب رفض» | Program Policies → Misleading or Unexpected Behavior | «We do not allow products that **deceive or mislead users**, including in the content, title, description, or screenshots…» | ✅ مدعوم |
| 12 | «تكرار الإرسال دون تغييرات حقيقية قد يعرّض الحساب للخطر» | Program Policies → Repeat Abuse | «Serious or **repeated violations**… will result in the **suspension of your developer account**, and possibly related developer accounts.» | ✅ مدعوم جزئياً — المصدر يوثق عقوبة الانتهاكات المتكررة؛ كلمة "may be flagged" أدق منها «قد يُعلَّم الحساب» |

### 3) ادعاءات لا يمكن تأكيدها من مصدر رسمي («غير مؤكد»)

| # | الادعاء | لماذا غير مؤكد |
|---|---|---|
| 13 | «رسالة الرفض عنوانها عادةً "Action Required: Your Chrome Web Store item has been rejected"» | لا توجد وثيقة رسمية تنص على صيغة العنوان |
| 14 | «رسالة الرفض تتضمن كود مخالفة + رابط سياسة + الملفات/استدعاءات API المتأثرة» | الوثيقة الرسمية (Notification and Appeals) تكتفي بـ«you will receive an email notification… with further instructions if applicable» — تفاصيل كود/ملفات غير موثقة نصياً (معقولة تجريبياً لكنها غير قابلة للتثبيت رسمياً) |
| 15 | «الأنظمة الآلية تلتقط المخالفات التقنية والمراجعون البشر يقيّمون السياسات» | Google لا تفصّل توزيع المراجعة آلياً/بشرياً في وثائقها |
| 16 | «لا حد أقصى لعدد مرات الاستئناف» | لا نص رسمي يحدد عدداً أو يعلن غياب الحد |
| 17 | «لا فترة انتظار إلزامية لإعادة الإرسال بعد الرفض» | لا نص رسمي صريح (لا منعاً ولا إذناً) |
| 18 | «يمكن النشر على Firefox Add-ons / Edge Add-ons أثناء المراجعة/الرفض» | قرار المنصات الأخرى مستقل؛ لا نص رسمي من Google يمنع/يسمح (قابل للتحقق لدى كل منصة على حدة) |
| 19 | «uBlock Origin وDark Reader يحتفظان بسياسات خصوصية مفصلة» | ادعاء عن طرف ثالث؛ تحققه لدى الناشرَين نفسهما (خارج نطاق مصادر Google) |

### 4) ملاحظات إضافية على الروابط الداخلية (خارج نطاق الأرقام لكنها تمس المصداقية)

- أربع فقرات متطابقة الصياغة «For a deeper dive on this exact problem…» تربط موضوعاً غير مرتبط إطلاقاً بموضوع الرفض: دليل الوضع الداكن على ويكيبيديا، إضافة كروم بالفرنسية، مستجيب بريد AI، إضافات X/Twitter — تضع في مقدمة مقال تقني جاد روابط لا علاقة لها سياقياً بما قبلها.
- رابط «Chrome Extension Preview Program» يشير إلى مقال داخلي (`add-extension-to-chrome-7`) وليس إلى صفحة رسمية — انظر البند 5 أعلاه.
- ملاحظة إدارية: يظهر في واجهة الـPR أن الملف يحمل `status: published` بتاريخ `published_at: 2026-09-16` رغم أن الـPR مسودة غير مدمجة — لا أثر لهذا على الموقع الحالي (لا شيء من هذا الفرع منشور)، لكن يُفضَّل ضبط الحالة قبل أي مراجعة نهائية.

**الخلاصة:** 5 ادعاءات تتعارض مع المصدر أو مصدرها ميت (1–5)، 7 مدعومة رسمياً (6–12)، 7 غير مؤكدة (13–19). الأبنود 1–3 هي الأهم قبل أي قرار دمج: رابط القالب الميت، قناة الاستئناف، ورقم «3–5 أيام عمل».
