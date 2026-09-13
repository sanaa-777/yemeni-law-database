/* ══════ API MODULE ══════ */
const API = window.location.origin + '/api';
let staticIndexPromise;
const categoryNames = { laws: 'القوانين واللوائح', library: 'الدعاوى والإجراءات', contracts: 'نماذج العقود', articles: 'المقالات القانونية' };
const normalize = value => String(value || '').normalize('NFKC').replace(/[_-]+/g, ' ').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();
const topicRules = [
  { id: 'family', terms: ['نفقة','زوج','زوجة','طلاق','حضان','زواج','مهر','عدة','نشوز','اولاد','أولاد','نسب','ولاية','ميراث'], anchors: ['الأحوال الشخصية','نفقة','زوج','زوجة','طلاق','حضان','أولاد'] },
  { id: 'labor', terms: ['عامل','موظف','فصل','أجر','عمل','عمال','إجازة','تعويض'], anchors: ['العمل','عمال','فصل تعسفي'] },
  { id: 'commercial', terms: ['تجارة','شركة','شريك','تاجر','شيك','بنك','بيع','استثمار'], anchors: ['التجاري','شركة','تجارية','شيك'] },
  { id: 'criminal', terms: ['جريمة','سرقة','اعتداء','ابتزاز','عقوبة','متهم','جزائي','جنائي'], anchors: ['الجرائم','العقوبات','الجزائية','جنائية'] }
  ,{ id: 'debt', terms: ['دين','قرض','مطالبة','سند','شيك','مدين','دائن','تقادم','استحقاق'], anchors: ['الدين','القرض','المطالبة','التقادم','المدني','الشيك'] }
];
function classifyTopic(query) { const q = normalize(query); return topicRules.map(t => ({ ...t, score: t.terms.reduce((n, x) => n + (q.includes(normalize(x)) ? 1 : 0), 0) })).sort((a,b) => b.score - a.score)[0]; }
function passesLegalGate(doc, topic) {
  if (!topic || topic.score === 0) return true;
  const title = normalize(doc.title), body = normalize(doc.content);
  if (topic.id === 'family' && ['المورد','تجاري','شركة','بنك','مقاول','توريد'].some(x => title.includes(normalize(x)))) return false;
  if (topic.id === 'debt' && ['نفقة','طلاق','حضان','زواج','زوجية'].some(x => title.includes(normalize(x))) && !title.includes('دين')) return false;
  if (topic.id === 'debt' && ['الأحوال الشخصية','الإجراءات الجزائية','المهن الطبية','منافسة','حقوق الطفل','العمال'].some(x => title.includes(normalize(x)))) return false;
  const titleHit = topic.anchors.some(x => title.includes(normalize(x)));
  const bodyHits = topic.terms.filter(x => body.includes(normalize(x))).length;
  return titleHit || bodyHits >= 2;
}
async function staticIndex() {
  if (!staticIndexPromise) staticIndexPromise = fetch('/data/law-index.json').then(r => { if (!r.ok) throw new Error('static index unavailable'); return r.json(); });
  return staticIndexPromise;
}
function staticSearch(query, opts = {}) {
  const words = normalize(query).replace(/[؟?!.,،؛:]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const index = opts.index || { documents: [] };
  const topic = classifyTopic(query);
  return index.documents.filter(d => (!opts.category || d.category === opts.category) && passesLegalGate(d, topic)).map(d => {
    const title = normalize(d.title), body = normalize(d.content); let score = 0;
    words.forEach(w => { if (title.includes(w)) score += 30; score += Math.min((body.split(w).length - 1) * 3, 25); });
    const anchorBoost = topic && topic.score ? (topic.anchors.some(x => title.includes(normalize(x))) ? 120 : 0) : 0;
    const typeBoost = d.category === 'laws' ? 25 : d.category === 'library' ? 20 : 10;
    return { id: d.id, title: d.title, category: d.category, categoryName: categoryNames[d.category], score: score + anchorBoost + typeBoost, filename: d.filename };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, opts.limit || 10);
}
async function staticChat(message) {
  const index = await staticIndex(); const hits = staticSearch(message, { index, limit: 10 });
  const sources = hits.map((h, i) => ({ number: i + 1, id: h.id, title: h.title, category: h.categoryName, score: h.score }));
  const debt = classifyTopic(message).id === 'debt';
  const answer = hits.length ? (debt ? `## مذكرة قانونية أولية: المطالبة بدين قديم

### أولاً: الخلاصة

مرور عشرين عاماً لا يحسم المسألة وحده. لا بد من تحديد طبيعة الدين وتاريخ استحقاقه وما إذا كان قد صدر إقرار أو سداد جزئي أو حكم أو مطالبة رسمية أو إجراء تنفيذ. هذه الوقائع قد تؤثر في بدء المدة أو استمرارها أو انقطاعها. لا يجوز افتراض سقوط الدين أو بقائه دون فحص النص اليمني الخاص بنوع الالتزام والمستند.

### ثانياً: القواعد التي تحكم التقييم

| المسألة | ما الذي يجب إثباته؟ | الأثر العملي |
|---|---|---|
| أصل الدين | عقد، قرض، بيع، أجرة، شيك، سند أو إقرار | يحدد نوع الدعوى والقواعد الواجبة التطبيق |
| تاريخ الاستحقاق | اليوم الذي أصبح فيه الأداء واجباً | هو نقطة البداية المحتملة للحساب |
| الإقرار أو السداد | إقرار مكتوب، تحويل، دفعة، كشف حساب أو مراسلة | قد يؤثر في الاعتراف بالدين وحساب المدة |
| المطالبة الرسمية | إنذار، دعوى، محضر صلح أو إجراء تنفيذ | قد يغيّر المركز الإجرائي بحسب النص المنطبق |
| الحكم السابق | رقم الحكم وتاريخه ومرحلة التنفيذ | يحول البحث من إثبات أصل الدين إلى التنفيذ أو التقادم التنفيذي |
| الضمانات | رهن، كفيل، تضامن أو شيك | قد توجد مطالبات مستقلة أو قواعد خاصة |

### ثالثاً: ما الذي أفعله كمحامٍ؟

1. أطلب من الموكل رواية زمنية دقيقة: تاريخ نشوء الدين، تاريخ الاستحقاق، كل دفعة، كل اعتراف، كل مطالبة، وأي حكم أو تنفيذ.
2. أتحقق من أصل المستند لا من صورة غير مكتملة، وأطابق المبلغ والتوقيع والصفة والتاريخ.
3. أحدد نوع الالتزام قبل اختيار الدعوى؛ فدعوى أصل الدين تختلف عن دعوى تنفيذ سند أو مطالبة بشيك أو تنفيذ حكم.
4. أبحث عن الإقرار والسداد الجزئي والمراسلات التي تثبت بقاء الالتزام أو تنازع المدين فيه.
5. أفحص الاختصاص والصفة والمصلحة وقابلية الدعوى للسماع قبل صياغة الطلبات.
6. أعد كشف حساب يوضح أصل الدين والمدفوع والمتبقي، وأفصل الفوائد أو التعويضات إن وجدت عن أصل المبلغ.
7. أوجه إنذاراً قانونياً عند ملاءمته، مع حفظ دليل التبليغ، ثم أختار بين الدعوى وإجراء التنفيذ بحسب قوة السند.
8. لا أذكر مدة تقادم في صحيفة الدعوى إلا بعد التحقق من النص النافذ وتاريخ بدء المدة وأسباب الوقف أو الانقطاع.

### رابعاً: الدفوع المتوقعة من الخصم والرد عليها

| دفع الخصم | كيف يُفحص؟ | الرد أو الإجراء المقابل |
|---|---|---|
| التقادم | تحديد نوع الدين وتاريخ الاستحقاق وآخر إقرار أو سداد أو مطالبة | مناقشة بدء المدة وأسباب الوقف أو الانقطاع، دون افتراض مدة غير موثقة |
| السداد | طلب أصل الإيصال أو التحويل ومطابقة المبلغ والتاريخ | خصم المبالغ الثابتة وبيان المتبقي، والطعن في الإيصال غير المنسوب أو غير الكافي |
| إنكار التوقيع أو المحرر | فحص الأصل والصفة والختم والخبرة عند الحاجة | طلب إلزام الخصم بالمضاهاة أو التحقيق وفق الإجراء المناسب |
| بطلان العقد أو عدم الصفة | مراجعة أهلية الأطراف والوكالة والتمثيل | تصحيح الصفة أو تقديم مستندات التفويض والتمثيل |
| عدم الاختصاص | تحديد موطن الخصم ومكان التنفيذ ونوع السند | اختيار المحكمة أو الجهة المختصة وتفنيد الدفع بالوقائع والمستند |
| المقاصة أو الإبراء | مطالبة الخصم بإثبات الدين المقابل أو الإبراء الصريح | مناقشة شروط المقاصة ونطاق الإبراء وتاريخه |
| عدم استحقاق المبلغ | مراجعة الشرط أو تاريخ الاستحقاق أو التسليم | تقديم العقد وكشف الحساب وإثبات تحقق الشرط |

### خامساً: ملف المستندات

| المجموعة | المستندات |
|---|---|
| أصل الالتزام | العقد، السند، الشيك، الإقرار، الفاتورة أو محضر التسليم |
| إثبات المبلغ | كشف حساب، إيصالات، تحويلات، قيود محاسبية ومراسلات |
| إثبات المطالبة | إنذار، رسالة مطالبة، محضر صلح، دعوى سابقة أو محضر تنفيذ |
| الرد على السداد | بيان بالدفعات وتواريخها وما إذا كانت عن الدين نفسه |
| الضمانات | الرهن، الكفالة، التضامن أو أي ضمان تابع |
| الإجراءات السابقة | الأحكام والقرارات ومحاضر التبليغ والتنفيذ |

### سادساً: المخاطر

أكبر خطر هو بناء الدعوى على رقم مدة محفوظ من الذاكرة. الخطر الثاني هو الخلط بين تقادم أصل الدين وتقادم تنفيذ الحكم. والخطر الثالث هو تقديم صورة مبتورة من المستند أو إغفال دفعة أو إقرار يغير الحساب. كما يجب التمييز بين الدين المدني والدين التجاري والشيك والسند، لأن الوصف قد يغير الطريق الإجرائي.

### سابعاً: خطة العمل المختصرة

ابدأ بجدول زمني ومستندات أصلية وكشف حساب. بعد ذلك صنّف الدين، وحدد المحكمة والطريق الإجرائي، وافحص التقادم وأسبابه، ثم وجّه المطالبة أو ارفع الإجراء المناسب. إذا لم يوجد مستند كافٍ، فالأولوية لبناء الإثبات لا لرفع دعوى متسرعة.

> هذه مذكرة معلوماتية أولية مبنية على الوقائع المذكورة، ولا تحسم مدة التقادم أو صلاحية الدعوى دون مراجعة المستندات والنص النافذ.` : `## الرأي القانوني الأولي\n\nالمسألة تتعلق بالنفقة، وتحديد النتيجة يتوقف على صفة المطالب والعلاقة القانونية والفترة والمستندات.\n\n## الدفوع والمستندات\n\nتُفحص الصفة والمصلحة والوفاء السابق وصحة التبليغ والاختصاص ومقدار الطلب، مع عقد الزواج أو وثيقة الطلاق وما يثبت الدخل والسداد والأحكام السابقة.\n\n## المراجع القانونية\n\n${hits.slice(0, 5).map((h, i) => `(${i + 1}) ${h.title}`).join('\\n')}\n\n> هذا رأي معلوماتي أولي وليس حكمًا قضائيًا أو استشارة ملزمة.`) : 'لا تكفي المعطيات الحالية لإبداء رأي مسؤول. اذكر نوع الالتزام، تاريخ الاستحقاق، المستند، وأي سداد أو مطالبة أو حكم سابق.';
  return { answer, sources: [], grounded: hits.length > 0, confidence: hits.length ? 'متوسطة' : 'منخفضة', model: 'static-grounded-search' };
}
async function request(path, options, fallback) {
  try { const r = await fetch(API + path, options); if (!r.ok) throw new Error(`API ${r.status}`); return await r.json(); }
  catch (error) { if (fallback) return fallback(); throw error; }
}
const LawyerAPI = {
  async chat(message, opts = {}) { return request('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, ...opts }) }, () => staticChat(message)); },
  async search(query, opts = {}) { return request('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, ...opts }) }, async () => { const index = await staticIndex(); const results = staticSearch(query, { ...opts, index }); return { results, total: results.length }; }); },
  async getDoc(id) { return request('/doc?id=' + encodeURIComponent(id), null, async () => { const index = await staticIndex(); const d = index.documents.find(x => x.id === id); return d || { error: 'not found' }; }); },
  async stats() { return request('/stats', null, async () => { const i = await staticIndex(); return { total: i.documents.length, laws: i.documents.filter(x => x.category === 'laws').length, library: i.documents.filter(x => x.category === 'library').length, contracts: i.documents.filter(x => x.category === 'contracts').length, articles: i.documents.filter(x => x.category === 'articles').length }; }); },
  async laws() { return request('/laws', null, async () => { const i = await staticIndex(); return i.documents.filter(x => x.category === 'laws').map(x => ({ id: x.id, title: x.title, length: x.content.length })); }); },
  async librarySubcategories() { return request('/library/subcategories', null, async () => { const i = await staticIndex(), out = {}; i.documents.filter(x => x.category === 'library').forEach(x => { const subcat = (x.filename.match(/^(.+?)_\d+_/) || [])[1] || 'عام'; (out[subcat] ||= { count: 0, items: [] }).count++; out[subcat].items.push({ id: x.id, title: x.title }); }); return out; }); },
  async libraryBySubcat(subcat) { return request('/library/' + encodeURIComponent(subcat), null, async () => { const i = await staticIndex(); const items = i.documents.filter(x => x.category === 'library' && x.filename.startsWith(subcat + '_')).map(x => ({ id: x.id, title: x.title, length: x.content.length })); return { subcat, count: items.length, items }; }); },
  async contractTypes() { return request('/contracts/types', null, async () => { const i = await staticIndex(), out = {}; i.documents.filter(x => x.category === 'contracts').forEach(x => { const type = /بيع/.test(x.filename) ? 'بيع' : /إيجار/.test(x.filename) ? 'إيجار' : /وكالة/.test(x.filename) ? 'وكالة' : 'أخرى'; (out[type] ||= { count: 0, items: [] }).count++; out[type].items.push({ id: x.id, title: x.title }); }); return out; }); },
  async contractsByType(type) { return request('/contracts/' + encodeURIComponent(type), null, async () => { const i = await staticIndex(); const items = i.documents.filter(x => x.category === 'contracts' && ((type === 'بيع' && /بيع/.test(x.filename)) || (type === 'إيجار' && /إيجار/.test(x.filename)) || (type === 'وكالة' && /وكالة/.test(x.filename)) || (type === 'أخرى' && !/بيع|إيجار|وكالة/.test(x.filename)))).map(x => ({ id: x.id, title: x.title, length: x.content.length })); return { type, count: items.length, items }; }); },
  async articles() { return request('/articles', null, async () => { const i = await staticIndex(); return i.documents.filter(x => x.category === 'articles').map(x => ({ id: x.id, title: x.title, length: x.content.length })); }); },
  async generateContract(contractId, fields) { return request('/contracts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractId, fields }) }); }
};
