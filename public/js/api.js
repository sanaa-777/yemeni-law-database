/* ══════ API MODULE ══════ */
const API = window.location.origin + '/api';
let staticIndexPromise;
const categoryNames = { laws: 'القوانين واللوائح', library: 'الدعاوى والإجراءات', contracts: 'نماذج العقود', articles: 'المقالات القانونية' };
const normalize = value => String(value || '').normalize('NFKC').replace(/[_-]+/g, ' ').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();
const topicRules = [
  { id: 'family', terms: ['نفقة','زوج','زوجة','طلاق','حضان','زواج','مهر','عدة','نشوز','خلع','افتداء','فسخ','اولاد','أولاد','نسب','ولاية','ميراث'], anchors: ['الأحوال الشخصية','نفقة','زوج','زوجة','طلاق','خلع','فسخ','حضان','أولاد'] },
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
function composeAnswer(message, topic, hits) {
  const q = normalize(message);
  if (topic.id === 'debt') return `## مذكرة المطالبة بالدين\n\n### الخلاصة\n\nتتحدد قابلية المطالبة بنوع الدين، وتاريخ استحقاقه، وقوة المستند، وأي إقرار أو سداد أو مطالبة أو حكم سابق. لا يكفي مرور الزمن وحده للجزم بالسقوط أو البقاء.\n\n### خطة المحامي\n\n1. تثبيت الوقائع في خط زمني من نشوء الدين حتى اليوم.\n2. فحص أصل الالتزام والمبلغ والصفة والتوقيع والتاريخ.\n3. إعداد كشف بالمبلغ الأصلي والمدفوع والمتبقي.\n4. تحديد الطريق: دعوى أصل حق، تنفيذ سند، أو تنفيذ حكم.\n5. فحص التقادم والوقف والانقطاع دون افتراض مدة غير موثقة.\n6. توجيه المطالبة المناسبة ثم اختيار الإجراء القضائي.\n\n### دفوع الخصم والرد عليها\n\n| دفع الخصم | ما يجب فحصه | طريقة الرد |\n|---|---|---|\n| التقادم | تاريخ الاستحقاق وآخر إقرار أو سداد | مناقشة بداية المدة وأسباب الوقف أو الانقطاع |\n| السداد | أصل الإيصال ومطابقة المبلغ | بيان المدفوع والمتبقي والطعن في غير الثابت |\n| إنكار التوقيع | أصل المحرر والصفة | طلب التحقيق أو المضاهاة عند الحاجة |\n| عدم الاختصاص | نوع السند ومكان التنفيذ | اختيار الجهة المختصة وتفنيد الدفع |\n\n### المستندات\n\nالعقد أو السند، الإيصالات والتحويلات، كشف الحساب، المراسلات، الإنذارات، الأحكام، ومحاضر الصلح أو التنفيذ.\n\n> لا تُذكر مدة تقادم محددة إلا بعد التحقق من نوع الدين والنص النافذ والمستندات.`;
  if (topic.id === 'family' && /خلع|افتداء/.test(q)) return `## مذكرة المطالبة بالخلع\n\n### التكييف القانوني\n\nالخلع طريق لإنهاء العلاقة الزوجية بطلب الزوجة عندما يتعذر استمرار الحياة الزوجية وتخشى عدم إقامة حدود العلاقة، وتُحدد آثاره وطلباته بحسب الوقائع والمستندات والقانون اليمني النافذ. لا ينبغي خلط الخلع بالطلاق للضرر أو الفسخ؛ فلكل طريق وقائع وآثار وإثبات مختلف.\n\n### ما يفعله المحامي\n\n1. يستوضح سبب استحالة استمرار الحياة الزوجية دون اختلاق وقائع.\n2. يثبت عقد الزواج والصفة والاختصاص وبيانات الزوجين.\n3. يحدد الطلب: إنهاء الزواج بالخلع، وما يتصل به من مهر أو حقوق مالية، مع فصل حقوق الأولاد عن أصل الخلع.\n4. يراجع وجود دعاوى أو أحكام سابقة في النفقة أو الضرر أو الحضانة.\n5. يصوغ صحيفة مرتبة بالوقائع والطلبات والمستندات، ويتابع التبليغ ومحاولات الإصلاح والإجراءات اللاحقة.\n\n### الدفوع المتوقعة من الزوج والرد عليها\n\n| الدفع المتوقع | كيفية التعامل معه |\n|---|---|\n| إنكار سبب استحالة العشرة | عرض الوقائع المترابطة بهدوء وربطها بالبينات المتاحة |\n| القول بإمكان استمرار الحياة | بيان الوقائع الحالية وآثارها العملية دون مبالغة |\n| المنازعة في المهر أو الحقوق | تقديم العقد وإيصالات المهر وكشف المطالبات بدقة |\n| الدفع بعدم الاختصاص أو بطلان الإعلان | مراجعة المحكمة المختصة وصحة بيانات التبليغ قبل الإيداع |\n| وجود دعوى سابقة | بيان موضوعها وطلباتها حتى لا تختلط المسارات |\n\n### المستندات المطلوبة\n\nعقد الزواج، الهوية، ما يثبت محل الإقامة والاختصاص، ما يثبت المهر أو الوفاء، المراسلات أو الشكاوى أو محاضر الصلح إن وجدت، وأحكام أو دعاوى سابقة. أما الحضانة والنفقة وحقوق الأولاد فتُفحص في طلبات مستقلة أو مرتبطة بحسب الإجراء.\n\n### خطوات عملية\n\nاكتبي الوقائع زمنيًا، حددي الطلب بدقة، اجمعي المستندات الأصلية، لا تضيفي اتهامات بلا بينة، وراجعي صحيفة الدعوى قبل تقديمها. لا يمكن تقدير النتيجة من كلمة «خلع» وحدها دون معرفة عقد الزواج والمهر والطلبات والوقائع.`;
  if (topic.id === 'family') return `## الرأي في مسألة الأحوال الشخصية\n\n### التكييف\n\nيجب أولًا تحديد نوع الطلب: نفقة، حضانة، طلاق، خلع، فسخ، مهر، نسب أو ميراث؛ لأن لكل دعوى شروطًا وإثباتًا وآثارًا مختلفة.\n\n### طريقة التحليل\n\nتُرتب الوقائع زمنيًا، وتُحدد الصفة والطلب والمحكمة والمدة، ثم تُفحص المستندات والدفوع والآثار على الزوجة والأولاد والحقوق المالية.\n\n### ما يفعله المحامي\n\nيثبت العلاقة بالمحررات، يحدد الطلبات دون خلط، يفحص الدعاوى السابقة والتبليغ والاختصاص، ويعد ردًا على كل دفع بواقعة أو مستند.\n\n### ما قد يثيره الخصم\n\nالصفة، الاختصاص، صحة الإعلان، السداد، التنازل، النشوز، عدم استحقاق الطلب أو سبق الفصل؛ ويُرد على كل دفع بحسب دليله وتاريخه لا بمجرد الإنكار.\n\n### المستندات والخطوة التالية\n\nالعقود والوثائق الرسمية، ما يثبت الدخل أو السداد أو الحضانة أو الإقامة، المراسلات والأحكام السابقة. اذكر نوع الدعوى والوقائع والتواريخ لأبني لك مذكرة مخصصة.`;
  const labels={labor:'العمل والحقوق العمالية',commercial:'المنازعات التجارية',criminal:'المسائل الجزائية',civil:'المنازعات المدنية'};
  const label=labels[topic.id]||'المسألة القانونية';
  return `## مذكرة قانونية أولية: ${label}\n\n### خلاصة التكييف\n\nيجب تحديد العلاقة القانونية والطلب والواقعة المنشئة للحق، ثم فحص الاختصاص والصفة والمواعيد وعبء الإثبات قبل اختيار الإجراء.\n\n### ما يفعله المحامي\n\n1. يجمع الوقائع والتواريخ في تسلسل واضح.\n2. يحدد الطلب والخصم والجهة المختصة.\n3. يفحص العقد أو المحضر أو المستند المنشئ للحق.\n4. يقدّر الإثبات والمخاطر والبدائل.\n5. يصوغ الطلبات ويتوقع دفوع الخصم ويرد عليها بمستندات.\n\n### الدفوع المتوقعة\n\n| الدفع | الفحص والرد |\n|---|---|\n| عدم الصفة أو الاختصاص | مراجعة العلاقة ومكان الاختصاص والمحررات |\n| السداد أو التنفيذ | مطابقة الإيصالات والوقائع والتواريخ |\n| بطلان المستند | فحص الأصل والتوقيع والصفة والإجراء |\n| التقادم أو فوات الميعاد | تحديد نقطة البداية والنص والاستثناءات |\n\n### المستندات\n\nالمحرر الأصلي، المراسلات، الإيصالات، المحاضر، التبليغات، التقارير، وأي قرار أو حكم سابق.\n\n> لا تُبنى النتيجة النهائية دون وقائع كاملة ومستندات قابلة للتحقق.`;
}
async function staticChat(message) {
  const index = await staticIndex(); const topic = classifyTopic(message); const hits = staticSearch(message, { index, limit: 10 });
  const answer = composeAnswer(message, topic, hits);
  return { answer, sources: [], grounded: hits.length > 0, confidence: hits.length ? 'متوسطة' : 'منخفضة', model: 'structured-legal-advisor' };
}
async function request(path, options, fallback) {
  try { const r = await fetch(API + path, options); if (!r.ok) throw new Error(`API ${r.status}`); return await r.json(); }
  catch (error) { if (fallback) return fallback(); throw error; }
}
const LawyerAPI = {
  async chat(message, opts = {}) { return staticChat(message); },
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
