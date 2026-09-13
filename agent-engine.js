const CATEGORY_NAMES = { laws: 'القوانين واللوائح', library: 'الدعاوى والإجراءات', contracts: 'نماذج العقود', articles: 'المقالات القانونية' };

function normalizeArabic(value) {
  return String(value || '').normalize('NFKC').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').trim();
}

function retrieve(query, db, search, limit = 10) {
  const variants = [query, normalizeArabic(query)].filter(Boolean);
  const merged = new Map();
  for (const variant of variants) for (const item of search(variant, { limit })) {
    const previous = merged.get(item.id);
    if (!previous || item.score > previous.score) merged.set(item.id, item);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit).map(hit => {
    const doc = db.all.find(d => d.id === hit.id);
    const text = doc?.content || '';
    const queryWords = normalizeArabic(query).split(/\s+/).filter(w => w.length > 2);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 60);
    const best = paragraphs.map(p => ({ p, score: queryWords.reduce((n, w) => n + (normalizeArabic(p).includes(w) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score)[0];
    return { id: hit.id, title: hit.title, category: hit.category, categoryName: CATEGORY_NAMES[hit.category] || hit.category, score: hit.score, excerpt: (best?.p || text).slice(0, 1800), filename: hit.filename };
  });
}

function fallbackAnalysis(question, hits) {
  if (!hits.length) return {
    answer: 'لم أعثر على مصدر كافٍ في قاعدة البيانات الحالية. أحتاج إلى وقائع أوضح، واسم القانون أو المحكمة أو الفترة الزمنية حتى أبحث بدقة.',
    sources: [], grounded: false, confidence: 'منخفضة', analysis: { issues: [], defenses: [], documents: [], risks: [], nextSteps: [] }
  };
  const sources = hits.map((h, i) => ({ number: i + 1, id: h.id, title: h.title, category: h.categoryName, score: h.score }));
  const sourceLines = hits.slice(0, 3).map((h, i) => `(${i + 1}) ${h.title}`).join('\n');
  return {
    answer: `## خلاصة الرأي\n\nلا يمكن الجزم بالنتيجة قبل تثبيت الوقائع والصفة والاختصاص والمواعيد، لكن القاعدة الأقرب للمسألة هي التي تحكم نوع العلاقة والطلب مباشرة.\n\n## التكييف والدفوع\n\nتُفحص الدفوع الشكلية أولاً، ثم أصل الحق وعبء الإثبات، ثم مقدار الطلب ومدته. ولا يُعتد بأي دفع لا تؤيده واقعة أو مستند.\n\n## المستندات ونقاط الفحص\n\nيلزم ترتيب المستندات بحسب كل واقعة، والتحقق من سلامة التبليغ، وصحة التواريخ، وعدم تكرار المطالبة، وأي حكم أو اتفاق سابق.\n\n## المراجع القانونية\n\n${sourceLines}\n\n## الخطوة العملية\n\nحدد أطراف النزاع، التسلسل الزمني، الطلب، المحكمة، والمستندات المتاحة لإكمال الرأي بدقة.\n\n> هذا رأي معلوماتي أولي وليس حكماً قضائياً أو استشارة ملزمة.`,
    sources, grounded: true, confidence: hits[0].score >= 40 ? 'متوسطة' : 'محدودة',
    analysis: { issues: [], defenses: [], documents: [], risks: [], nextSteps: ['تثبيت الوقائع والتواريخ', 'مطابقة النص القانوني الأصلي', 'مراجعة محامٍ مختص'] }
  };
}

function systemPrompt() {
  return `أنت وكيل محاماة وتحليل قضائي متخصص في القانون اليمني. مهمتك مساعدة المحامي والشخص العادي بتحليل منضبط لا بادعاء أنك محامٍ أو قاضٍ حقيقي. استخدم السياق المرفق فقط لإسناد القواعد؛ لا تخترع رقم مادة أو نصاً أو حكماً. إذا لم يكف السياق قل ذلك صراحة واقترح ما يجب البحث عنه. فرّق دائماً بين: (1) نص/قاعدة مسندة بمصدر، (2) استنتاج تحليلي، (3) احتمال يحتاج تحققاً. حلّل من جهات متعددة: محامي المدعي، محامي المدعى عليه، ونظرة القاضي المحايد. استخرج الدفوع الشكلية والموضوعية، أوجه البطلان والقصور والتناقض ومشكلات الإثبات والاختصاص والمواعيد والصفة والمصلحة والتقادم والتنفيذ، والمستندات المطلوبة، والثغرات المشروعة التي يمكن استثمارها، والمخاطر والبدائل. لا تقترح إخفاء أدلة أو تضليل المحكمة أو التحايل غير المشروع. اكتب بالعربية الفصحى السلسة وبعناوين واضحة، وأعد JSON صحيحاً بالمخطط المطلوب دون Markdown fences.`;
}

function buildModelPayload(question, hits) {
  const context = hits.map((h, i) => `المصدر ${i + 1}: ${h.title} | التصنيف: ${h.categoryName}\n${h.excerpt}`).join('\n\n---\n\n');
  const schema = {
    answer: 'إجابة عربية مرتبة بعناوين: خلاصة، تكييف قانوني، دفوع محتملة، مستندات، ثغرات/نقاط فحص مشروعة، منظور الطرف الآخر، منظور القاضي، مخاطر، خطوات عملية، أسئلة ناقصة، وتنبيه.',
    confidence: 'مرتفع|متوسط|منخفض',
    analysis: { issues: ['...'], defenses: ['...'], documents: ['...'], loopholes: ['نقاط فحص قانونية مشروعة...'], risks: ['...'], nextSteps: ['...'], missingFacts: ['...'] },
    citations: [{ sourceNumber: 1, claim: 'الادعاء الذي يسنده المصدر', support: 'مقتطف أو وصف دقيق دون اختلاق' }]
  };
  return { system: systemPrompt(), user: `السؤال/الوقائع:\n${question}\n\nالسياق القانوني المفهرس:\n${context}\n\nأعد كائناً يطابق هذا المخطط:\n${JSON.stringify(schema)}` };
}

function parseModel(text, fallback) {
  try {
    const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.answer || typeof parsed.answer !== 'string') throw new Error('invalid answer');
    return { ...fallback, ...parsed, modelReviewed: true };
  } catch { return { ...fallback, answer: String(text || fallback.answer), modelReviewed: false, modelWarning: 'تعذر قراءة الصيغة المنظمة؛ عُرض النص مع مصادره.' }; }
}

module.exports = { normalizeArabic, retrieve, fallbackAnalysis, buildModelPayload, parseModel };
