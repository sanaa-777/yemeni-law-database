const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { retrieve, fallbackAnalysis } = require('./agent-engine');
const { gateAndRank } = require('./legal-retrieval');
const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use(express.static(path.join(__dirname, 'public')));
const DB_PATH = path.join(__dirname, 'yemeni-law-database');
const db = { laws: [], library: [], contracts: [], articles: [], all: [] };
const libSubcats = {};
const contractTypes = {};
function loadFiles(dir, category) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.txt') && !f.includes('رئيسي')).map(filename => ({ id: `${category}_${filename}`, title: filename.replace(/\.txt$/, '').replace(/^\d+_/, ''), category, content: fs.readFileSync(path.join(dir, filename), 'utf8'), filename }));
}
function initDB() {
  db.laws = loadFiles(path.join(DB_PATH, 'laws'), 'laws');
  db.contracts = loadFiles(path.join(DB_PATH, 'contracts'), 'contracts');
  db.articles = loadFiles(path.join(DB_PATH, 'articles'), 'articles');
  db.library = loadFiles(path.join(DB_PATH, 'library'), 'library').map(d => ({ ...d, subcat: (d.filename.match(/^(.+?)_\d+_/) || [])[1] || 'عام' }));
  db.library.forEach(d => (libSubcats[d.subcat] ||= []).push({ id: d.id, title: d.title }));
  db.contracts.forEach(d => { const f = d.filename; d.type = /بيع/.test(f) ? 'بيع' : /إيجار/.test(f) ? 'إيجار' : /وكالة/.test(f) ? 'وكالة' : /شراكة/.test(f) ? 'شراكة' : /رهن/.test(f) ? 'رهن' : /كفالة|ضمان/.test(f) ? 'كفالة وضمان' : /تنازل/.test(f) ? 'تنازل' : /إقرار/.test(f) ? 'إقرار' : /قسمة|وصايا|وقف|هبة/.test(f) ? 'قسمة ووصايا' : /صلح|اتفاق|تحكيم/.test(f) ? 'صلح واتفاق' : /عمل|مقاولة/.test(f) ? 'عمل ومقاولة' : /قرض/.test(f) ? 'قرض' : /دعوى|شكوى/.test(f) ? 'دعوى وشكوى' : /نموذج|موافقة/.test(f) ? 'نماذج عامة' : 'أخرى'; (contractTypes[d.type] ||= []).push({ id: d.id, title: d.title }); });
  db.all = [...db.laws, ...db.library, ...db.contracts, ...db.articles];
}
initDB();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rawSearch(query, { limit = 8, category, subcat } = {}) { const words = String(query || '').replace(/[؟?!.,،؛:]/g, ' ').trim().split(/\s+/).filter(w => w.length > 1); if (!words.length) return []; return db.all.filter(d => (!category || d.category === category) && (!subcat || d.subcat === subcat)).map(doc => { const t = doc.title.toLowerCase(), b = doc.content.toLowerCase(); let score = 0; words.forEach(w => { const x = w.toLowerCase(); score += t.includes(x) ? 30 : 0; score += Math.min((b.match(new RegExp(esc(x), 'g')) || []).length * 3, 25); }); score += doc.category === 'laws' ? 5 : doc.category === 'library' ? 8 : 0; return { id: doc.id, title: doc.title, category: doc.category, subcat: doc.subcat || null, type: doc.type || null, score, filename: doc.filename }; }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit); }
function search(query, opts = {}) { return gateAndRank(query, db.all, q => rawSearch(q, opts), opts.limit || 8).results; }
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'yemeni-law-api', documents: db.all.length }));
app.get('/api/stats', (req, res) => res.json({ laws: db.laws.length, library: db.library.length, contracts: db.contracts.length, articles: db.articles.length, total: db.all.length, totalChars: db.all.reduce((n, d) => n + d.content.length, 0) }));
app.post('/api/search', (req, res) => { const results = search(req.body.query, req.body); res.json({ results, total: results.length }); });
app.post('/api/chat', (req, res) => {
  if (!req.body.message) return res.status(400).json({ error: 'message required' });
  const hits = retrieve(req.body.message, db, search, Number(req.body.limit || 10));
  res.json({ ...fallbackAnalysis(req.body.message, hits), model: 'grounded-search', mode: 'مراجعة مصادر بدون نموذج خارجي' });
});
app.get('/api/doc', (req, res) => { const d = db.all.find(x => x.id === req.query.id); d ? res.json({ id: d.id, title: d.title, category: d.category, content: d.content }) : res.status(404).json({ error: 'not found' }); });
app.use('/admin/api', require('./admin-routes'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
module.exports = { app, search, db };
if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
