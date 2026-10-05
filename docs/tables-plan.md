# Tables Plan — الجداول الخمسة المخترعة (مقترح فقط، docs-only)

**الحالة:** مقترح للمراجعة فقط. هذا الملف لا يعدّل أي مقال. أي تنفيذ مستقبلي يتطلب موافقة المالك وتعديل الحارس كما هو مقترح أدناه.

**النطاق:** فُحصت جميع الجداول (7) في مقالات الـ pilot الخمسة (على main الحالي `d5bdaaaa`). خمسة منها تحمل **قيم قياس مخترعة** (نسب، ميغابايت، دقائق، أسعار، معدلات) بلا أي اختبار موثق — وهي موضوع هذا الملف. جدولان آخَران وصفيّان بلا قيم مقاسة (جدول السيناريوهات في مقال adblock، وجدول الميزات في مقال an-image-downloader) فخرجنا عن النطاق وأدرجنا للتوثيق.

**قاعدة الاستبدال المقترحة (معلنة):**
1. كل خلية تحمل قيمة قياس كمية (٪، MB، دقائق، سعر، معدل، نتيجة) تُستبدل إمّا بوصف نوعي لميزة **معروفة وموثقة** للمنتج (مثل: «يدعم قوائم الفلترة») أو بعبارة **«Not independently tested»**.
2. المنتجات الحقيقية الموثقة (uBlock Origin، AdBlock Plus، Chrome Memory Saver، The Great Suspender، Auto Tab Discard، AdGuard…) ← وصف نوعي لميزتها المعروفة.
3. منتجات لا يمكن التحقق من وجودها أو هويتها (Light Popup Blocker، Popup Blocker Pro، Minimal/Smart Popup Blocker، Privacy-Focused، Tab Snooze، ProTab Suspender، Quick Screenshot Lite…) ← «Not independently tested».
4. **يُحافظ تمامًا على:** أسماء المنتجات، عناوين الصفوف والأعمدة، وعدد الصفوف (المجدول + header) في كل جدول.

---

## 1) adblock-chrome-android-complete-guide-2026 — جدول مقارنة الميزات (11 صفاً مع الترويسة)

**كما هو (AS-IS):**

```markdown
| Feature | Kiwi + uBlock | Firefox + uBlock | DNS Blocking | Quetta + uBlock | Samsung Internet + AdGuard |
| Blocks banner ads | 99%+ | 99%+ | 70% | 99%+ | 95%+ |
| Blocks pop-ups | 99%+ | 99%+ | 60% | 99%+ | 85% |
| Blocks YouTube ads | 60-80% | 60-80% | No | 60-80% | No |
| Blocks tracking scripts | 95%+ | 95%+ | 80% | 95%+ | 75% |
| Works in standard Chrome | No | No | Yes | No | No |
| Requires browser switch | Yes | Yes | No | Yes | Yes |
| Extension ecosystem | Full CWS | Firefox Add-ons | None | Full CWS (mostly) | Content blockers only |
| Setup time | 5 min | 3 min | 1 min | 5 min | 4 min |
| Security patch speed | Moderate | Fast | N/A | Fast | Fast (Galaxy schedule) |
| Free | Yes | Yes | Yes | Yes | Yes |
```

**الصيغة المقترحة:** قيم النسب المخترعة وأزمنة التركيب الدقيقة ← وصف نوعي لميزات معروفة؛ الصفوف الوصفية الدقيقة (ecosystem/patch/Free) تبقى كما هي لأنها ميزات موثقة:

```markdown
| Feature | Kiwi + uBlock | Firefox + uBlock | DNS Blocking | Quetta + uBlock | Samsung Internet + AdGuard |
| Blocks banner ads | Yes (filter lists) | Yes (filter lists) | Partial (third-party domains only) | Yes (filter lists) | Yes (built-in blocking) |
| Blocks pop-ups | Yes | Yes | Partial | Yes | Yes |
| Blocks YouTube ads | Partial (varies by filter lists) | Partial (varies by filter lists) | No | Partial (varies by filter lists) | No |
| Blocks tracking scripts | Yes | Yes | Partial | Yes | Yes |
| Works in standard Chrome | No | No | Yes | No | No |
| Requires browser switch | Yes | Yes | No | Yes | Yes |
| Extension ecosystem | Full CWS | Firefox Add-ons | None | Full CWS (mostly) | Content blockers only |
| Setup time | Short (install + lists) | Short (install + lists) | Minimal (one setting) | Short (install + lists) | Short (built-in) |
| Security patch speed | Moderate | Fast | N/A | Fast | Fast (Galaxy schedule) |
| Free | Yes | Yes | Yes | Yes | Yes |
```

## 2) adblock-chrome-android-complete-guide-2026 — جدول قياس البطارية (7 صفوف مع الترويسة)

**كما هو (AS-IS):** قياسات كاملة مخترعة (بطارية/RAM/بيانات/صفحات) من «اختبار 45 دقيقة» لم يحدث.

