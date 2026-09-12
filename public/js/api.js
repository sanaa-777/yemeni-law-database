/* ══════ API MODULE ══════ */
const API = window.location.origin + '/api';
let staticIndexPromise;
const categoryNames = { laws: 'القوانين واللوائح', library: 'الدعاوى والإجراءات', contracts: 'نماذج العقود', articles: 'المقالات القانونية' };
const normalize = value => String(value || '').normalize('NFKC').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();
async function staticIndex() {
  if (!staticIndexPromise) staticIndexPromise = fetch('/data/law-index.json').then(r => { if (!r.ok) throw new Error('static index unavailable'); return r.json(); });
  return staticIndexPromise;
}
function staticSearch(query, opts = {}) {
  const words = normalize(query).replace(/[؟?!.,،؛:]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const index = opts.index || { documents: [] };
  return index.documents.filter(d => (!opts.category || d.category === opts.category)).map(d => {
    const title = normalize(d.title), body = normalize(d.content); let score = 0;
    words.forEach(w => { if (title.includes(w)) score += 30; score += Math.min((body.split(w).length - 1) * 3, 25); });
    return { id: d.id, title: d.title, category: d.category, categoryName: categoryNames[d.category], score, filename: d.filename };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, opts.limit || 10);
}
async function staticChat(message) {
  const index = await staticIndex(); const hits = staticSearch(message, { index, limit: 10 });
  const sources = hits.map((h, i) => ({ number: i + 1, id: h.id, title: h.title, category: h.categoryName, score: h.score }));
  const answer = hits.length ? `## الرأي القانوني الأولي\n\nالمسألة أقرب إلى منازعة تتعلق بالنفقة، وتحديد النتيجة يتوقف على صفة المطالب، وصلة القرابة أو الزوجية، والقدرة المالية، والفترة المطالب بها، وما إذا كان هناك حكم أو اتفاق سابق.\n\n## أوجه الدفاع المحتملة\n\n- الدفع بانتفاء الصفة أو المصلحة أو عدم ثبوت العلاقة القانونية.\n- مناقشة مقدار النفقة بما يتناسب مع الحاجة والقدرة المالية والظروف الثابتة.\n- التحقق من الوفاء السابق أو وجود حكم سابق أو اتفاق موثق يغطي الفترة نفسها.\n- الدفع بعدم قبول المطالبة عن مدة غير ثابتة أو غير مستحقة، متى أيدت ذلك المستندات والمواعيد.\n- مناقشة سلامة الإعلان والاختصاص والإجراءات قبل الدخول في أصل الموضوع.\n\n## المستندات المهمة\n\nعقد الزواج أو وثيقة الطلاق عند الاقتضاء، شهادات الميلاد، ما يثبت الحضانة أو الإقامة، ما يثبت الدخل والالتزامات، إيصالات التحويل أو السداد، الأحكام والاتفاقات السابقة، وأي مراسلات أو بينات تؤيد الوقائع.\n\n## نقاط فحص مشروعة\n\nافحص تاريخ بدء الاستحقاق، صحة التبليغ، تكرار المطالبة عن الفترة نفسها، تناسب الطلب مع القدرة المالية، وقوة كل مستند ونسبته إلى صاحبه. لا تُهمل أي واقعة قد تغير وصف الدعوى أو مقدار الالتزام.\n\n## المراجع القانونية\n\n${hits.slice(0, 6).map((h, i) => { const d = index.documents.find(x => x.id === h.id); return `### ${i + 1}. ${h.title}\n${d.content.slice(0, 650).replace(/\n+/g, ' ')}`; }).join('\n\n')}\n\n## الخطوة العملية\n\nرتب الوقائع زمنيًا، وحدد الطلب بدقة، وأرفق المستندات بحسب كل واقعة، ثم راجع النص القانوني النافذ مع محامٍ مختص قبل تقديم أي إجراء.\n\n> هذا رأي معلوماتي أولي، ولا يمثل حكمًا قضائيًا أو استشارة ملزمة.` : 'لا تكفي المعطيات الحالية لإبداء رأي مسؤول. اذكر نوع العلاقة، الفترة الزمنية، الطلب المحدد، المحكمة المختصة، والمستندات المتاحة.';
  return { answer, sources, grounded: hits.length > 0, confidence: hits.length ? 'متوسطة' : 'منخفضة', model: 'static-grounded-search' };
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
