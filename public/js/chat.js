/* ══════ CHAT MODULE ══════ */
const Chat = (() => {
  const msgs = document.getElementById('msgs');
  const chatEl = document.getElementById('chat');
  const inp = document.getElementById('inp');
  const sendBtn = document.getElementById('sendBtn');

  function addMsg(role, text, anim = true) {
    const d = document.createElement('div');
    d.className = 'mg' + (anim ? ' fade-in' : '');
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    if (role === 'u') {
      d.innerHTML = `<div class="mr u"><div class="ma us"><i data-lucide="user"></i></div><div class="mc"><div class="mb">${esc(text)}</div><div class="mt">${time}</div></div></div>`;
    } else {
      d.innerHTML = `<div class="mr"><div class="ma ag"><i data-lucide="scale"></i></div><div class="mc"><div class="mb">${fmt(text)}</div><div class="macts"><button class="mact" onclick="Chat.copy(this)"><i data-lucide="copy"></i>نسخ</button><button class="mact" onclick="App.toast('تم الحفظ')"><i data-lucide="bookmark"></i>حفظ</button></div><div class="mt">${time}</div></div></div>`;
    }
    msgs.appendChild(d);
    scroll();
    lucide.createIcons();
  }

  function addThinking() {
    const d = document.createElement('div');
    d.className = 'mg fade-in'; d.id = 'think';
    d.innerHTML = `<div class="mr"><div class="ma ag"><i data-lucide="scale"></i></div><div class="mc"><div class="think"><div class="think-h"><i data-lucide="brain"></i>جاري التحليل...</div><div class="typing"><span></span><span></span><span></span></div></div></div></div>`;
    msgs.appendChild(d);
    scroll();
    lucide.createIcons();
    return d;
  }

  function showSteps(d) {
    d.querySelector('.mc').innerHTML =
      `<div class="think"><div class="think-h"><i data-lucide="check-circle"></i>تم تحليل السؤال</div><div style="font-size:.68rem;color:var(--t3)">جاري البحث في قاعدة البيانات القانونية</div></div>` +
      `<div class="steps">` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>تحليل الاستشارة</span></div>` +
        `<div class="step"><div class="si go"><i data-lucide="loader"></i></div><span>البحث في الوثائق</span></div>` +
        `<div class="step"><div class="si wt"><i data-lucide="circle"></i></div><span>إعداد الرد</span></div>` +
      `</div>`;
    lucide.createIcons();
  }

  function finish(d, data) {
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    let sourcesHTML = '';
    if (data.sources && data.sources.length) {
      sourcesHTML = '<div class="src-list">';
      data.sources.forEach(s => {
        sourcesHTML += `<div class="src-item" onclick="App.viewDoc('${s.id}')"><i data-lucide="file-text"></i><span>${s.title}</span><span class="src-cat">${s.category}</span></div>`;
      });
      sourcesHTML += '</div>';
    }
    d.querySelector('.mc').innerHTML =
      `<div class="think"><div class="think-h"><i data-lucide="check-circle"></i>تم إعداد الاستشارة</div></div>` +
      `<div class="steps">` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>تحليل الاستشارة</span></div>` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>البحث في الوثائق</span></div>` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>إعداد الرد</span></div>` +
      `</div>` +
      `<div class="mb" style="margin-top:10px">${fmt(data.answer || 'لا توجد نتائج')}</div>` +
      sourcesHTML +
      `<div class="macts"><button class="mact" onclick="Chat.copy(this)"><i data-lucide="copy"></i>نسخ</button><button class="mact" onclick="App.toast('تم الحفظ')"><i data-lucide="bookmark"></i>حفظ</button></div>` +
      `<div class="mt">${time}</div>`;
    scroll();
    lucide.createIcons();
  }

  function fmt(t) { return (t || '').replace(/\n/g, '<br>').replace(/(المادة\s*\([^)]+\))/g, '<strong>$1</strong>'); }
  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }

  function copy(btn) {
    const mb = btn.closest('.mc').querySelector('.mb');
    if (mb) { navigator.clipboard.writeText(mb.textContent); App.toast('تم نسخ النص'); }
  }

  function show() {
    chatEl.classList.add('on');
  }

  function hide() {
    chatEl.classList.remove('on');
  }

  function clear() {
    msgs.innerHTML = '';
  }

  return { addMsg, addThinking, showSteps, finish, show, hide, clear, copy };
})();
