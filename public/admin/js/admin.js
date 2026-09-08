/* ══════ ADMIN PANEL JS ══════ */
const API = '/admin/api';
const Admin = (() => {
  let data = { agents: [], tools: [], knowledge: [], sources: [], memory: {}, logs: [] };

  /* ── HELPERS ── */
  const $ = id => document.getElementById(id);
  const h = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const ago = ts => {
    if (!ts) return '—';
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'الآن';
    if (s < 3600) return Math.floor(s / 60) + ' د';
    if (s < 86400) return Math.floor(s / 3600) + ' س';
    return Math.floor(s / 86400) + ' ي';
  };
  const statusBadge = s => {
    const m = { active: 'active', idle: 'idle', disabled: 'disabled', error: 'error', running: 'running', enabled: 'enabled', pending: 'pending', approved: 'approved', review: 'review' };
    const labels = { active: 'فعال', idle: 'خامل', disabled: 'معطل', error: 'خطأ', running: 'قيد التشغيل', enabled: 'مفعل', pending: 'قيد المراجعة', approved: 'معتمد', review: 'مراجعة' };
    return `<span class="badge ${m[s] || 'disabled'}"><span class="dot"></span>${labels[s] || s}</span>`;
  };

  let toastTimer;
  function toast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2500);
  }

  /* ── API ── */
  async function api(path, opts = {}) {
    const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    return r.json();
  }

  async function loadAll() {
    const [agents, tools, knowledge, sources, memory, logs] = await Promise.all([
      api('/agents'), api('/tools'), api('/knowledge'), api('/sources'), api('/memory'), api('/activity?limit=200')
    ]);
    data = { agents, tools, knowledge: knowledge.items || knowledge, sources, memory, logs };
  }

  /* ── NAVIGATION ── */
  function nav(el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('on'));
    el.classList.add('on');
    const page = el.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    $('page-' + page).classList.add('on');
    $('pageTitle').textContent = el.textContent.trim();
    renderPage(page);
    document.getElementById('aside').classList.remove('open');
  }

  function renderPage(page) {
    const renderers = {
      overview: renderOverview, agents: renderAgents, tools: renderTools,
      knowledge: renderKnowledge, sources: renderSources, memory: () => renderMemoryTab('conversations'),
      models: renderModels, instructions: renderInstructions,
      monitoring: renderMonitoring, logs: renderLogs, playground: renderPlayground
    };
    if (renderers[page]) renderers[page]();
  }

  /* ── OVERVIEW ── */
  async function renderOverview() {
    await loadAll();
    const activeAgents = data.agents.filter(a => a.status === 'active').length;
    const enabledTools = data.tools.filter(t => t.status === 'enabled').length;
    const kbItems = Array.isArray(data.knowledge) ? data.knowledge.length : 0;

    $('overviewStats').innerHTML = `
      <div class="stat"><div class="stat-val">${data.agents.length}</div><div class="stat-label">الوكلاء</div></div>
      <div class="stat"><div class="stat-val">${activeAgents}</div><div class="stat-label">وكلاء فعالون</div></div>
      <div class="stat"><div class="stat-val">${enabledTools}</div><div class="stat-label">أدوات مفعلة</div></div>
      <div class="stat"><div class="stat-val">${kbItems}</div><div class="stat-label">عناصر معرفة</div></div>
      <div class="stat"><div class="stat-val">${data.sources.length}</div><div class="stat-label">مصادر معرفة</div></div>
      <div class="stat"><div class="stat-val">${data.logs.length}</div><div class="stat-label">عمليات مسجلة</div></div>
    `;

    $('overviewCards').innerHTML = data.agents.map(a => `
      <div class="card">
        <div class="card-head">
          <div class="card-icon gold"><i data-lucide="bot"></i></div>
          <div><div class="card-title">${h(a.name)}</div><div class="card-desc">${h(a.description || '').substring(0, 80)}</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          ${statusBadge(a.status)}
          <span style="font-size:.62rem;color:var(--t3)">${a.tasksExecuted || 0} مهمة · ${a.successRate || 0}% نجاح</span>
        </div>
      </div>
    `).join('');

    $('overviewLog').innerHTML = data.logs.slice(0, 15).map(l => `
      <tr><td>${h(l.action)}</td><td>${h(l.details || '')}</td><td style="font-size:.62rem;color:var(--t4)">${ago(l.timestamp)}</td></tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--t4)">لا توجد عمليات</td></tr>';
    lucide.createIcons();
  }

  /* ── AGENTS ── */
  function renderAgents() {
    const q = ($('agentSearch') || {}).value || '';
    let items = data.agents;
    if (q) items = items.filter(a => a.name.includes(q) || (a.description || '').includes(q));

    $('agentCards').innerHTML = items.map(a => {
      const tools = (a.tools || []).map(tid => {
        const t = data.tools.find(x => x.id === tid);
        return t ? t.name : tid;
      });
      return `
      <div class="card">
        <div class="card-head">
          <div class="card-icon gold"><i data-lucide="bot"></i></div>
          <div style="flex:1"><div class="card-title">${h(a.name)}</div><div class="card-desc">${h(a.description || '')}</div></div>
          ${statusBadge(a.status)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.68rem;margin:10px 0">
          <div><span style="color:var(--t4)">النموذج:</span> <span style="color:var(--t2)">${h(a.model || '—')}</span></div>
          <div><span style="color:var(--t4)">المهام:</span> <span style="color:var(--t2)">${a.tasksExecuted || 0}</span></div>
          <div><span style="color:var(--t4)">النوع:</span> <span style="color:var(--t2)">${h(a.type || '—')}</span></div>
          <div><span style="color:var(--t4)">آخر نشاط:</span> <span style="color:var(--t2)">${ago(a.lastActive)}</span></div>
        </div>
        <div style="font-size:.62rem;color:var(--t4);margin-bottom:8px">الأدوات: ${tools.length ? tools.map(t => `<span style="background:var(--bg3);padding:1px 6px;border-radius:4px;margin:2px;display:inline-block">${h(t)}</span>`).join('') : '—'}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="Admin.editAgent('${a.id}')"><i data-lucide="pencil"></i>تعديل</button>
          <button class="btn btn-ghost btn-sm" onclick="Admin.viewAgentKnowledge('${a.id}')"><i data-lucide="brain"></i>المعرفة</button>
          <button class="btn btn-ghost btn-sm" onclick="Admin.toggleAgent('${a.id}')">${a.status === 'active' ? '<i data-lucide="pause"></i>تعطيل' : '<i data-lucide="play"></i>تفعيل'}</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty"><i data-lucide="bot"></i><p>لا يوجد وكلاء</p></div>';
    lucide.createIcons();
  }

  async function toggleAgent(id) {
    const a = data.agents.find(x => x.id === id);
    if (!a) return;
    a.status = a.status === 'active' ? 'disabled' : 'active';
    await api('/agents/' + id, { method: 'PUT', body: JSON.stringify(a) });
    toast(a.status === 'active' ? 'تم تفعيل الوكيل' : 'تم تعطيل الوكيل');
    renderAgents();
  }

  function editAgent(id) {
    const a = data.agents.find(x => x.id === id);
    if (!a) return;
    $('modalTitle').textContent = 'تعديل الوكيل: ' + a.name;
    $('modalBody').innerHTML = `
      <div class="form-group"><label>الاسم</label><input class="form-input" id="edName" value="${h(a.name)}"></div>
      <div class="form-group"><label>الوصف</label><textarea class="form-input" id="edDesc">${h(a.description || '')}</textarea></div>
      <div class="form-group"><label>النوع</label><input class="form-input" id="edType" value="${h(a.type || '')}"></div>
      <div class="form-group"><label>الحالة</label><select class="form-input" id="edStatus">
        <option value="active" ${a.status === 'active' ? 'selected' : ''}>فعال</option>
        <option value="idle" ${a.status === 'idle' ? 'selected' : ''}>خامل</option>
        <option value="disabled" ${a.status === 'disabled' ? 'selected' : ''}>معطل</option>
      </select></div>
    `;
    $('modalFoot').innerHTML = `<button class="btn btn-ghost" onclick="Admin.closeModal()">إلغاء</button><button class="btn btn-gold" onclick="Admin.saveAgent('${id}')">حفظ</button>`;
    $('modal').classList.add('open');
  }

  async function saveAgent(id) {
    const updates = {
      name: $('edName').value, description: $('edDesc').value,
      type: $('edType').value, status: $('edStatus').value
    };
    await api('/agents/' + id, { method: 'PUT', body: JSON.stringify(updates) });
    closeModal(); toast('تم حفظ التغييرات'); await loadAll(); renderAgents();
  }

  function openAgentModal() {
    $('modalTitle').textContent = 'وكيل جديد';
    $('modalBody').innerHTML = `
      <div class="form-group"><label>الاسم</label><input class="form-input" id="edName" placeholder="اسم الوكيل"></div>
      <div class="form-group"><label>الوصف</label><textarea class="form-input" id="edDesc" placeholder="وصف الوكيل ووظيفته"></textarea></div>
      <div class="form-group"><label>النوع</label><select class="form-input" id="edType"><option value="legal-advisor">مستشار قانوني</option><option value="research">باحث</option><option value="analyst">محلل</option></select></div>
    `;
    $('modalFoot').innerHTML = `<button class="btn btn-ghost" onclick="Admin.closeModal()">إلغاء</button><button class="btn btn-gold" onclick="Admin.createAgent()">إنشاء</button>`;
    $('modal').classList.add('open');
  }

  async function createAgent() {
    const agent = {
      name: $('edName').value, description: $('edDesc').value,
      type: $('edType').value, model: 'local-search', status: 'active',
      tasksExecuted: 0, successRate: 0, tools: ['kb-search'],
      config: { temperature: 0.3, maxTokens: 4096, systemInstructions: '', language: 'ar', searchLimit: 5 }
    };
    await api('/agents', { method: 'POST', body: JSON.stringify(agent) });
    closeModal(); toast('تم إنشاء الوكيل'); await loadAll(); renderAgents();
  }

  async function viewAgentKnowledge(agentId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('on'));
    document.querySelector('[data-page="knowledge"]').classList.add('on');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    $('page-knowledge').classList.add('on');
    $('pageTitle').textContent = 'المعرفة';
    await loadAll();
    renderKnowledge(agentId);
  }

  /* ── TOOLS ── */
  function renderTools() {
    const statusF = ($('toolFilter') || {}).value;
    const typeF = ($('toolTypeFilter') || {}).value;
    let items = data.tools;
    if (statusF) items = items.filter(t => t.status === statusF);
    if (typeF) items = items.filter(t => t.type === typeF);

    const typeLabels = { search: 'بحث', analysis: 'تحليل', extraction: 'استخراج', generation: 'توليد', verification: 'تحقق', evaluation: 'تقييم', calculation: 'حساب', utility: 'مساعد' };
    $('toolTable').innerHTML = items.map(t => `
      <tr>
        <td><strong>${h(t.name)}</strong><br><span style="font-size:.62rem;color:var(--t4)">${h(t.description || '')}</span></td>
        <td>${typeLabels[t.type] || t.type}</td>
        <td>${statusBadge(t.status)}</td>
        <td style="font-size:.68rem">${h(t.agentId || '—')}</td>
        <td>${t.useCount || 0}</td>
        <td style="font-size:.62rem;color:var(--t4)">${ago(t.lastUsed)}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" title="${t.status === 'enabled' ? 'تعطيل' : 'تفعيل'}" onclick="Admin.toggleTool('${t.id}')"><i data-lucide="${t.status === 'enabled' ? 'pause' : 'play'}"></i></button>
            <button class="btn-icon" title="اختبار" onclick="Admin.testTool('${t.id}')"><i data-lucide="flask-conical"></i></button>
            <button class="btn-icon" title="تعديل" onclick="Admin.editTool('${t.id}')"><i data-lucide="pencil"></i></button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--t4)">لا توجد أدوات</td></tr>';
    lucide.createIcons();
  }

  async function toggleTool(id) {
    await api('/tools/' + id + '/toggle', { method: 'POST' });
    toast('تم تغيير حالة الأداة'); await loadAll(); renderTools();
  }

  async function testTool(id) {
    const r = await api('/tools/' + id + '/test', { method: 'POST' });
    toast('اختبار: ' + r.testResult);
  }

  function editTool(id) {
    const t = data.tools.find(x => x.id === id);
    if (!t) return;
    $('modalTitle').textContent = 'تعديل الأداة: ' + t.name;
    $('modalBody').innerHTML = `
      <div class="form-group"><label>الاسم</label><input class="form-input" id="edToolName" value="${h(t.name)}"></div>
      <div class="form-group"><label>الوصف</label><textarea class="form-input" id="edToolDesc">${h(t.description || '')}</textarea></div>
      <div class="form-group"><label>الحالة</label><select class="form-input" id="edToolStatus"><option value="enabled" ${t.status === 'enabled' ? 'selected' : ''}>مفعلة</option><option value="disabled" ${t.status === 'disabled' ? 'selected' : ''}>معطلة</option></select></div>
      <div class="form-group"><label>الوكيل المرتبط</label><select class="form-input" id="edToolAgent"><option value="">بدون</option>${data.agents.map(a => `<option value="${a.id}" ${t.agentId === a.id ? 'selected' : ''}>${h(a.name)}</option>`).join('')}</select></div>
    `;
    $('modalFoot').innerHTML = `<button class="btn btn-ghost" onclick="Admin.closeModal()">إلغاء</button><button class="btn btn-gold" onclick="Admin.saveTool('${id}')">حفظ</button>`;
    $('modal').classList.add('open');
  }

  async function saveTool(id) {
    await api('/tools/' + id, { method: 'PUT', body: JSON.stringify({ name: $('edToolName').value, description: $('edToolDesc').value, status: $('edToolStatus').value, agentId: $('edToolAgent').value || null }) });
    closeModal(); toast('تم حفظ الأداة'); await loadAll(); renderTools();
  }

  /* ── KNOWLEDGE ── */
  function renderKnowledge(agentFilter) {
    const q = ($('kbSearch') || {}).value || '';
    const typeF = ($('kbTypeFilter') || {}).value;
    let items = Array.isArray(data.knowledge) ? data.knowledge : [];
    if (agentFilter) items = items.filter(k => k.agentId === agentFilter);
    if (q) items = items.filter(k => k.title.includes(q) || k.content.includes(q));
    if (typeF) items = items.filter(k => k.type === typeF);

    const typeLabels = { instructions: 'تعليمات', law: 'قانون', regulation: 'لائحة', 'case-law': 'حكم قضائي', reference: 'مرجع', document: 'مستند', qa: 'سؤال وجواب', guideline: 'إرشاد' };

    if (!items.length) {
      $('knowledgeList').innerHTML = '<div class="empty"><i data-lucide="brain"></i><p>لا توجد عناصر معرفة. أضف معرفة جديدة.</p></div>';
      lucide.createIcons(); return;
    }

    $('knowledgeList').innerHTML = items.map(k => `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <strong style="font-size:.8rem">${h(k.title)}</strong>
              ${statusBadge(k.status || 'active')}
              <span style="font-size:.6rem;background:var(--bg3);padding:1px 6px;border-radius:4px">${typeLabels[k.type] || k.type || '—'}</span>
            </div>
            <div style="font-size:.7rem;color:var(--t3);line-height:1.5;max-height:60px;overflow:hidden">${h((k.content || '').substring(0, 200))}</div>
            <div style="display:flex;gap:12px;margin-top:6px;font-size:.6rem;color:var(--t4)">
              ${k.source ? `<span>المصدر: ${h(k.source)}</span>` : ''}
              ${k.priority ? `<span>الأولوية: ${k.priority}</span>` : ''}
              ${k.confidence ? `<span>الثقة: ${k.confidence}%</span>` : ''}
              <span>تحديث: ${ago(k.updatedAt)}</span>
            </div>
            ${k.tags && k.tags.length ? `<div style="margin-top:4px">${k.tags.map(t => `<span style="background:var(--goldm);color:var(--gold);padding:1px 6px;border-radius:4px;font-size:.58rem;margin:2px;display:inline-block">${h(t)}</span>`).join('')}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn-icon" title="تعديل" onclick="Admin.editKnowledge('${k.id}')"><i data-lucide="pencil"></i></button>
            <button class="btn-icon" title="${k.status === 'active' ? 'تعطيل' : 'تفعيل'}" onclick="Admin.toggleKnowledge('${k.id}')"><i data-lucide="${k.status === 'active' ? 'pause' : 'play'}"></i></button>
            <button class="btn-icon" title="حذف" onclick="Admin.deleteKnowledge('${k.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  function openKnowledgeModal(existing) {
    const k = existing || {};
    $('modalTitle').textContent = existing ? 'تعديل المعرفة' : 'إضافة معرفة جديدة';
    $('modalBody').innerHTML = `
      <div class="form-group"><label>العنوان</label><input class="form-input" id="kbTitle" value="${h(k.title || '')}"></div>
      <div class="form-group"><label>نوع المعرفة</label><select class="form-input" id="kbType">
        <option value="law" ${k.type === 'law' ? 'selected' : ''}>قانون</option>
        <option value="regulation" ${k.type === 'regulation' ? 'selected' : ''}>لائحة</option>
        <option value="case-law" ${k.type === 'case-law' ? 'selected' : ''}>حكم قضائي</option>
        <option value="reference" ${k.type === 'reference' ? 'selected' : ''}>مرجع</option>
        <option value="document" ${k.type === 'document' ? 'selected' : ''}>مستند</option>
        <option value="qa" ${k.type === 'qa' ? 'selected' : ''}>سؤال وجواب</option>
        <option value="guideline" ${k.type === 'guideline' ? 'selected' : ''}>إرشاد</option>
        <option value="instructions" ${k.type === 'instructions' ? 'selected' : ''}>تعليمات</option>
      </select></div>
      <div class="form-group"><label>المحتوى</label><textarea class="form-input" id="kbContent" style="min-height:200px">${h(k.content || '')}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label>المصدر</label><input class="form-input" id="kbSource" value="${h(k.source || '')}"></div>
        <div class="form-group"><label>تاريخ المصدر</label><input class="form-input" id="kbSourceDate" type="date" value="${k.sourceDate || ''}"></div>
        <div class="form-group"><label>التصنيف</label><input class="form-input" id="kbCategory" value="${h(k.category || '')}"></div>
        <div class="form-group"><label>Tags (مفصولة بفاصلة)</label><input class="form-input" id="kbTags" value="${(k.tags || []).join(', ')}"></div>
        <div class="form-group"><label>الأولوية</label><select class="form-input" id="kbPriority"><option value="low" ${k.priority === 'low' ? 'selected' : ''}>منخفضة</option><option value="medium" ${k.priority === 'medium' || !k.priority ? 'selected' : ''}>متوسطة</option><option value="high" ${k.priority === 'high' ? 'selected' : ''}>عالية</option><option value="critical" ${k.priority === 'critical' ? 'selected' : ''}>حرجة</option></select></div>
        <div class="form-group"><label>درجة الثقة (%)</label><input class="form-input" id="kbConfidence" type="number" min="0" max="100" value="${k.confidence || 80}"></div>
      </div>
      <div class="form-group"><label>الوكيل المرتبط</label><select class="form-input" id="kbAgent"><option value="">عام (لجميع الوكلاء)</option>${data.agents.map(a => `<option value="${a.id}" ${k.agentId === a.id ? 'selected' : ''}>${h(a.name)}</option>`).join('')}</select></div>
    `;
    $('modalFoot').innerHTML = `<button class="btn btn-ghost" onclick="Admin.closeModal()">إلغاء</button><button class="btn btn-gold" onclick="Admin.saveKnowledge('${k.id || ''}')">حفظ المعرفة</button>`;
    $('modal').classList.add('open');
  }

  async function saveKnowledge(id) {
    const payload = {
      title: $('kbTitle').value, type: $('kbType').value, content: $('kbContent').value,
      source: $('kbSource').value, sourceDate: $('kbSourceDate').value,
      category: $('kbCategory').value, tags: $('kbTags').value.split(',').map(t => t.trim()).filter(Boolean),
      priority: $('kbPriority').value, confidence: parseInt($('kbConfidence').value) || 80,
      agentId: $('kbAgent').value || null, status: 'active'
    };
    if (!payload.title || !payload.content) { toast('العنوان والمحتوى مطلوبان'); return; }
    if (id) {
      await api('/knowledge/' + id, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/knowledge', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal(); toast('تم حفظ المعرفة'); await loadAll(); renderKnowledge();
  }

  function editKnowledge(id) {
    const k = (Array.isArray(data.knowledge) ? data.knowledge : []).find(x => x.id === id);
    if (k) openKnowledgeModal(k);
  }

  async function toggleKnowledge(id) {
    await api('/knowledge/' + id + '/toggle', { method: 'POST' });
    toast('تم تغيير الحالة'); await loadAll(); renderKnowledge();
  }

  async function deleteKnowledge(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المعرفة؟')) return;
    await api('/knowledge/' + id, { method: 'DELETE' });
    toast('تم الحذف'); await loadAll(); renderKnowledge();
  }

  /* ── SOURCES ── */
  async function renderSources() {
    await loadAll();
    $('sourceStats').innerHTML = `
      <div class="stat"><div class="stat-val">${data.sources.length}</div><div class="stat-label">إجمالي المصادر</div></div>
      <div class="stat"><div class="stat-val">${data.sources.filter(s => s.indexed).length}</div><div class="stat-label">مفهرسة</div></div>
      <div class="stat"><div class="stat-val">${data.sources.filter(s => s.processed).length}</div><div class="stat-label">معالجة</div></div>
    `;
    $('sourceTable').innerHTML = data.sources.length ? data.sources.map(s => `
      <tr>
        <td><strong>${h(s.name || s.title || '—')}</strong></td>
        <td style="font-size:.68rem">${h(s.type || '—')}</td>
        <td>${statusBadge(s.status || 'active')}</td>
        <td>${s.indexed ? '<span style="color:var(--grn)">نعم</span>' : '<span style="color:var(--red)">لا</span>'}</td>
        <td>${s.chunks || 0}</td>
        <td style="font-size:.68rem">${h(s.agentId || '—')}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="Admin.reindexSource('${s.id}')"><i data-lucide="refresh-cw"></i>إعادة فهرسة</button></td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--t4)">لا توجد مصادر</td></tr>';
    lucide.createIcons();
  }

  async function reindexSource(id) {
    await api('/sources/' + id + '/reindex', { method: 'POST' });
    toast('تمت إعادة الفهرسة'); renderSources();
  }

  /* ── MEMORY ── */
  function memoryTab(el) {
    document.querySelectorAll('#memoryTabs .tab').forEach(t => t.classList.remove('on'));
    el.classList.add('on');
    renderMemoryTab(el.dataset.tab);
  }

  function renderMemoryTab(cat) {
    const items = data.memory[cat] || [];
    if (typeof data.memory[cat] === 'object' && !Array.isArray(data.memory[cat]) && cat !== 'conversations') {
      $('memoryContent').innerHTML = `<div class="card"><pre style="font-size:.72rem;color:var(--t2);white-space:pre-wrap">${h(JSON.stringify(data.memory[cat], null, 2))}</pre></div>`;
      return;
    }
    if (!items.length) {
      $('memoryContent').innerHTML = '<div class="empty"><i data-lucide="hard-drive"></i><p>لا توجد بيانات في هذا القسم</p></div>';
      lucide.createIcons(); return;
    }
    $('memoryContent').innerHTML = items.map(m => `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-size:.75rem;color:var(--t2);line-height:1.6">${h(typeof m === 'string' ? m : m.content || m.text || JSON.stringify(m)).substring(0, 300)}</div>
          <button class="btn-icon" onclick="Admin.deleteMemory('${m.id}')"><i data-lucide="trash-2"></i></button>
        </div>
        <div style="font-size:.6rem;color:var(--t4);margin-top:4px">${ago(m.createdAt)}</div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  async function deleteMemory(id) {
    await api('/memory/entry/' + id, { method: 'DELETE' });
    toast('تم الحذف'); await loadAll(); renderMemoryTab('conversations');
  }

  /* ── MODELS ── */
  function renderModels() {
    $('modelConfig').innerHTML = data.agents.map(a => {
      const c = a.config || {};
      return `
      <div class="card" style="margin-bottom:12px;max-width:700px">
        <h3 style="font-size:.85rem;margin-bottom:14px">${h(a.name)} — إعدادات النموذج</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label>النموذج</label><input class="form-input" id="mdl_${a.id}_model" value="${h(c.model || a.model || '')}"></div>
          <div class="form-group"><label>Temperature</label><input class="form-input" id="mdl_${a.id}_temp" type="number" step="0.1" min="0" max="2" value="${c.temperature || 0.3}"></div>
          <div class="form-group"><label>Max Tokens</label><input class="form-input" id="mdl_${a.id}_tokens" type="number" value="${c.maxTokens || 4096}"></div>
          <div class="form-group"><label>Context Window</label><input class="form-input" id="mdl_${a.id}_ctx" type="number" value="${c.contextWindow || 8192}"></div>
          <div class="form-group"><label>عدد نتائج البحث</label><input class="form-input" id="mdl_${a.id}_search" type="number" value="${c.searchLimit || 5}"></div>
          <div class="form-group"><label>الحد الأدنى للثقة</label><input class="form-input" id="mdl_${a.id}_conf" type="number" min="0" max="1" step="0.1" value="${c.minConfidence || 0.3}"></div>
          <div class="form-group"><label>أسلوب الرد</label><select class="form-input" id="mdl_${a.id}_style"><option value="professional" ${c.responseStyle === 'professional' ? 'selected' : ''}>احترافي</option><option value="simple" ${c.responseStyle === 'simple' ? 'selected' : ''}>بسيط</option><option value="detailed" ${c.responseStyle === 'detailed' ? 'selected' : ''}>مفصل</option></select></div>
          <div class="form-group"><label>اللغة</label><select class="form-input" id="mdl_${a.id}_lang"><option value="ar" ${c.language === 'ar' ? 'selected' : ''}>العربية</option><option value="en" ${c.language === 'en' ? 'selected' : ''}>English</option></select></div>
        </div>
        <div class="form-group"><label>عند عدم وجود مصدر</label><select class="form-input" id="mdl_${a.id}_nosrc"><option value="warn" ${c.noSourceBehavior === 'warn' ? 'selected' : ''}>تحذير</option><option value="refuse" ${c.noSourceBehavior === 'refuse' ? 'selected' : ''}>رفض الإجابة</option><option value="guess" ${c.noSourceBehavior === 'guess' ? 'selected' : ''}>محاولة تخمين</option></select></div>
        <button class="btn btn-gold" onclick="Admin.saveModelConfig('${a.id}')">حفظ الإعدادات</button>
      </div>`;
    }).join('');
  }

  async function saveModelConfig(agentId) {
    const g = id => ($(id) || {}).value;
    const config = {
      model: g(`mdl_${agentId}_model`), temperature: parseFloat(g(`mdl_${agentId}_temp`)),
      maxTokens: parseInt(g(`mdl_${agentId}_tokens`)), contextWindow: parseInt(g(`mdl_${agentId}_ctx`)),
      searchLimit: parseInt(g(`mdl_${agentId}_search`)), minConfidence: parseFloat(g(`mdl_${agentId}_conf`)),
      responseStyle: g(`mdl_${agentId}_style`), language: g(`mdl_${agentId}_lang`),
      noSourceBehavior: g(`mdl_${agentId}_nosrc`)
    };
    await api('/agents/' + agentId + '/config', { method: 'PUT', body: JSON.stringify(config) });
    toast('تم حفظ إعدادات النموذج');
  }

  /* ── INSTRUCTIONS ── */
  async function renderInstructions() {
    const agent = data.agents[0];
    if (!agent) { $('instructionsEditor').innerHTML = '<div class="empty"><p>لا يوجد وكلاء</p></div>'; return; }
    const versions = await api('/instructions/' + agent.id);
    const active = versions.find(v => v.active) || versions[versions.length - 1];

    $('instructionsEditor').innerHTML = `
      <div class="card" style="max-width:800px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 style="font-size:.85rem">تعليمات: ${h(agent.name)}</h3>
          <span style="font-size:.65rem;color:var(--t4)">الإصدار ${active ? active.version : '—'}</span>
        </div>
        <div class="form-group"><textarea class="form-input" id="instrText" style="min-height:250px">${h(active ? active.instructions : '')}</textarea></div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-gold" onclick="Admin.saveInstructions('${agent.id}')">حفظ كإصدار جديد</button>
          <span style="font-size:.65rem;color:var(--t4)">${versions.length} إصدار محفوظ</span>
        </div>
      </div>
      ${versions.length > 1 ? `
      <h3 style="font-size:.82rem;margin:20px 0 10px">الإصدارات السابقة</h3>
      ${versions.reverse().map(v => `
        <div class="card" style="margin-bottom:6px;max-width:800px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-size:.75rem;font-weight:600">إصدار ${v.version}</span>
              ${v.active ? '<span class="badge active" style="margin-right:6px">نشط</span>' : ''}
              <span style="font-size:.62rem;color:var(--t4);margin-right:8px">${ago(v.createdAt)} · ${h(v.createdBy || 'admin')}</span>
            </div>
            ${!v.active ? `<button class="btn btn-ghost btn-sm" onclick="Admin.rollbackInstructions('${agent.id}','${v.id}')"><i data-lucide="rotate-ccw"></i>استعادة</button>` : ''}
          </div>
          <div style="font-size:.68rem;color:var(--t3);margin-top:6px;max-height:60px;overflow:hidden">${h((v.instructions || '').substring(0, 200))}...</div>
        </div>
      `).join('')}` : ''}
    `;
    lucide.createIcons();
  }

  async function saveInstructions(agentId) {
    const instructions = $('instrText').value;
    await api('/instructions/' + agentId, { method: 'POST', body: JSON.stringify({ instructions, createdBy: 'admin' }) });
    toast('تم حفظ الإصدار الجديد'); renderInstructions();
  }

  async function rollbackInstructions(agentId, versionId) {
    await api('/instructions/' + agentId + '/rollback/' + versionId, { method: 'POST' });
    toast('تمت الاستعادة'); renderInstructions();
  }

  /* ── MONITORING ── */
  async function renderMonitoring() {
    const mon = await api('/monitoring');
    $('monitorStats').innerHTML = `
      <div class="stat"><div class="stat-val" style="color:var(--grn)">${mon.systemStatus === 'operational' ? 'يعمل' : 'متوقف'}</div><div class="stat-label">حالة النظام</div></div>
      <div class="stat"><div class="stat-val">${mon.totalRequests}</div><div class="stat-label">إجمالي الطلبات</div></div>
      <div class="stat"><div class="stat-val">${mon.agents.filter(a => a.status === 'active').length}</div><div class="stat-label">وكلاء فعالون</div></div>
      <div class="stat"><div class="stat-val">${mon.recentErrors.length}</div><div class="stat-label">آخر الأخطاء</div></div>
    `;
    $('monitorCards').innerHTML = mon.agents.map(a => `
      <div class="card">
        <div class="card-head">
          <div class="card-icon ${a.status === 'active' ? 'grn' : 'red'}"><i data-lucide="bot"></i></div>
          <div style="flex:1"><div class="card-title">${h(a.name)}</div>${statusBadge(a.status)}</div>
        </div>
        <div style="font-size:.68rem;color:var(--t3);margin:8px 0">
          <div>المهام: ${a.tasksExecuted || 0} · النجاح: ${a.successRate || 0}%</div>
          <div>آخر نشاط: ${ago(a.lastActive)}</div>
        </div>
        ${a.recentActivity.length ? `<div style="font-size:.62rem;color:var(--t4);max-height:80px;overflow-y:auto">${a.recentActivity.slice(0, 5).map(l => `<div style="padding:2px 0;border-bottom:1px solid var(--b1)">${h(l.action)} · ${ago(l.timestamp)}</div>`).join('')}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px">
          ${a.toolUsage.map(t => `<span style="font-size:.58rem;background:var(--bg3);padding:2px 6px;border-radius:4px;color:${t.useCount > 0 ? 'var(--grn)' : 'var(--t4)'}">${h(t.name)} (${t.useCount})</span>`).join('')}
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  /* ── LOGS ── */
  async function renderLogs() {
    const q = ($('logSearch') || {}).value || '';
    let items = data.logs;
    if (q) items = items.filter(l => (l.action || '').includes(q) || (l.details || '').includes(q));
    $('logTable').innerHTML = items.slice(0, 100).map(l => `
      <tr><td>${h(l.action)}</td><td style="font-size:.68rem">${h(l.details || '')}</td><td style="font-size:.68rem">${h(l.agentId || '—')}</td><td style="font-size:.62rem;color:var(--t4)">${ago(l.timestamp)}</td></tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--t4)">لا توجد سجلات</td></tr>';
  }

  /* ── PLAYGROUND ── */
  function renderPlayground() {
    $('pgAgent').innerHTML = data.agents.map(a => `<option value="${a.id}">${h(a.name)}</option>`).join('');
  }

  async function runPlayground() {
    const query = $('pgQuery').value.trim();
    if (!query) { toast('اكتب سؤالاً'); return; }
    const agentId = $('pgAgent').value;
    $('pgResults').innerHTML = '<div style="text-align:center;padding:20px;color:var(--t4)">جاري التنفيذ...</div>';
    try {
      const r = await api('/playground/test', { method: 'POST', body: JSON.stringify({ agentId, query }) });
      $('pgResults').innerHTML = `
        <div class="card" style="max-width:700px">
          <h4 style="font-size:.8rem;margin-bottom:10px">النتيجة</h4>
          <div style="font-size:.72rem;color:var(--t3);margin-bottom:8px">الوكيل: ${h(r.agent.name)} · الوقت: ${r.executionTime}ms</div>
          <div style="font-size:.72rem;color:var(--t3);margin-bottom:8px">الأدوات المستخدمة: ${(r.toolsUsed || []).join(', ') || '—'}</div>
          <div style="font-size:.72rem;color:var(--t3);margin-bottom:8px">نتائج البحث: ${r.results.length}</div>
          ${r.results.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوثيقة</th><th>القسم</th><th>الدرجة</th></tr></thead><tbody>${r.results.map(s => `<tr><td>${h(s.title)}</td><td>${h(s.category)}</td><td>${s.score}</td></tr>`).join('')}</tbody></table></div>` : '<div style="color:var(--red);font-size:.72rem">لم يتم العثور على نتائج</div>'}
        </div>
      `;
    } catch (e) {
      $('pgResults').innerHTML = `<div class="card" style="border-color:var(--red)"><div style="color:var(--red)">خطأ: ${h(e.message)}</div></div>`;
    }
  }

  /* ── MODAL ── */
  function closeModal() { $('modal').classList.remove('open'); }

  /* ── INIT ── */
  async function init() {
    await loadAll();
    renderOverview();
    lucide.createIcons();
  }

  return {
    init, nav, toast, closeModal,
    renderAgents, editAgent, saveAgent, openAgentModal, createAgent, toggleAgent, viewAgentKnowledge,
    renderTools, toggleTool, testTool, editTool, saveTool,
    renderKnowledge, openKnowledgeModal, saveKnowledge, editKnowledge, toggleKnowledge, deleteKnowledge,
    renderSources, reindexSource,
    memoryTab, renderMemoryTab, deleteMemory,
    renderModels, saveModelConfig,
    renderInstructions, saveInstructions, rollbackInstructions,
    renderMonitoring, renderLogs,
    renderPlayground, runPlayground
  };
})();

document.addEventListener('DOMContentLoaded', Admin.init);
