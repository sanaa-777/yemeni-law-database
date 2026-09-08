/* ══════ ADMIN API ROUTES ══════ */
const express = require('express');
const router = express.Router();
const store = require('./admin-store');

/* ━━━ AGENTS ━━━ */
router.get('/agents', (req, res) => res.json(store.agents));

router.get('/agents/:id', (req, res) => {
  const a = store.agents.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not found' });
  res.json(a);
});

router.post('/agents', (req, res) => {
  const a = { id: 'agent-' + Date.now(), ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.agents.push(a);
  store.saveJSON('agents.json', store.agents);
  store.logActivity('agent_created', `تم إنشاء الوكيل: ${a.name}`, a.id);
  res.json(a);
});

router.put('/agents/:id', (req, res) => {
  const idx = store.agents.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  store.agents[idx] = { ...store.agents[idx], ...req.body, updatedAt: new Date().toISOString() };
  store.saveJSON('agents.json', store.agents);
  store.logActivity('agent_updated', `تم تحديث الوكيل: ${store.agents[idx].name}`, req.params.id);
  res.json(store.agents[idx]);
});

router.delete('/agents/:id', (req, res) => {
  store.agents = store.agents.filter(x => x.id !== req.params.id);
  store.saveJSON('agents.json', store.agents);
  store.logActivity('agent_deleted', `تم حذف الوكيل: ${req.params.id}`);
  res.json({ ok: true });
});

/* ━━━ TOOLS ━━━ */
router.get('/tools', (req, res) => res.json(store.tools));

router.get('/tools/:id', (req, res) => {
  const t = store.tools.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

router.put('/tools/:id', (req, res) => {
  const idx = store.tools.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  store.tools[idx] = { ...store.tools[idx], ...req.body };
  store.saveJSON('tools.json', store.tools);
  store.logActivity('tool_updated', `تم تحديث الأداة: ${store.tools[idx].name}`);
  res.json(store.tools[idx]);
});

router.post('/tools/:id/toggle', (req, res) => {
  const t = store.tools.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  t.status = t.status === 'enabled' ? 'disabled' : 'enabled';
  store.saveJSON('tools.json', store.tools);
  store.logActivity('tool_toggled', `${t.status === 'enabled' ? 'تم تفعيل' : 'تم تعطيل'} الأداة: ${t.name}`);
  res.json(t);
});

router.post('/tools/:id/test', (req, res) => {
  const t = store.tools.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  // Simulate tool test
  const result = { toolId: t.id, toolName: t.name, status: t.status, testResult: t.status === 'enabled' ? 'pass' : 'skipped', testedAt: new Date().toISOString() };
  store.logActivity('tool_tested', `اختبار الأداة: ${t.name} - ${result.testResult}`);
  res.json(result);
});

/* ━━━ KNOWLEDGE ━━━ */
router.get('/knowledge', (req, res) => {
  let items = [...store.knowledge];
  if (req.query.agentId) items = items.filter(k => k.agentId === req.query.agentId);
  if (req.query.type) items = items.filter(k => k.type === req.query.type);
  if (req.query.status) items = items.filter(k => k.status === req.query.status);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    items = items.filter(k => k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q));
  }
  // Sort
  const sort = req.query.sort || 'updatedAt';
  items.sort((a, b) => (b[sort] || '').localeCompare(a[sort] || ''));
  res.json({ total: items.length, items });
});

router.post('/knowledge', (req, res) => {
  const k = {
    id: 'kb-' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0
  };
  store.knowledge.push(k);
  store.saveJSON('knowledge.json', store.knowledge);
  store.logActivity('knowledge_added', `تمت إضافة معرفة: ${k.title}`, k.agentId);
  res.json(k);
});

router.put('/knowledge/:id', (req, res) => {
  const idx = store.knowledge.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  store.knowledge[idx] = { ...store.knowledge[idx], ...req.body, updatedAt: new Date().toISOString() };
  store.saveJSON('knowledge.json', store.knowledge);
  store.logActivity('knowledge_updated', `تم تحديث معرفة: ${store.knowledge[idx].title}`);
  res.json(store.knowledge[idx]);
});

router.delete('/knowledge/:id', (req, res) => {
  const k = store.knowledge.find(x => x.id === req.params.id);
  store.knowledge = store.knowledge.filter(x => x.id !== req.params.id);
  store.saveJSON('knowledge.json', store.knowledge);
  store.logActivity('knowledge_deleted', `تم حذف معرفة: ${k ? k.title : req.params.id}`);
  res.json({ ok: true });
});

router.post('/knowledge/:id/toggle', (req, res) => {
  const k = store.knowledge.find(x => x.id === req.params.id);
  if (!k) return res.status(404).json({ error: 'not found' });
  k.status = k.status === 'active' ? 'inactive' : 'active';
  k.updatedAt = new Date().toISOString();
  store.saveJSON('knowledge.json', store.knowledge);
  res.json(k);
});

/* ━━━ KNOWLEDGE SOURCES ━━━ */
router.get('/sources', (req, res) => res.json(store.sources));

router.post('/sources', (req, res) => {
  const s = {
    id: 'src-' + Date.now(),
    ...req.body,
    addedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    indexed: false,
    processed: false,
    chunks: 0
  };
  store.sources.push(s);
  store.saveJSON('sources.json', store.sources);
  store.logActivity('source_added', `تمت إضافة مصدر: ${s.name}`);
  res.json(s);
});

router.put('/sources/:id', (req, res) => {
  const idx = store.sources.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  store.sources[idx] = { ...store.sources[idx], ...req.body, lastUpdated: new Date().toISOString() };
  store.saveJSON('sources.json', store.sources);
  res.json(store.sources[idx]);
});

router.delete('/sources/:id', (req, res) => {
  store.sources = store.sources.filter(x => x.id !== req.params.id);
  store.saveJSON('sources.json', store.sources);
  res.json({ ok: true });
});

router.post('/sources/:id/reindex', (req, res) => {
  const s = store.sources.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.indexed = true;
  s.processed = true;
  s.lastUpdated = new Date().toISOString();
  store.saveJSON('sources.json', store.sources);
  store.logActivity('source_reindexed', `إعادة فهرسة: ${s.name}`);
  res.json(s);
});

/* ━━━ MEMORY ━━━ */
router.get('/memory', (req, res) => res.json(store.memory));

router.put('/memory', (req, res) => {
  store.memory = { ...store.memory, ...req.body };
  store.saveJSON('memory.json', store.memory);
  res.json(store.memory);
});

router.post('/memory/entry', (req, res) => {
  const { category, ...entry } = req.body;
  const cat = category || 'temporary';
  if (!store.memory[cat]) store.memory[cat] = [];
  const e = { id: 'mem-' + Date.now(), ...entry, createdAt: new Date().toISOString() };
  store.memory[cat].push(e);
  store.saveJSON('memory.json', store.memory);
  res.json(e);
});

router.delete('/memory/entry/:id', (req, res) => {
  for (const cat of ['conversations', 'temporary', 'longTerm']) {
    if (store.memory[cat]) {
      store.memory[cat] = store.memory[cat].filter(e => e.id !== req.params.id);
    }
  }
  store.saveJSON('memory.json', store.memory);
  res.json({ ok: true });
});

/* ━━━ ACTIVITY LOG ━━━ */
router.get('/activity', (req, res) => {
  let items = [...store.activityLog];
  if (req.query.agentId) items = items.filter(l => l.agentId === req.query.agentId);
  const limit = parseInt(req.query.limit) || 100;
  res.json(items.slice(0, limit));
});

/* ━━━ INSTRUCTION VERSIONS ━━━ */
router.get('/instructions/:agentId', (req, res) => {
  const versions = store.instructionVersions.filter(v => v.agentId === req.params.agentId);
  res.json(versions);
});

router.post('/instructions/:agentId', (req, res) => {
  const versions = store.instructionVersions.filter(v => v.agentId === req.params.agentId);
  const nextVer = versions.length + 1;
  // Deactivate current
  store.instructionVersions.forEach(v => { if (v.agentId === req.params.agentId) v.active = false; });
  const v = {
    id: 'v' + nextVer + '-' + Date.now(),
    agentId: req.params.agentId,
    instructions: req.body.instructions,
    version: nextVer,
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'admin',
    active: true
  };
  store.instructionVersions.push(v);
  store.saveJSON('instruction-versions.json', store.instructionVersions);
  // Update agent config
  const agent = store.agents.find(a => a.id === req.params.agentId);
  if (agent) {
    agent.config.systemInstructions = req.body.instructions;
    agent.updatedAt = new Date().toISOString();
    store.saveJSON('agents.json', store.agents);
  }
  store.logActivity('instructions_updated', `تحديث تعليمات الوكيل ${req.params.agentId} - إصدار ${nextVer}`, req.params.agentId);
  res.json(v);
});

router.post('/instructions/:agentId/rollback/:versionId', (req, res) => {
  const target = store.instructionVersions.find(v => v.id === req.params.versionId);
  if (!target) return res.status(404).json({ error: 'version not found' });
  store.instructionVersions.forEach(v => { if (v.agentId === req.params.agentId) v.active = false; });
  target.active = true;
  const agent = store.agents.find(a => a.id === req.params.agentId);
  if (agent) {
    agent.config.systemInstructions = target.instructions;
    agent.updatedAt = new Date().toISOString();
    store.saveJSON('agents.json', store.agents);
  }
  store.saveJSON('instruction-versions.json', store.instructionVersions);
  res.json(target);
});

/* ━━━ MODEL CONFIG ━━━ */
router.put('/agents/:id/config', (req, res) => {
  const agent = store.agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'not found' });
  agent.config = { ...agent.config, ...req.body };
  agent.updatedAt = new Date().toISOString();
  store.saveJSON('agents.json', store.agents);
  store.logActivity('config_updated', `تحديث إعدادات الوكيل: ${agent.name}`, agent.id);
  res.json(agent);
});

