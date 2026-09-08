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

function loadFiles(dir, category){
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.txt') && !f.includes('رئيسي'));
  return files.map(f=>{
    const content = fs.readFileSync(path.join(dir,f),'utf8');
    const title = f.replace(/\.txt$/,'').replace(/^\d+_/,'');
    return { id: `${category}_${title}`, title, category, content, filename:f };
  });
}

function initDB(){
  console.log('Loading database...');
  db.laws = loadFiles(path.join(DB_PATH,'laws'),'laws');
  db.contracts = loadFiles(path.join(DB_PATH,'contracts'),'contracts');
  db.articles = loadFiles(path.join(DB_PATH,'articles'),'articles');

  // Library has subcategories
  const libDir = path.join(DB_PATH,'library');
  const libFiles = fs.readdirSync(libDir).filter(f=>f.endsWith('.txt') && !f.includes('رئيسي'));
  db.library = libFiles.map(f=>{
    const content = fs.readFileSync(path.join(libDir,f),'utf8');
    const title = f.replace(/\.txt$/,'').replace(/^\d+_/,'');
    // Extract subcategory from filename prefix
    const parts = f.split('_');
    const subcat = parts.length > 1 ? parts.slice(0,-1).join('_').replace(/^\d+_?/,'') : 'عام';
    return { id:`library_${title}`, title, category:'library', subcat, content, filename:f };
  });

  db.all = [...db.laws, ...db.library, ...db.contracts, ...db.articles];
  console.log(`Loaded: ${db.laws.length} laws, ${db.library.length} library, ${db.contracts.length} contracts, ${db.articles.length} articles`);
  console.log(`Total: ${db.all.length} documents, ${(db.all.reduce((s,d)=>s+d.content.length,0)/1e6).toFixed(1)}M chars`);
}

initDB();

/* ══════ SEARCH ENGINE ══════ */
function search(query, limit=8){
  const q = query.replace(/[؟?!.,،؛:]/g,' ').trim();
  const words = q.split(/\s+/).filter(w=>w.length>1);
  if(!words.length) return [];

  const scored = db.all.map(doc=>{
    let score = 0;
    const lower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    for(const w of words){
      const wl = w.toLowerCase();
      // Title match (highest weight)
      if(titleLower.includes(wl)) score += 30;
      // Content match
      const count = (lower.match(new RegExp(wl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
      score += Math.min(count * 3, 25);
    }

    // Exact phrase bonus
    if(words.length>1 && lower.includes(q.toLowerCase())) score += 40;

    // Category bonus for legal queries
    if(doc.category==='laws') score += 5;
    if(doc.category==='library') score += 8;

    return { ...doc, score, content:undefined };
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);

  return scored;
}

/* ══════ FIND RELEVANT SECTIONS ══════ */
function findSections(query, limit=3){
  const results = search(query, limit);
  return results.map(r=>{
    const doc = db.all.find(d=>d.id===r.id);
    if(!doc) return null;
    // Extract most relevant paragraph
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

/* ══════ GENERATE RESPONSE ══════ */
function generateResponse(query){
  const sections = findSections(query, 4);
  if(!sections.length){
    return {
      answer: 'عذراً، لم أجد معلومات محددة في قاعدة البيانات القانونية حول استفسارك. يُرجى إعادة صياغة السؤال أو التوجه لمحامٍ متخصص.',
      sources:[], steps:['بحث في قاعدة البيانات']
    };
  }

  const topCategory = sections[0].category;
  const catNames = {laws:'القوانين',library:'الدعاوى والإجراءات',contracts:'العقود',articles:'المقالات'};
  const steps = [
    `تحليل الاستشارة القانونية`,
    `البحث في ${db.all.length} وثيقة قانونية`,
    `وجدت ${sections.length} مراجع ذات صلة في قسم ${catNames[topCategory]||'القانون'}`,
    `إعداد الرد القانوني`
  ];

  // Build answer from excerpts
  let answer = 'بناءً على تحليلي لسؤالك ومراجعة القاعدة القانونية اليمنية:\n\n';
  sections.forEach((s,i)=>{
    answer += `${i===1?'':'─────────────────\n'}`;
    answer += `📌 ${s.title}\n`;
    answer += `${s.excerpt.substring(0,400)}${s.excerpt.length>400?'...':''}\n\n`;
  });

  answer += '─────────────────\n⚠️ تنبيه: هذه معلومات قانونية عامة مستخلصة من القوانين اليمنية. يُنصح بمراجعة محامٍ متخصص لمراجعة تفاصيل قضيتك.';

  const sources = sections.map(s=>({
    title:s.title, category:catNames[s.category]||s.category,
    score:s.score, id:s.id
  }));

  return { answer, sources, steps };
}

/* ══════ API ROUTES ══════ */

// Search endpoint
app.post('/api/search', (req, res) => {
  const { query, limit } = req.body;
  if(!query) return res.status(400).json({error:'query required'});
  const results = search(query, limit||8);
  res.json({ results, total: results.length });
});

// Agent chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if(!message) return res.status(400).json({error:'message required'});

  // Simulate processing delay
  setTimeout(()=>{
    const response = generateResponse(message);
    res.json(response);
  }, 800);
});

// Get document by ID
app.get('/api/doc/:id', (req, res) => {
  const doc = db.all.find(d=>d.id===req.params.id);
  if(!doc) return res.status(404).json({error:'not found'});
  res.json({ id:doc.id, title:doc.title, category:doc.category, content:doc.content });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    laws: db.laws.length,
    library: db.library.length,
    contracts: db.contracts.length,
    articles: db.articles.length,
    total: db.all.length,
    totalChars: db.all.reduce((s,d)=>s+d.content.length,0)
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  const cats = {};
  db.all.forEach(d=>{
    if(!cats[d.category]) cats[d.category]=0;
    cats[d.category]++;
  });
  res.json(cats);
});

/* ══════ START ══════ */
app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
});
