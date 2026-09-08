/* ══════ ADMIN DATA STORE ══════ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file, defaults) {
  const p = path.join(DATA_DIR, file);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  fs.writeFileSync(p, JSON.stringify(defaults, null, 2));
  return defaults;
}

function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

/* ── AGENTS ── */
let agents = loadJSON('agents.json', [
  {
    id: 'lawyer-main',
    name: 'محامي اونلاين',
    description: 'وكيل قانوني ذكي متخصص في القانون اليمني - يقدم استشارات قانونية وصياغة عقود وتحليل قضايا',
    type: 'legal-advisor',
    model: 'local-search',
    status: 'active',
    lastActive: new Date().toISOString(),
    tasksExecuted: 0,
    successRate: 95,
    tools: ['kb-search', 'law-search', 'doc-analyze', 'contract-gen', 'source-cite', 'case-analyze', 'answer-verify', 'logs'],
    knowledgeSize: 0,
    createdAt: '2026-09-08T00:00:00Z',
    updatedAt: new Date().toISOString(),
    config: {
      temperature: 0.3,
      maxTokens: 4096,
      systemInstructions: 'أنت محامٍ يمني متخصص. أجب على الأسئلة القانونية بناءً على القوانين اليمنية المتوفرة في قاعدة المعرفة. استشهد دائماً بالمصادر والمواد القانونية. إذا لم تجد إجابة، أشر إلى ذلك بوضوح.',
      responseStyle: 'professional',
      language: 'ar',
      rtl: true,
      contextWindow: 8192,
      searchLimit: 8,
      minConfidence: 0.3,
      noSourceBehavior: 'warn'
    }
  }
]);

/* ── TOOLS ── */
let tools = loadJSON('tools.json', [
  { id:'kb-search', name:'البحث في قاعدة المعرفة', description:'البحث النصي الكامل في 426 وثيقة قانونية', type:'search', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{limit:8} },
  { id:'law-search', name:'البحث في القوانين', description:'البحث في 37 قانون يمني', type:'search', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{category:'laws'} },
  { id:'case-search', name:'البحث في الأحكام والسوابق', description:'البحث في 282 دعوى وإجراء قضائي', type:'search', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{category:'library'} },
  { id:'doc-analyze', name:'تحليل المستندات', description:'تحليل النصوص القانونية واستخراج المعلومات الرئيسية', type:'analysis', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'pdf-read', name:'قراءة PDF', description:'استخراج النصوص من ملفات PDF', type:'extraction', status:'disabled', agentId:null, lastUsed:null, useCount:0, config:{} },
  { id:'text-extract', name:'استخراج النصوص', description:'استخراج النصوص من صور ومستندات ممسوحة', type:'extraction', status:'disabled', agentId:null, lastUsed:null, useCount:0, config:{} },
  { id:'web-search', name:'البحث على الإنترنت', description:'البحث في المصادر القانونية على الإنترنت', type:'search', status:'disabled', agentId:null, lastUsed:null, useCount:0, config:{} },
  { id:'text-compare', name:'مقارنة النصوص القانونية', description:'مقارنة نصين قانونيين وإظهار الفروقات', type:'analysis', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'source-verify', name:'التحقق من المصادر', description:'التحقق من صحة الاستشهاد القانوني', type:'verification', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'source-cite', name:'الاستشهاد بالمصادر', description:'إضافة مراجع قانونية منظمة للإجابة', type:'generation', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'case-analyze', name:'تحليل القضية', description:'تحليل وقائع القضية وتقديم توصيات قانونية', type:'analysis', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'timeline-build', name:'بناء التسلسل الزمني', description:'بناء جدول زمني لوقائع القضية', type:'generation', status:'disabled', agentId:null, lastUsed:null, useCount:0, config:{} },
  { id:'deadline-calc', name:'حساب المدد القانونية', description:'حساب المواعيد النهائية والتقادم', type:'calculation', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'summary-gen', name:'إنشاء ملخص قانوني', description:'تلخيص المستندات والقضايا القانونية', type:'generation', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'quality-eval', name:'تقييم جودة الإجابة', description:'تقييم دقة واكتمال الإجابة القانونية', type:'evaluation', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'answer-verify', name:'التحقق قبل العرض', description:'مراجعة الإجابة والتحقق من دقتها قبل عرضها', type:'verification', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'contract-gen', name:'توليد العقود', description:'إنشاء عقود من قوالب جاهزة مع بيانات مخصصة', type:'generation', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} },
  { id:'logs', name:'تسجيل العمليات', description:'تسجيل جميع العمليات والأنشطة', type:'utility', status:'enabled', agentId:'lawyer-main', lastUsed:null, useCount:0, config:{} }
]);

/* ── KNOWLEDGE ── */
let knowledge = loadJSON('knowledge.json', []);

/* ── KNOWLEDGE SOURCES ── */
let sources = loadJSON('sources.json', []);

/* ── MEMORY ── */
let memory = loadJSON('memory.json', {
  conversations: [],
  preferences: {},
  caseContext: {},
  temporary: [],
  longTerm: []
});

/* ── ACTIVITY LOG ── */
let activityLog = loadJSON('activity-log.json', []);

/* ── INSTRUCTION VERSIONS ── */
let instructionVersions = loadJSON('instruction-versions.json', [
  {
    id: 'v1',
    agentId: 'lawyer-main',
    instructions: agents[0].config.systemInstructions,
    version: 1,
    createdAt: '2026-09-08T00:00:00Z',
    createdBy: 'system',
    active: true
  }
]);

/* ── HELPER FUNCTIONS ── */
function logActivity(action, details, agentId = null) {
  const entry = {
    id: Date.now().toString(36),
    action,
    details,
    agentId,
    timestamp: new Date().toISOString()
  };
  activityLog.unshift(entry);
  if (activityLog.length > 500) activityLog.length = 500;
  saveJSON('activity-log.json', activityLog);
  return entry;
}

function saveAll() {
  saveJSON('agents.json', agents);
  saveJSON('tools.json', tools);
  saveJSON('knowledge.json', knowledge);
  saveJSON('sources.json', sources);
  saveJSON('memory.json', memory);
  saveJSON('activity-log.json', activityLog);
  saveJSON('instruction-versions.json', instructionVersions);
}

module.exports = {
  agents, tools, knowledge, sources, memory, activityLog, instructionVersions,
  logActivity, saveAll, saveJSON, loadJSON, DATA_DIR
};
