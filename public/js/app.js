/* ══════ MAIN APP ══════ */
const App = (() => {
  const welcome = document.getElementById('welcome');
  const inp = document.getElementById('inp');
  const sendBtn = document.getElementById('sendBtn');

  /* ── Panels ── */
  let currentView = 'welcome'; // welcome | chat | browse | doc

  function showView(name) {
    currentView = name;
    document.getElementById('welcome').style.display = name === 'welcome' ? 'flex' : 'none';
    document.getElementById('chat').classList.toggle('on', name === 'chat');
    document.getElementById('browsePanel').classList.toggle('on', name === 'browse');
    document.getElementById('docPanel').classList.toggle('on', name === 'doc');
  }

  /* ── Toast ── */
  let tt;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.querySelector('#toastMsg').textContent = msg;
    el.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => el.classList.remove('show'), 2500);
  }

  /* ── Navigation ── */
  function navTo(el) {
    document.querySelectorAll('#mainNav li').forEach(l => l.classList.remove('on'));
    el.classList.add('on');
    Sidebar.hide();
  }

  /* ── Send Message ── */
  async function doSend() {
    const text = inp.value.trim();
    if (!text) return;
    showView('chat');
    Chat.addMsg('u', text, true);
    inp.value = '';
    inp.style.height = 'auto';
    sendBtn.disabled = true;
    document.querySelectorAll('.hist').forEach(h => h.classList.remove('on'));

    const thinkEl = Chat.addThinking();
    try {
      await delay(500);
      Chat.showSteps(thinkEl);
      const data = await LawyerAPI.chat(text);
      await delay(600);
      Chat.finish(thinkEl, data);
    } catch (err) {
      Chat.finish(thinkEl, { answer: 'حدث خطأ: ' + err.message, sources: [] });
    }
  }

  function quickSend(text) {
    inp.value = text;
    sendBtn.disabled = false;
    doSend();
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── New Chat ── */
  function newChat() {
    showView('welcome');
    Chat.clear();
    inp.value = '';
    sendBtn.disabled = true;
    document.querySelectorAll('.hist').forEach(h => h.classList.remove('on'));
    document.querySelectorAll('#mainNav li').forEach((l, i) => l.classList.toggle('on', i === 0));
    inp.focus();
    Sidebar.hide();
  }

  /* ── Browse Panel ── */
  async function browseLaws() {
    showView('browse');
    navTo(document.querySelector('[data-nav="laws"]'));
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = 'القوانين اليمنية';
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const laws = await LawyerAPI.laws();
    body.innerHTML = '<div class="doc-list"></div>';
    const list = body.querySelector('.doc-list');
    laws.forEach(l => {
      const d = document.createElement('div');
      d.className = 'doc-item';
      d.innerHTML = `<i data-lucide="book-open"></i><span class="doc-item-title">${l.title}</span><span class="doc-item-meta">${(l.length / 1000).toFixed(0)} ك</span>`;
      d.onclick = () => viewDoc(l.id);
      list.appendChild(d);
    });
    lucide.createIcons();
  }

  async function browseLibrary() {
    showView('browse');
    navTo(document.querySelector('[data-nav="library"]'));
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = 'الدعاوى والإجراءات';
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const subs = await LawyerAPI.librarySubcategories();
    body.innerHTML = '<div class="cat-grid"></div>';
    const grid = body.querySelector('.cat-grid');
    for (const [name, data] of Object.entries(subs)) {
      const d = document.createElement('div');
      d.className = 'cat-card';
      d.innerHTML = `<h3>${name}</h3><div class="cat-count">${data.count} وثيقة</div>`;
      d.onclick = () => browseSubcat(name);
      grid.appendChild(d);
    }
    lucide.createIcons();
  }

  async function browseSubcat(subcat) {
    showView('browse');
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = subcat;
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const data = await LawyerAPI.libraryBySubcat(subcat);
    body.innerHTML = '<div class="doc-list"></div>';
    const list = body.querySelector('.doc-list');
    data.items.forEach(item => {
      const d = document.createElement('div');
      d.className = 'doc-item';
      d.innerHTML = `<i data-lucide="file-text"></i><span class="doc-item-title">${item.title}</span><span class="doc-item-meta">${(item.length / 1000).toFixed(0)} ك</span>`;
      d.onclick = () => viewDoc(item.id);
      list.appendChild(d);
    });
    lucide.createIcons();
  }

  async function browseContracts() {
    showView('browse');
    navTo(document.querySelector('[data-nav="contracts"]'));
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = 'صيغ العقود';
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const types = await LawyerAPI.contractTypes();
    body.innerHTML = '<div class="cat-grid"></div>';
    const grid = body.querySelector('.cat-grid');
    for (const [name, data] of Object.entries(types)) {
      const d = document.createElement('div');
      d.className = 'cat-card';
      d.innerHTML = `<h3>${name}</h3><div class="cat-count">${data.count} عقد</div>`;
      d.onclick = () => browseContractType(name);
      grid.appendChild(d);
    }
    lucide.createIcons();
  }

  async function browseContractType(type) {
    showView('browse');
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = type;
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const data = await LawyerAPI.contractsByType(type);
    body.innerHTML = '<div class="doc-list"></div>';
    const list = body.querySelector('.doc-list');
    data.items.forEach(item => {
      const d = document.createElement('div');
      d.className = 'doc-item';
      d.innerHTML = `<i data-lucide="file-signature"></i><span class="doc-item-title">${item.title}</span><span class="doc-item-meta">${(item.length / 1000).toFixed(0)} ك</span>`;
      d.onclick = () => viewDoc(item.id);
      list.appendChild(d);
    });
    lucide.createIcons();
  }

  async function browseArticles() {
    showView('browse');
    navTo(document.querySelector('[data-nav="articles"]'));
    const panel = document.getElementById('browsePanel');
    panel.querySelector('.panel-head h2').textContent = 'المقالات القانونية';
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري التحميل...</div>';

    const arts = await LawyerAPI.articles();
    body.innerHTML = '<div class="doc-list"></div>';
    const list = body.querySelector('.doc-list');
    arts.forEach(a => {
      const d = document.createElement('div');
      d.className = 'doc-item';
      d.innerHTML = `<i data-lucide="newspaper"></i><span class="doc-item-title">${a.title}</span><span class="doc-item-meta">${(a.length / 1000).toFixed(0)} ك</span>`;
      d.onclick = () => viewDoc(a.id);
      list.appendChild(d);
    });
    lucide.createIcons();
  }

  /* ── Document Viewer ── */
  async function viewDoc(id) {
    showView('doc');
    const panel = document.getElementById('docPanel');
    const body = panel.querySelector('.panel-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t4)">جاري تحميل الوثيقة...</div>';

    try {
      const doc = await LawyerAPI.getDoc(id);
      panel.querySelector('.panel-head h2').textContent = doc.title;
      // Truncate very long docs for display
      const content = doc.content.length > 8000 ? doc.content.substring(0, 8000) + '\n\n... [الوثيقة أطول من المعروض]' : doc.content;
      body.innerHTML = `<div class="doc-viewer"><h1>${doc.title}</h1><div class="doc-content">${content.replace(/\n/g, '<br>')}</div></div>`;
    } catch (err) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red)">خطأ في تحميل الوثيقة</div>';
    }
  }

  /* ── Load History Chat ── */
  function loadHist(el) {
    document.querySelectorAll('.hist').forEach(h => h.classList.remove('on'));
    el.classList.add('on');
    const id = el.dataset.id;
    showView('chat');
    Chat.clear();
    Chat.addMsg('a', 'مرحباً بك! كيف يمكنني مساعدتك في هذا الموضوع؟', false);
    Sidebar.hide();
  }

  /* ── Settings ── */
  function openSettings() {
    document.getElementById('setModal').classList.add('open');
    Sidebar.hide();
  }

  function closeSettings() {
    document.getElementById('setModal').classList.remove('open');
  }

  /* ── Init ── */
  function init() {
    // Input handlers
    inp.addEventListener('input', () => {
      sendBtn.disabled = inp.value.trim() === '';
    });

    sendBtn.addEventListener('click', doSend);

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        setTimeout(() => {
          sendBtn.disabled = inp.value.trim() === '';
          inp.style.height = 'auto';
          inp.style.height = Math.min(inp.scrollHeight, 160) + 'px';
        }, 0);
      }
    });

    // New chat button
    document.getElementById('newBtn').addEventListener('click', newChat);

    // Toolbar buttons
    document.getElementById('attachBtn').addEventListener('click', () => {
      const f = document.createElement('input');
      f.type = 'file';
      f.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
      f.onchange = () => { if (f.files[0]) toast('تم إرفاق: ' + f.files[0].name); };
      f.click();
    });

    document.getElementById('voiceBtn').addEventListener('click', () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast('المتصفح لا يدعم التسجيل الصوتي'); return; }
      const rec = new SR();
      rec.lang = 'ar-SA';
      rec.onresult = e => { inp.value = e.results[0][0].transcript; sendBtn.disabled = false; toast('تم تحويل الصوت إلى نص'); };
      rec.onerror = () => toast('حدث خطأ في التعرف على الصوت');
      rec.start();
      toast('جاري الاستماع...');
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      const q = inp.value.trim();
      if (q) quickSend('ابحث قانونياً عن: ' + q);
      else toast('اكتب أولاً ما تريد البحث عنه');
    });

    // Settings modal
    document.querySelector('.fbtn').addEventListener('click', openSettings);
    document.getElementById('closeSet').addEventListener('click', closeSettings);
    document.getElementById('cancelSet').addEventListener('click', closeSettings);
    document.getElementById('saveSet').addEventListener('click', () => { closeSettings(); toast('تم حفظ الإعدادات'); });
    document.getElementById('setModal').addEventListener('click', e => { if (e.target.id === 'setModal') closeSettings(); });

    // Browse panel back
    document.getElementById('browseBack').addEventListener('click', () => showView('welcome'));
    document.getElementById('docBack').addEventListener('click', () => showView('browse'));

    lucide.createIcons();
    inp.focus();
  }

  return {
    init, toast, doSend, quickSend, newChat, showView, navTo, loadHist,
    browseLaws, browseLibrary, browseContracts, browseArticles,
    browseSubcat, browseContractType, viewDoc, openSettings
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
