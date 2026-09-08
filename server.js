const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ══════ LOAD DATABASE ══════ */
const DB_PATH = path.join(__dirname, 'yemeni-law-database');
let db = { laws:[], library:[], contracts:[], articles:[], all:[] };
let libSubcats = {};
let contractTypes = {};

function loadFiles(dir, category){
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.txt') && !f.includes('رئيسي'));
  return files.map(f=>{
    const content = fs.readFileSync(path.join(dir,f),'utf8');
    const title = f.replace(/\.txt$/,'').replace(/^\d+_/,'');
    return { id:`${category}_${f}`, title, category, content, filename:f };
  });
}

function initDB(){
  console.log('Loading database...');
  db.laws = loadFiles(path.join(DB_PATH,'laws'),'laws');
  db.contracts = loadFiles(path.join(DB_PATH,'contracts'),'contracts');
  db.articles = loadFiles(path.join(DB_PATH,'articles'),'articles');

  // Library with subcategories
  const libDir = path.join(DB_PATH,'library');
  const libFiles = fs.readdirSync(libDir).filter(f=>f.endsWith('.txt') && !f.includes('رئيسي'));
  db.library = libFiles.map(f=>{
    const content = fs.readFileSync(path.join(libDir,f),'utf8');
    const title = f.replace(/\.txt$/,'');
    // Extract subcategory: filename like "الأحوال الشخصية_16_دعوى نفقة زوجية.txt"
    const match = f.match(/^(.+?)_\d+_/);
    const subcat = match ? match[1] : 'عام';
    return { id:`library_${f}`, title, category:'library', subcat, content, filename:f };
  });

  // Index library subcategories
  db.library.forEach(d=>{
    if(!libSubcats[d.subcat]) libSubcats[d.subcat]=[];
    libSubcats[d.subcat].push({ id:d.id, title:d.title, filename:d.filename });
  });

  // Index contract types from filenames
  // Pattern: "02_عقد بيع محل تجاريعقد بيعفتح العقد.txt"
  db.contracts.forEach(d=>{
    // Try to extract type from filename
    const fname = d.filename;
    let type = 'أخرى';
    if(/بيع/.test(fname)) type='بيع';
    else if(/إيجار/.test(fname)) type='إيجار';
    else if(/وكالة/.test(fname)) type='وكالة';
    else if(/شراكة/.test(fname)) type='شراكة';
    else if(/رهن/.test(fname)) type='رهن';
    else if(/كفالة|ضمان/.test(fname)) type='كفالة وضمان';
    else if(/تنازل/.test(fname)) type='تنازل';
    else if(/إقرار/.test(fname)) type='إقرار';
    else if(/قسمة|وصايا|وقف|هبة/.test(fname)) type='قسمة ووصايا';
    else if(/صلح|اتفاق|تحكيم/.test(fname)) type='صلح واتفاق';
    else if(/عمل|مقاولة/.test(fname)) type='عمل ومقاولة';
    else if(/قرض/.test(fname)) type='قرض';
    else if(/وكالة/.test(fname)) type='وكالة';
    else if(/دعوى|شكوى/.test(fname)) type='دعوى وشكوى';
    else if(/نموذج|موافقة/.test(fname)) type='نماذج عامة';
    d.type = type;
    if(!contractTypes[type]) contractTypes[type]=[];
    contractTypes[type].push({ id:d.id, title:d.title, filename:d.filename });
  });

  db.all = [...db.laws, ...db.library, ...db.contracts, ...db.articles];
  console.log(`Loaded: ${db.laws.length} laws, ${db.library.length} library, ${db.contracts.length} contracts, ${db.articles.length} articles`);
  console.log(`Total: ${db.all.length} documents, ${(db.all.reduce((s,d)=>s+d.content.length,0)/1e6).toFixed(1)}M chars`);
  console.log(`Library subcategories: ${Object.keys(libSubcats).join(', ')}`);
  console.log(`Contract types: ${Object.keys(contractTypes).join(', ')}`);
}

initDB();

