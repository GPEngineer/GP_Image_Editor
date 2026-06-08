/* ============================================================
   GP Photo Studio 2.1 — right-panel.js  v5.0
   Prawy panel: collapse/expand, pin, resize (drag left edge)
   ============================================================ */
"use strict";

const RP_MIN_W  = 180;
const RP_MAX_W  = 520;
const RP_DEFAULT= 248;

let _rpPinned    = true;   // true = panel zajmuje miejsce w layoucie
let _rpCollapsed = false;
let _rpWidth     = RP_DEFAULT;

document.addEventListener('DOMContentLoaded', initRightPanel);

function initRightPanel() {
  const layout     = document.getElementById('appLayout');
  const panel      = document.getElementById('rightPanel');
  const collapseBtn= document.getElementById('rpCollapseBtn');
  const pinBtn     = document.getElementById('rpPinBtn');
  const handle     = document.getElementById('rpResizeHandle');

  if (!panel) return;

  /* ── Collapse / Expand ── */
  collapseBtn?.addEventListener('click', () => {
    _rpCollapsed = !_rpCollapsed;
    layout.classList.toggle('rp-collapsed', _rpCollapsed);
    collapseBtn.textContent = _rpCollapsed ? '›' : '‹';
    collapseBtn.title       = _rpCollapsed ? 'Expand panel' : 'Collapse panel';
    if (!_rpCollapsed) setRPWidth(_rpWidth);
  });

  /* ── Pin / Unpin ── */
  pinBtn?.addEventListener('click', () => {
    _rpPinned = !_rpPinned;
    pinBtn.classList.toggle('pinned', _rpPinned);
    pinBtn.title = _rpPinned ? 'Unpin (floating)' : 'Pin panel';

    if (_rpPinned) {
      panel.style.position = 'relative';
      panel.style.right    = '';
      panel.style.top      = '';
      panel.style.bottom   = '';
      panel.style.zIndex   = '';
      layout.style.gridTemplateColumns = `var(--panel-w) 1fr ${_rpWidth}px`;
    } else {
      /* Floating mode — overlay, nie zajmuje miejsca w gridzie */
      panel.style.position = 'fixed';
      panel.style.right    = '0';
      panel.style.top      = '0';
      panel.style.bottom   = '0';
      panel.style.zIndex   = '100';
      panel.style.width    = _rpWidth + 'px';
      layout.style.gridTemplateColumns = `var(--panel-w) 1fr 0px`;
    }
  });

  /* ── Resize (drag left edge) ── */
  let _resizing = false;
  let _resizeStartX = 0;
  let _resizeStartW = 0;

  handle?.addEventListener('mousedown', e => {
    if (_rpCollapsed) return;
    _resizing     = true;
    _resizeStartX = e.clientX;
    _resizeStartW = panel.getBoundingClientRect().width;
    document.body.style.cursor       = 'ew-resize';
    document.body.style.userSelect   = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!_resizing) return;
    const delta = _resizeStartX - e.clientX;
    const newW  = Math.max(RP_MIN_W, Math.min(RP_MAX_W, _resizeStartW + delta));
    _rpWidth = newW;
    setRPWidth(newW);
  });

  window.addEventListener('mouseup', () => {
    if (_resizing) {
      _resizing = false;
      document.body.style.cursor    = '';
      document.body.style.userSelect= '';
    }
  });

  /* Init */
  setRPWidth(_rpWidth);
}

function setRPWidth(w) {
  const layout = document.getElementById('appLayout');
  const panel  = document.getElementById('rightPanel');
  if (!layout || !panel) return;

  if (_rpPinned) {
    layout.style.gridTemplateColumns = _rpCollapsed
      ? `var(--panel-w) 1fr 28px`
      : `var(--panel-w) 1fr ${w}px`;
  } else {
    panel.style.width = w + 'px';
  }
}

window.setRPWidth = setRPWidth;