```markdown
| Configuration | Battery used (45 min) | Avg RAM held | Data transferred | Pages fully loaded |
| No blocking (Chrome) | 6.1% | 1,820 MB | 412 MB | 19 / 25 |
| DNS only (Private DNS) | 5.8% | 1,790 MB | 287 MB | 23 / 25 |
| Kiwi + uBlock Origin | 6.0% | 1,940 MB | 141 MB | 25 / 25 |
| Kiwi + uBlock + companions (full stack) | 6.4% | 2,050 MB | 138 MB | 25 / 25 |
| DNS + Kiwi + uBlock (combined) | 6.2% | 1,960 MB | 136 MB | 25 / 25 |
| Firefox + uBlock Origin | 6.3% | 1,720 MB | 148 MB | 24 / 25 |
```

**الصيغة المقترحة:** لا يمكن وصف قياس بكلمات — كل خلايا القياس تصبح «Not independently tested» مع بقاء أسماء التكوينات والصفوف:

```markdown
| Configuration | Battery used (45 min) | Avg RAM held | Data transferred | Pages fully loaded |
| No blocking (Chrome) | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| DNS only (Private DNS) | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Kiwi + uBlock Origin | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Kiwi + uBlock + companions (full stack) | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| DNS + Kiwi + uBlock (combined) | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Firefox + uBlock Origin | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
```

## 3) best-memory-saver-extension-for-chrome-4 — جدول الميزات (10 صفوف مع الترويسة)

**كما هو (AS-IS):** صف «Memory Savings (Typical)» يحمل نطاقات نسب مخترعة لكل المنتجات.

```markdown
| Feature | Chrome Memory Saver | The Great Suspender | Auto Tab Discard | Tab Snooze | ProTab Suspender |
| Memory Savings (Typical) | 30-40% | 40-60% | 30-50% | 25-40% | 50-70% |
| Automatic Suspension | Yes (time-based) | Yes (time-based) | Yes (memory-based) | Yes (time-based) | Yes (time + memory-based) |
| Custom Suspension Rules | Limited | No | Limited | Limited | Extensive |
| Whitelist/Blacklist | Basic (site list) | Basic | Basic | Pattern-based | Pattern-based |
| Session Management | No | No | No | Yes | Yes |
| Visual Indicators | Yes | Yes | Yes | Yes | Yes |
| Performance Impact | Minimal | Minimal | Minimal | Minimal | Moderate |
| Data Loss Risk | Low | Low | Moderate | Low | Low |
| Setup Complexity | Low | Low | Low | Moderate | High |
```

**الصيغة المقترحة:** صف النسب المخترعة فقط يُستبدل — للمنتجات الموثقة وصف نوعي لميزتها المعروفة، وللمنتجات غير القابلة للتحقق «Not independently tested». بقية الصفوف أوصاف ميزات معروفة وتبقى (مع استثناء خلايا تقييم للمنتجات غير القابلة للتحقق):

```markdown
| Feature | Chrome Memory Saver | The Great Suspender | Auto Tab Discard | Tab Snooze | ProTab Suspender |
| Memory Savings (Typical) | Yes — documented feature (unquantified) | Yes — core documented feature (unquantified) | Yes — core documented feature (unquantified) | Not independently tested | Not independently tested |
| Automatic Suspension | Yes (time-based) | Yes (time-based) | Yes (memory-based) | Not independently tested | Not independently tested |
| Custom Suspension Rules | Limited | No | Limited | Not independently tested | Not independently tested |
| Whitelist/Blacklist | Basic (site list) | Basic | Basic | Not independently tested | Not independently tested |
| Session Management | No | No | No | Not independently tested | Not independently tested |
| Visual Indicators | Yes | Yes | Yes | Not independently tested | Not independently tested |
| Performance Impact | Minimal | Minimal | Minimal | Not independently tested | Not independently tested |
| Data Loss Risk | Low | Low | Moderate | Not independently tested | Not independently tested |
| Setup Complexity | Low | Low | Low | Not independently tested | Not independently tested |
```

## 4) pop-up-blocker-for-chrome-partial — جدول المقارنة (5 صفوف مع الترويسة)

**كما هو (AS-IS):** استخدام ذاكرة ونسب فعالية مخترعة (يحتفظ برابط حقيقي لـ uBlock Origin).

```markdown
| Extension | Memory Usage | Customization | Effectiveness | Whitelisting |
| Light Popup Blocker | 8-12MB | High | 92% | Yes |
| [uBlock Origin](https://github.com/gorhill/uBlock) | 15-25MB | Medium | 95% | Yes |
| AdBlock Plus | 20-30MB | Low | 88% | Limited |
| PopUp Blocker (Basic) | 5-8MB | Low | 75% | No |
```

**الصيغة المقترحة:** القياسات (MB ونسب الفعالية) ← «Not independently tested»؛ التخصيص والقوائم البيضاء للمنتجات الموثقة ← وصف نوعي معروف؛ المنتجات غير القابلة للتحقق ← «Not independently tested» بالكامل:

