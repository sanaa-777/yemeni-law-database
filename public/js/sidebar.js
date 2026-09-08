/* ══════ SIDEBAR MODULE ══════ */
const Sidebar = (() => {
  let open = false;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function show() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    open = true;
  }

  function hide() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    open = false;
  }

  function toggle() { open ? hide() : show(); }

  // Swipe to close
  let touchStartX = 0, touchStartY = 0, touching = false;
  sidebar.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touching = true;
  }, { passive: true });

  sidebar.addEventListener('touchmove', e => {
    if (!touching) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 40 && dy < 60) { hide(); touching = false; }
  }, { passive: true });

  sidebar.addEventListener('touchend', () => { touching = false; }, { passive: true });

  // Swipe from edge to open
  let edgeTouch = false;
  document.addEventListener('touchstart', e => {
    if (open) return;
    if (e.touches[0].clientX > window.innerWidth - 20) {
      edgeTouch = true;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!edgeTouch || open) return;
    if (touchStartX - e.touches[0].clientX > 50) { show(); edgeTouch = false; }
  }, { passive: true });

  document.addEventListener('touchend', () => { edgeTouch = false; }, { passive: true });

  // Overlay click
  overlay.addEventListener('click', hide);

  // Menu button
  document.getElementById('menuBtn').addEventListener('click', toggle);

  return { show, hide, toggle, isOpen: () => open };
})();