/* ══════ SEARCH ENGINE ══════ */
function search(query, opts={}){
  const { limit=8, category=null, subcat=null } = opts;
  const q = query.replace(/[؟?!.,،؛:]/g,' ').trim();
  const words = q.split(/\s+/).filter(w=>w.length>1);
  if(!words.length) return [];

  let pool = db.all;
  if(category==='library' && subcat){
    pool = db.library.filter(d=>d.subcat===subcat);
  } else if(category){
    pool = db.all.filter(d=>d.category===category);
  }

  const scored = pool.map(doc=>{
    let score = 0;
    const lower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    for(const w of words){
      const wl = w.toLowerCase();
      if(titleLower.includes(wl)) score += 30;
      const count = (lower.match(new RegExp(wl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
      score += Math.min(count * 3, 25);
    }

    if(words.length>1 && lower.includes(q.toLowerCase())) score += 40;
    if(doc.category==='laws') score += 5;
    if(doc.category==='library') score += 8;

    return { id:doc.id, title:doc.title, category:doc.category, subcat:doc.subcat||null, type:doc.type||null, score, filename:doc.filename };
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);

  return scored;
}

function findSections(query, limit=3){
  const results = search(query, {limit});
  return results.map(r=>{
    const doc = db.all.find(d=>d.id===r.id);
    if(!doc) return null;
    const paras = doc.content.split(/\n\n+/).filter(p=>p.trim().length>50);
    const words = query.split(/\s+/).filter(w=>w.length>1);
    let bestPara = paras[0]||'';
    let bestScore = 0;
    for(const p of paras){
      let s=0;
      for(const w of words){ if(p.includes(w)) s+=10; }
      if(s>bestScore){bestScore=s;bestPara=p;}
    }
    return {
      id:r.id, title:r.title, category:r.category,
      score:r.score,
      excerpt: bestPara.substring(0,600),
      totalLength: doc.content.length
    };
  }).filter(Boolean);
}

function generateResponse(query, opts={}){
  const sections = findSections(query, opts.limit||4);
  if(!sections.length){
    return {
      answer: 'عذراً، لم أجد معلومات محددة في قاعدة البيانات القانونية حول استفسارك. يُرجى إعادة صياغة السؤال أو التوجه لمحامٍ متخصص.',
      sources:[], steps:['بحث في قاعدة البيانات']
    };
  }

  const catNames = {laws:'القوانين',library:'الدعاوى والإجراءات',contracts:'العقود',articles:'المقالات'};
  const steps = [
    'تحليل الاستشارة القانونية',
    `البحث في ${db.all.length} وثيقة قانونية`,
    `وجدت ${sections.length} مراجع ذات صلة`,
    'إعداد الرد القانوني'
  ];

  let answer = 'بناءً على تحليلي لسؤالك ومراجعة القاعدة القانونية اليمنية:\n\n';
  sections.forEach((s,i)=>{
    if(i>0) answer += '─────────────────\n';
    answer += `${s.title}\n`;
    answer += `${s.excerpt.substring(0,400)}${s.excerpt.length>400?'...':''}\n\n`;
  });
  answer += '─────────────────\n⚠️ تنبيه: هذه معلومات قانونية عامة مستخلصة من القوانين اليمنية. يُنصح بمراجعة محامٍ متخصص.';

  const sources = sections.map(s=>({
    title:s.title, category:catNames[s.category]||s.category, score:s.score, id:s.id
  }));

  return { answer, sources, steps };
}

/* ══════ API ROUTES ══════ */

// ── Chat ──
app.post('/api/chat', (req, res) => {
  const { message, category, subcat } = req.body;
  if(!message) return res.status(400).json({error:'message required'});
  setTimeout(()=>{
    const response = generateResponse(message, { category, subcat });
    res.json(response);
  }, 600);
});

// ── Search ──
app.post('/api/search', (req, res) => {
  const { query, limit, category, subcat } = req.body;
  if(!query) return res.status(400).json({error:'query required'});
  const results = search(query, {limit:limit||8, category, subcat});
  res.json({ results, total: results.length });
});

// ── Get document full content ──
app.get('/api/doc', (req, res) => {
  const id = req.query.id;
  if(!id) return res.status(400).json({error:'id required'});
  const doc = db.all.find(d=>d.id===id);
  if(!doc) return res.status(404).json({error:'not found'});
  res.json({ id:doc.id, title:doc.title, category:doc.category, subcat:doc.subcat||null, type:doc.type||null, content:doc.content });
});

// ── Stats ──
app.get('/api/stats', (req, res) => {
  res.json({
    laws:db.laws.length, library:db.library.length,
    contracts:db.contracts.length, articles:db.articles.length,
    total:db.all.length, totalChars:db.all.reduce((s,d)=>s+d.content.length,0)
  });
});

// ── List laws ──
app.get('/api/laws', (req, res) => {
  res.json(db.laws.map(d=>({ id:d.id, title:d.title, length:d.content.length })));
});

// ── List library subcategories ──
app.get('/api/library/subcategories', (req, res) => {
  const out = {};
  for(const [k,v] of Object.entries(libSubcats)){
    out[k] = { count:v.length, items:v.map(i=>({id:i.id,title:i.title})) };
  }
  res.json(out);
});

// ── List library items by subcategory ──
app.get('/api/library/:subcat', (req, res) => {
  const subcat = decodeURIComponent(req.params.subcat);
  const items = db.library.filter(d=>d.subcat===subcat).map(d=>({id:d.id,title:d.title,length:d.content.length}));
  res.json({ subcat, count:items.length, items });
});

// ── List contract types ──
app.get('/api/contracts/types', (req, res) => {
  const out = {};
  for(const [k,v] of Object.entries(contractTypes)){
    out[k] = { count:v.length, items:v.map(i=>({id:i.id,title:i.title})) };
  }
  res.json(out);
});

// ── List contracts by type ──
app.get('/api/contracts/:type', (req, res) => {
  const type = decodeURIComponent(req.params.type);
  const items = db.contracts.filter(d=>d.type===type).map(d=>({id:d.id,title:d.title,length:d.content.length}));
  res.json({ type, count:items.length, items });
});

// ── List articles ──
app.get('/api/articles', (req, res) => {
  res.json(db.articles.map(d=>({id:d.id,title:d.title,length:d.content.length})));
});

// ── Generate contract template (fill fields) ──
app.post('/api/contracts/generate', (req, res) => {
  const { contractId, fields } = req.body;
  if(!contractId) return res.status(400).json({error:'contractId required'});
  const doc = db.contracts.find(d=>d.id===contractId);
  if(!doc) return res.status(404).json({error:'contract not found'});

  let content = doc.content;
  // Replace placeholders if fields provided
  if(fields && typeof fields==='object'){
    for(const [k,v] of Object.entries(fields)){
      content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`,'g'), v);
    }
  }
  res.json({ id:doc.id, title:doc.title, content, type:doc.type });
});

/* ══════ START ══════ */
app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
});
