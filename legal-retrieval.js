const TOPICS = [
  { id: 'family', label: 'الأحوال الشخصية', terms: ['نفقة', 'زوج', 'زوجة', 'طلاق', 'حضان', 'زواج', 'مهر', 'عدة', 'نشوز', 'اولاد', 'أولاد', 'نسب', 'ولاية', 'ميراث'], categories: ['library', 'articles', 'laws'], anchors: ['الأحوال الشخصية', 'نفقة', 'طلاق', 'حضان', 'زواج', 'الأسرة'] },
  { id: 'labor', label: 'العمل', terms: ['عامل', 'موظف', 'فصل', 'أجر', 'عمل', 'عمال', 'إجازة', 'تعويض'], categories: ['laws', 'library', 'articles'], anchors: ['العمل', 'عمال', 'فصل تعسفي'] },
  { id: 'commercial', label: 'التجارة', terms: ['تجارة', 'شركة', 'شريك', 'تاجر', 'شيك', 'بنك', 'بيع', 'استثمار'], categories: ['laws', 'library', 'contracts', 'articles'], anchors: ['التجاري', 'شركة', 'تجارية', 'شيك'] },
  { id: 'criminal', label: 'الجزائي', terms: ['جريمة', 'سرقة', 'اعتداء', 'ابتزاز', 'عقوبة', 'متهم', 'جزائي', 'جنائي'], categories: ['laws', 'library', 'articles'], anchors: ['الجرائم', 'العقوبات', 'الجزائية', 'جنائية'] },
  { id: 'debt', label: 'الديون والمطالبات المدنية', terms: ['دين', 'قرض', 'مطالبة', 'سند', 'شيك', 'مدين', 'دائن', 'تقادم', 'استحقاق'], categories: ['laws', 'library', 'contracts', 'articles'], anchors: ['الدين', 'القرض', 'المطالبة', 'التقادم', 'المدني', 'الشيك'] },
  { id: 'civil', label: 'المدني', terms: ['عقد', 'دين', 'تعويض', 'ملكية', 'إيجار', 'بيع', 'التزام', 'ضرر'], categories: ['laws', 'library', 'contracts', 'articles'], anchors: ['المدني', 'إيجار', 'عقد', 'تعويض'] }
];
function normalize(s) { return String(s || '').normalize('NFKC').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase(); }
function classify(question) {
  const q = normalize(question); const ranked = TOPICS.map(t => ({ ...t, score: t.terms.reduce((n, term) => n + (q.includes(normalize(term)) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return ranked[0].score ? ranked[0] : { id: 'general', label: 'عام', terms: [], categories: ['laws', 'library', 'contracts', 'articles'], anchors: [], score: 0 };
}
function isRelevant(doc, topic, question) {
  const title = normalize(doc.title), body = normalize(doc.content), q = normalize(question);
  if (!topic || topic.id === 'general') return true;
  if (topic.id === 'family' && ['المورد', 'تجاري', 'شركة', 'بنك', 'مقاول', 'توريد'].some(x => title.includes(normalize(x)))) return false;
  if (topic.id === 'debt' && ['الأحوال الشخصية', 'الإجراءات الجزائية', 'المهن الطبية', 'منافسة', 'حقوق الطفل', 'العمال'].some(x => title.includes(normalize(x)))) return false;
  if (!topic.categories.includes(doc.category)) return false;
  const titleHit = topic.anchors.some(a => title.includes(normalize(a)));
  const hits = topic.terms.filter(term => body.includes(normalize(term))).length;
  const questionTerms = q.split(/\s+/).filter(w => w.length > 2);
  const lexical = questionTerms.filter(w => title.includes(w) || body.includes(w)).length;
  return titleHit || hits >= 2 || lexical >= 2;
}
function legalScore(doc, topic, baseScore, question) {
  if (!topic || topic.id === 'general') return baseScore;
  const title = normalize(doc.title), body = normalize(doc.content);
  const anchor = topic.anchors.some(a => title.includes(normalize(a))) ? 120 : 0;
  const topicHits = topic.terms.reduce((n, t) => n + (body.includes(normalize(t)) ? 8 : 0), 0);
  const typeBoost = doc.category === 'laws' ? 25 : doc.category === 'library' ? 20 : doc.category === 'articles' ? 10 : 0;
  return baseScore + anchor + Math.min(topicHits, 45) + typeBoost;
}
function gateAndRank(question, docs, keywordSearch, limit = 8) {
  const topic = classify(question); const candidates = new Map();
  for (const hit of keywordSearch(question, { limit: Math.max(limit * 5, 30) })) {
    const doc = docs.find(d => d.id === hit.id);
    if (doc && isRelevant(doc, topic, question)) candidates.set(doc.id, { ...hit, score: legalScore(doc, topic, hit.score, question), topic: topic.label });
  }
  return { topic, results: [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, limit) };
}
module.exports = { TOPICS, normalize, classify, isRelevant, legalScore, gateAndRank };
