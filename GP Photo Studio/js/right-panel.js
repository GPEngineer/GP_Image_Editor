/* ============================================================
   GP Photo Studio 2.1 — right-panel.js  v6.0
   Prawy panel:
     • collapse/expand  — klik chowa panel do cienkiego paska;
                           klik w dowolnym miejscu paska rozwija z powrotem
     • resize (drag left edge) — przeciąganie lewej krawędzi panelu
     • (logika "pin" została usunięta)
   ============================================================ */
"use strict";

const RP_MIN_W       = 180;
const RP_MAX_W       = 520;
const RP_DEFAULT     = 248;
const RP_COLLAPSED_W = 28;     // szerokość cienkiego paska po zwinięciu

let _rpCollapsed = false;
let _rpWidth     = RP_DEFAULT;

document.addEventListener('DOMContentLoaded', initRightPanel);

function initRightPanel() {
  const layout      = document.getElementById('appLayout');
  const panel       = document.getElementById('rightPanel');
  const collapseBtn = document.getElementById('rpCollapseBtn');
  const handle      = document.getElementById('rpResizeHandle');

  if (!panel || !layout) return;

  /* ── Collapse / Expand ── */
  function setCollapsed(state) {
    _rpCollapsed = state;
    layout.classList.toggle('rp-collapsed', _rpCollapsed);
    if (collapseBtn) {
      collapseBtn.textContent = _rpCollapsed ? '‹' : '›';
      collapseBtn.title       = _rpCollapsed ? 'Rozwiń panel' : 'Zwiń panel';
    }
    setRPWidth(_rpWidth);
  }

  // Klik w przycisk chevron — zwija / rozwija.
  // stopPropagation, żeby nie wywołać od razu handlera całego panelu.
  collapseBtn?.addEventListener('click', e => {
    e.stopPropagation();
    setCollapsed(!_rpCollapsed);
  });

  // Klik w dowolne miejsce zwiniętego paska — rozwija panel.
  panel.addEventListener('click', () => {
    if (_rpCollapsed) setCollapsed(false);
  });

  /* ── Resize (drag left edge) ── */
  let _resizing     = false;
  let _resizeStartX = 0;
  let _resizeStartW = 0;

  handle?.addEventListener('mousedown', e => {
    if (_rpCollapsed) return;               // brak resize gdy zwinięty
    _resizing     = true;
    _resizeStartX = e.clientX;
    _resizeStartW = panel.getBoundingClientRect().width;
    document.body.style.cursor     = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('mousemove', e => {
    if (!_resizing) return;
    const delta = _resizeStartX - e.clientX;            // ciągnięcie w lewo = szerszy
    const newW  = Math.max(RP_MIN_W, Math.min(RP_MAX_W, _resizeStartW + delta));
    _rpWidth = newW;
    setRPWidth(newW);
  });

  window.addEventListener('mouseup', () => {
    if (_resizing) {
      _resizing = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    }
  });

  /* Init */
  setRPWidth(_rpWidth);
}

function setRPWidth(w) {
  const layout = document.getElementById('appLayout');
  if (!layout) return;
  const rightW = _rpCollapsed ? (RP_COLLAPSED_W + 'px') : (w + 'px');
  // Ustawiamy wyłącznie kolumny; wiersze (toolbar/workspace) pochodzą z CSS.
  layout.style.gridTemplateColumns = `var(--panel-w) 1fr ${rightW}`;
}

window.setRPWidth = setRPWidth;