/* ━━━ PLAYGROUND TEST ━━━ */
router.post('/playground/test', (req, res) => {
  const { agentId, query, tools: toolIds } = req.body;
  const agent = store.agents.find(a => a.id === (agentId || 'lawyer-main'));
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  const start = Date.now();
  // Use the actual search engine
  const searchEngine = require('./server').search || (() => []);
  const results = searchEngine(query || 'test', { limit: agent.config.searchLimit || 5 });
  const elapsed = Date.now() - start;

  store.logActivity('playground_test', `اختبار: "${query}"`, agentId);
  agent.tasksExecuted = (agent.tasksExecuted || 0) + 1;
  store.saveJSON('agents.json', store.agents);

  res.json({
    agent: { id: agent.id, name: agent.name, model: agent.model },
    query,
    results: results.slice(0, 5),
    toolsUsed: (toolIds || agent.tools).filter(t => {
      const tool = store.tools.find(x => x.id === t);
      return tool && tool.status === 'enabled';
    }),
    executionTime: elapsed,
    timestamp: new Date().toISOString()
  });
});

/* ━━━ MONITORING ━━━ */
router.get('/monitoring', (req, res) => {
  const agentData = store.agents.map(a => ({
    ...a,
    recentActivity: store.activityLog.filter(l => l.agentId === a.id).slice(0, 10),
    toolUsage: store.tools.filter(t => t.agentId === a.id).map(t => ({ id: t.id, name: t.name, useCount: t.useCount, lastUsed: t.lastUsed }))
  }));
  res.json({
    agents: agentData,
    totalRequests: store.activityLog.length,
    recentErrors: store.activityLog.filter(l => l.action.includes('error')).slice(0, 20),
    systemStatus: 'operational'
  });
});

module.exports = router;
