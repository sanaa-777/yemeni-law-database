/* ══════ CHAT MODULE ══════ */
const Chat = (() => {
  const msgs = document.getElementById('msgs');
  const chatEl = document.getElementById('chat');
  const inp = document.getElementById('inp');
  const sendBtn = document.getElementById('sendBtn');

  /* ── Unique ID for each message ── */
  let msgCounter = 0;

  function addMsg(role, text, anim = true) {
    const mid = 'msg-' + (++msgCounter);
    const d = document.createElement('div');
    d.className = 'mg' + (anim ? ' fade-in' : '');
    d.id = mid;
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    if (role === 'u') {
      d.innerHTML = `<div class="mr u"><div class="ma us"><i data-lucide="user"></i></div><div class="mc"><div class="mb">${esc(text)}</div><div class="mt">${time}</div></div></div>`;
    } else {
      d.innerHTML = buildAgentHTML(text, '', time, mid);
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
      `<div class="think"><div class="think-h"><i data-lucide="check-circle"></i>جاري إعداد الرأي القانوني</div><div style="font-size:.68rem;color:var(--t3)">مراجعة الوقائع والقواعد ذات الصلة</div></div>` +
      `<div class="steps">` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>فهم الوقائع</span></div>` +
        `<div class="step"><div class="si go"><i data-lucide="loader"></i></div><span>تحديد القواعد والدفوع</span></div>` +
        `<div class="step"><div class="si wt"><i data-lucide="circle"></i></div><span>صياغة الرأي</span></div>` +
      `</div>`;
    lucide.createIcons();
  }

  function finish(d, data) {
    const mid = d.id || 'msg-' + (++msgCounter);
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const answer = data.answer || 'لا توجد نتائج';
    const sources = data.sources || [];

    const sourcesHTML = '';

    d.querySelector('.mc').innerHTML =
      `<div class="think"><div class="think-h"><i data-lucide="check-circle"></i>الرأي القانوني الأولي</div></div>` +
      `<div class="steps">` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>فهم الوقائع</span></div>` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>تحديد الدفوع</span></div>` +
        `<div class="step"><div class="si ok"><i data-lucide="check"></i></div><span>صياغة الرأي</span></div>` +
      `</div>` +
      `<div class="mb" style="margin-top:10px">${fmt(answer)}</div>` +
      sourcesHTML +
      `<div class="mt">${time}</div>`;
    scroll();
    lucide.createIcons();
  }

  /* ── Build action buttons HTML ── */
  function buildActionsHTML(answer, sources, time, mid) {
    const dataAttr = `data-answer="${encodeURIComponent(answer)}" data-sources="${encodeURIComponent(JSON.stringify(sources))}" data-time="${encodeURIComponent(time)}" data-mid="${mid}"`;
    return `
      <div class="msg-actions">
        <button class="msg-action-btn" onclick="Chat.copyAnswer(this)" ${dataAttr}>
          <i data-lucide="copy"></i>
          <span>نسخ</span>
        </button>
        <button class="msg-action-btn" onclick="Chat.shareAnswer(this)" ${dataAttr}>
          <i data-lucide="share-2"></i>
          <span>مشاركة</span>
        </button>
        <button class="msg-action-btn msg-action-pdf" onclick="Chat.downloadPDF(this)" ${dataAttr}>
          <i data-lucide="download"></i>
          <span>تحميل PDF</span>
        </button>
      </div>`;
  }

  /* ── Build agent message HTML ── */
  function buildAgentHTML(answer, sources, time, mid) {
    return `<div class="mr"><div class="ma ag"><i data-lucide="scale"></i></div><div class="mc"><div class="mb">${fmt(answer)}</div>${buildActionsHTML(answer, sources, time, mid)}<div class="mt">${time}</div></div></div>`;
  }

  /* ── Format text ── */
  function fmt(t) {
    let out = esc(t || '')
      .replace(/^## (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^[-•] (.+)$/gm, '<div class="answer-bullet">• $1</div>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(المادة\s*\([^)]+\))/g, '<strong>$1</strong>')
      .replace(/(─────────────────)/g, '<hr style="border:none;border-top:1px solid var(--b1);margin:8px 0">');
    out = out.replace(/((?:^|\n)\|[^\n]+\|\n\|[- :|]+\|\n(?:\|[^\n]+\|\n?)+)/gm, block => {
      const rows = block.trim().split('\n').filter(Boolean).map(x => x.split('|').slice(1, -1).map(c => c.trim()));
      if (rows.length < 2) return block;
      const head = rows[0].map(c => `<th>${c}</th>`).join('');
      const body = rows.slice(2).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
      return `<table class="legal-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    });
    return out.replace(/\n/g, '<br>');
  }

  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }

  /* ── Copy answer ── */
  function copyAnswer(btn) {
    const answer = decodeURIComponent(btn.dataset.answer || '');
    navigator.clipboard.writeText(answer).then(() => {
      App.toast('تم نسخ النص');
      btn.classList.add('msg-action-done');
      setTimeout(() => btn.classList.remove('msg-action-done'), 1500);
    });
  }

  /* ── Share answer ── */
  async function shareAnswer(btn) {
    const answer = decodeURIComponent(btn.dataset.answer || '');
    const shareData = {
      title: 'استشارة قانونية - محامي اونلاين',
      text: answer
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(answer);
        App.toast('تم نسخ النص للمشاركة');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        await navigator.clipboard.writeText(answer);
        App.toast('تم نسخ النص');
      }
    }
  }

  /* ── Download PDF ── */
  async function downloadPDF(btn) {
    btn.disabled = true;
    btn.querySelector('span').textContent = 'جاري التجهيز...';
    try {
      const answer = decodeURIComponent(btn.dataset.answer || '');
      const sources = JSON.parse(decodeURIComponent(btn.dataset.sources || '[]'));
      const time = decodeURIComponent(btn.dataset.time || '');
      await PDFExport.generate(answer, sources, time);
      App.toast('تم تحميل ملف PDF');
    } catch (e) {
      console.error('PDF error:', e);
      App.toast('خطأ في إنشاء PDF');
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تحميل PDF';
    }
  }

  function show() { chatEl.classList.add('on'); }
  function hide() { chatEl.classList.remove('on'); }
  function clear() { msgs.innerHTML = ''; msgCounter = 0; }

  return { addMsg, addThinking, showSteps, finish, show, hide, clear, copyAnswer, shareAnswer, downloadPDF };
})();