```markdown
| Extension | Memory Usage | Customization | Effectiveness | Whitelisting |
| Light Popup Blocker | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| [uBlock Origin](https://github.com/gorhill/uBlock) | Not independently tested | High (filter lists + custom rules) | Not independently tested | Yes (documented) |
| AdBlock Plus | Not independently tested | Medium (filter lists + settings) | Not independently tested | Limited (documented) |
| PopUp Blocker (Basic) | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
```

## 5) the-best-popup-blocker-for-chrome-in-2026 — جدول المقارنة (9 صفوف مع الترويسة)

**كما هو (AS-IS):** كل المنتجات الخمسة غير قابلة للتحقق، والجدول مليء بنسب ومعدلات وذاكرة وأسعار مخترعة.

```markdown
| Feature | Light Popup Blocker | Popup Blocker Pro | Minimal Popup Blocker | Smart Popup Blocker | Privacy-Focused |
| Effectiveness (95-100%) | 97% | 98% | 95% | 98% | 96% |
| Performance Impact (Low/High) | Low | Medium | Very Low | Medium | Medium |
| False Positive Rate | 2% | 3% | 4% | 2.5% | 3.5% |
| Customization Options | Basic | Advanced | Minimal | Advanced | Advanced |
| Additional Security Features | Basic | Extensive | None | Advanced | Extensive |
| Memory Usage (MB) | 15 | 25 | 10 | 30 | 28 |
| Ease of Use | Very Easy | Moderate | Very Easy | Moderate | Moderate |
| Price | Free | $19.99/year | Free | $14.99/year | Free (Premium $9.99/month) |
```

**الصيغة المقترحة:** بما أن أسماء المنتجات نفسها غير قابلة للتحقق (ويُحتفظ بها بحكم التوجيه)، كل خلايا القياس والتقييم ← «Not independently tested»، مع بقاء الترويسات وأسماء المنتجات وعدد الصفوف:

```markdown
| Feature | Light Popup Blocker | Popup Blocker Pro | Minimal Popup Blocker | Smart Popup Blocker | Privacy-Focused |
| Effectiveness (95-100%) | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Performance Impact (Low/High) | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| False Positive Rate | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Customization Options | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Additional Security Features | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Memory Usage (MB) | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Ease of Use | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
| Price | Not independently tested | Not independently tested | Not independently tested | Not independently tested | Not independently tested |
```

## خارج النطاق (جداول وصفية بلا قياسات مخترعة)

- **adblock-chrome-android-complete-guide-2026 — جدول السيناريوهات (10 صفوف):** خلاياه وصفية (Blocked / Not blocked / Tie) مع نطاق واحد «60–80%» يُعالج ضمن المقترح رقم (1) بنفس القاعدة إن نُفّذ لاحقًا.
- **an-image-downloader-extension-for-chrome — جدول الميزات (5 صفوف):** وصف نوعي فقط (Fast/Basic/Excellent) لمنتجات غير قابلة للتحقق؛ لا يحمل قيم قياس، فلا يُعدّل في هذا المقترح (ويمكن لاحقًا تضمينه في سياق إعادة كتابة أوسع بقرار المالك).

---

## تعديل الحارس المقترح ليسمح بهذا للجداول المعلَّمة فقط (تصميم فقط — لا كود في هذا PR)

الحارس الحالي `agents_v2/gates/body_neutralization.py` يفشل عند تغيّر أي صف جدول (structural check) وعند أي رقم/نسبة جديدة. للسماح بإعادة صياغة خلايا الجداول **المعلَّمة فقط** دون فتح الباب لكل شيء:

1. **مدخل جديد (اختياري):** `allow_marked_table_edits: bool = False` + تمرير مجموعة أسطر الجداول المعلَّمة من `marked`.
2. **شروط الترخيص (كلها معًا) لجدول معلَّم:**
   - سطر الترويسة (الصف الأول) **byte-identical**.
   - عدد الصفوف والأعمدة ثابت، وترتيب الصفوف ثابت.
   - خلايا العمود الأول (أسماء الميزات/المنتجات) **byte-identical**.
   - نص الخلية الجديد يمر بفحصي «لا أرقام/نسب/إصدارات جديدة» و«لا أسماء علم جديدة» الموجودين أصلاً في الحارس (على مستوى الخلية).
   - دلالات S1/S2/S3 الجزئية (hits(after) ⊆ hits(before)) تبقى مطبقة على النص الكامل بما فيه الجداول.
3. **بقية الجداول (غير المعلَّمة) تبقى محرمة تمامًا** — أي تغيير فيها يُبقي فشل الحارس كما هو.
4. القاعدة تُختبَر كوحدات جديدة (نجاح/فشل لكل شرط من الشروط أعلاه) قبل أي استخدام فعلي، وتظل المعاينة اليدوية للمالك شرطًا لأي تنفيذ على المحتوى.
