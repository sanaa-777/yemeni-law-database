const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { retrieve, fallbackAnalysis, buildModelPayload, parseModel } = require('./app/agent-engine');
const { gateAndRank } = require('./app/legal-retrieval');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const ROOT = path.join(__dirname, 'app');
const DATA_ROOT = path.join(ROOT, 'yemeni-law-database');
const DATA_DIR = path.join(ROOT, 'data');

function loadFiles(dir, category) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.txt') && !f.includes('رئيسي')).map(filename => {
    const content = fs.readFileSync(path.join(dir, filename), 'utf8');
    return { id: `${category}_${filename}`, title: filename.replace(/\.txt$/, '').replace(/^\d+_/, ''), category, content, filename };
  });
}
function buildDatabase() {
  const laws = loadFiles(path.join(DATA_ROOT, 'laws'), 'laws');
  const contracts = loadFiles(path.join(DATA_ROOT, 'contracts'), 'contracts');
  const articles = loadFiles(path.join(DATA_ROOT, 'articles'), 'articles');
  const library = loadFiles(path.join(DATA_ROOT, 'library'), 'library').map(d => ({ ...d, subcat: (d.filename.match(/^(.+?)_\d+_/) || [])[1] || 'عام' }));
  contracts.forEach(d => {
    const f = d.filename;
    d.type = /بيع/.test(f) ? 'بيع' : /إيجار/.test(f) ? 'إيجار' : /وكالة/.test(f) ? 'وكالة' : /شراكة/.test(f) ? 'شراكة' : /رهن/.test(f) ? 'رهن' : /كفالة|ضمان/.test(f) ? 'كفالة وضمان' : /تنازل/.test(f) ? 'تنازل' : /إقرار/.test(f) ? 'إقرار' : /قسمة|وصايا|وقف|هبة/.test(f) ? 'قسمة ووصايا' : /صلح|اتفاق|تحكيم/.test(f) ? 'صلح واتفاق' : /عمل|مقاولة/.test(f) ? 'عمل ومقاولة' : /قرض/.test(f) ? 'قرض' : /دعوى|شكوى/.test(f) ? 'دعوى وشكوى' : /نموذج|موافقة/.test(f) ? 'نماذج عامة' : 'أخرى';
  });
  return { laws, library, contracts, articles, all: [...laws, ...library, ...contracts, ...articles] };
}
const db = buildDatabase();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rawSearch(query, { limit = 8, category, subcat } = {}) {
  const words = String(query || '').replace(/[؟?!.,،؛:]/g, ' ').trim().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  let pool = db.all.filter(d => !category || d.category === category).filter(d => !subcat || d.subcat === subcat);
  return pool.map(doc => {
    const title = doc.title.toLowerCase(), body = doc.content.toLowerCase();
    let score = 0;
    words.forEach(w => { const x = w.toLowerCase(); score += title.includes(x) ? 30 : 0; score += Math.min((body.match(new RegExp(esc(x), 'g')) || []).length * 3, 25); });
    if (doc.category === 'laws') score += 5;
    if (doc.category === 'library') score += 8;
    return { id: doc.id, title: doc.title, category: doc.category, subcat: doc.subcat || null, type: doc.type || null, score, filename: doc.filename };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
function search(query, opts = {}) { return gateAndRank(query, db.all, q => rawSearch(q, opts), opts.limit || 8).results; }
function answer(message, opts) {
  const hits = search(message, { ...opts, limit: opts.limit || 5 });
  const sections = hits.map(h => { const d = db.all.find(x => x.id === h.id); return { ...h, excerpt: d.content.slice(0, 650) }; });
  if (!sections.length) return { answer: 'عذراً، لم أجد معلومات موثوقة في قاعدة البيانات حول هذا السؤال.', sources: [], grounded: false };
  return { answer: `بناءً على الوثائق القانونية اليمنية المفهرسة:\n\n${sections.map(s => `${s.title}\n${s.excerpt}`).join('\n\n─────────────────\n\n')}\n\n⚠️ هذه معلومات عامة وليست بديلاً عن استشارة محامٍ مختص.`, sources: sections.map(s => ({ id: s.id, title: s.title, category: s.category, score: s.score })), grounded: true };
}
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'yemeni-law-api', documents: db.all.length }));
app.get('/api/stats', (req, res) => res.json({ laws: db.laws.length, library: db.library.length, contracts: db.contracts.length, articles: db.articles.length, total: db.all.length, totalChars: db.all.reduce((n, d) => n + d.content.length, 0) }));
app.post('/api/search', (req, res) => res.json({ results: search(req.body.query, req.body), total: search(req.body.query, req.body).length }));
app.get('/api/doc', (req, res) => { const d = db.all.find(x => x.id === req.query.id); return d ? res.json({ id: d.id, title: d.title, category: d.category, subcat: d.subcat || null, type: d.type || null, content: d.content }) : res.status(404).json({ error: 'not found' }); });
app.post('/api/chat', async (req, res) => {
  if (!req.body.message) return res.status(400).json({ error: 'message required' });
  const hits = retrieve(req.body.message, db, search, Number(req.body.limit || 10));
  const fallback = fallbackAnalysis(req.body.message, hits);
  const base = process.env.MODEL_API_BASE;
  const key = process.env.MODEL_API_KEY;
  if (!base || !key) return res.json({ ...fallback, model: 'grounded-search', mode: 'مراجعة مصادر بدون نموذج خارجي' });
  try {
    const prompt = buildModelPayload(req.body.message, hits);
    const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.MODEL_NAME || 'gpt-4o-mini', temperature: 0.15, max_tokens: 5000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }] }) });
    if (!r.ok) throw new Error(`model ${r.status}`);
    const j = await r.json();
    return res.json({ ...parseModel(j.choices?.[0]?.message?.content, fallback), model: process.env.MODEL_NAME || 'configured-model', sources: fallback.sources });
  } catch (e) { return res.json({ ...fallback, model: 'grounded-search', modelWarning: 'تعذر الاتصال بالنموذج، تم استخدام البحث الموثق.' }); }
});
const { onRequest } = require('firebase-functions/v2/https');
// The function deliberately remains deployable without a secret: it always has a grounded-search fallback.
// Add MODEL_API_KEY through Firebase Secret Manager later to enable the optional model layer.
module.exports = { api: onRequest({ region: 'us-central1', cors: true }, app), db, search };
