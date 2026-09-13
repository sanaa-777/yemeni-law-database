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
  const answer = hits.length ? (debt ? `## خلاصة الرأي\n\nدين مضى عليه عشرون عامًا لا يعني تلقائيًا أنه سقط، ولا يعني تلقائيًا أنه ما زال قابلًا للمطالبة. النتيجة تتوقف على نوع الدين، وتاريخ استحقاقه، ووجود إقرار أو سداد جزئي أو حكم قضائي أو مطالبة رسمية.\n\n## ما يجب فحصه\n\n1. أصل الدين: قرض، بيع، أجرة، شيك، سند، أو التزام آخر.\n2. تاريخ الاستحقاق الفعلي، لا تاريخ بداية العلاقة فقط.\n3. وجود إقرار مكتوب أو سداد جزئي أو اتفاق جديد.\n4. وجود حكم قضائي أو مطالبة رسمية أو إجراء تنفيذ.\n5. وجود رهن أو كفيل أو مدين متضامن.\n6. النص الخاص الذي يحكم نوع الدين والسند.\n\n## دفع التقادم\n\nقد يتمسك المدين بالتقادم، لكن لا يجوز الجزم بسقوط الدين أو تحديد المدة دون التحقق من نوع الالتزام والنص النافذ وأسباب الوقف أو الانقطاع. وقد يغير الإقرار أو السداد الجزئي أو الحكم السابق طريقة الحساب.\n\n## المستندات المطلوبة\n\nالعقد أو السند الأصلي، كشوف الحساب، التحويلات، الإقرارات، المراسلات، الإنذارات والمطالبات، أي حكم أو صلح، وبيانات الضمانات والكفلاء.\n\n## الخطوة العملية\n\nأنشئ خطًا زمنيًا من تاريخ الاستحقاق حتى اليوم، ثم راجع قابلية المطالبة والدفوع المحتملة على ضوء النص اليمني الخاص بنوع الدين. لم أتحقق من مدة محددة هنا، لذلك لا ينبغي افتراض رقم أو مدة قانونية دون سند.` : `## الرأي القانوني الأولي\n\nالمسألة تتعلق بالنفقة، وتحديد النتيجة يتوقف على صفة المطالب والعلاقة القانونية والفترة والمستندات.\n\n## الدفوع والمستندات\n\nتُفحص الصفة والمصلحة والوفاء السابق وصحة التبليغ والاختصاص ومقدار الطلب، مع عقد الزواج أو وثيقة الطلاق وما يثبت الدخل والسداد والأحكام السابقة.\n\n## المراجع القانونية\n\n${hits.slice(0, 5).map((h, i) => `(${i + 1}) ${h.title}`).join('\\n')}\n\n> هذا رأي معلوماتي أولي وليس حكمًا قضائيًا أو استشارة ملزمة.`) : 'لا تكفي المعطيات الحالية لإبداء رأي مسؤول. اذكر نوع الالتزام، تاريخ الاستحقاق، المستند، وأي سداد أو مطالبة أو حكم سابق.';
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
