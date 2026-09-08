/* ══════ PDF EXPORT MODULE ══════ */
/* Uses html2pdf.js for professional Arabic PDF generation */
const PDFExport = (() => {

  /* ── Generate PDF ── */
  async function generate(answer, sources, time) {
    // Build the PDF content as a hidden DOM element
    const container = document.createElement('div');
    container.setAttribute('dir', 'rtl');
    container.style.cssText = `
      position:fixed; top:-9999px; left:-9999px;
      width:794px; padding:40px 45px;
      font-family:'Noto Kufi Arabic',Tahoma,Arial,sans-serif;
      font-size:13px; line-height:1.8; color:#1a1a1a;
      direction:rtl; text-align:right;
      background:#fff;
    `;

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-YE', { year:'numeric', month:'long', day:'numeric' });
    const timeStr = time || now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #c8a45c; padding-bottom:16px; margin-bottom:24px;">
        <div>
          <div style="font-size:22px; font-weight:700; color:#1a1a1a;">محامي اونلاين</div>
          <div style="font-size:11px; color:#666; margin-top:2px;">وكيل ذكي متخصص في القانون اليمني</div>
        </div>
        <div style="text-align:left; direction:ltr;">
          <div style="font-size:11px; color:#888;">${dateStr}</div>
          <div style="font-size:11px; color:#888;">${timeStr}</div>
        </div>
      </div>

      <!-- Title -->
      <div style="font-size:16px; font-weight:700; color:#c8a45c; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid #e5e5e5;">
        استشارة قانونية
      </div>

      <!-- Answer Content -->
      <div style="font-size:13px; line-height:2; color:#222; margin-bottom:24px; white-space:pre-wrap; word-wrap:break-word;">
        ${formatForPDF(answer)}
      </div>

      ${sources.length ? `
      <!-- Sources -->
      <div style="margin-top:24px; padding-top:16px; border-top:2px solid #e5e5e5;">
        <div style="font-size:14px; font-weight:700; color:#1a1a1a; margin-bottom:12px;">
          المصادر القانونية
        </div>
        ${sources.map((s, i) => `
          <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f8f8f8; border-radius:6px; margin-bottom:6px; font-size:12px;">
            <span style="background:#c8a45c; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0;">${i + 1}</span>
            <span style="color:#222; font-weight:600;">${escapeHTML(s.title)}</span>
            <span style="color:#888; font-size:11px; margin-right:auto;">${escapeHTML(s.category)}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top:32px; padding-top:12px; border-top:2px solid #c8a45c; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:10px; color:#999;">
          ⚠️ هذه معلومات قانونية عامة. يُنصح بمراجعة محامٍ متخصص.
        </div>
        <div style="font-size:10px; color:#999;">
          محامي اونلاين — yemeni-law-database
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Generate filename
    const filename = `استشارة-قانونية-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.pdf`;

    // Use html2pdf.js
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  }

  /* ── Format text for PDF ── */
  function formatForPDF(text) {
    return escapeHTML(text || '')
      .replace(/\n\n+/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, '<br>')
      .replace(/(─────────────────)/g, '<hr style="border:none;border-top:1px solid #ddd;margin:12px 0">')
      .replace(/(المادة\s*\([^)]+\))/g, '<strong style="color:#8a6d2f">$1</strong>')
      .replace(/^(.+)$/gm, '<p style="margin:4px 0">$1</p>');
  }

  function escapeHTML(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  return { generate };
})();
