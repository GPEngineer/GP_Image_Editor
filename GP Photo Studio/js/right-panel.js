/* ============================================================
   GP Photo Studio 2.1 — right-panel.js  v6.0
   Right panel: collapse/expand to icon width, resize (drag left edge)
   Pin button removed. Panel always docked (occupies grid space).
   ============================================================ */
"use strict";

const RP_MIN_W    = 180;
const RP_MAX_W    = 520;
const RP_DEFAULT  = 248;
const RP_ICON_W   = 36;   /* collapsed width — just the toggle icon */

let _rpCollapsed = false;
let _rpWidth     = RP_DEFAULT;

document.addEventListener('DOMContentLoaded', initRightPanel);

function initRightPanel() {
  const layout      = document.getElementById('appLayout');
  const panel       = document.getElementById('rightPanel');
  const collapseBtn = document.getElementById('rpCollapseBtn');
  const handle      = document.getElementById('rpResizeHandle');

  if (!panel) return;

  /* ── Initial state ── */
  setRPWidth(_rpWidth);

  /* ── Collapse / Expand ── */
  collapseBtn?.addEventListener('click', () => {
    _rpCollapsed = !_rpCollapsed;
    layout.classList.toggle('rp-collapsed', _rpCollapsed);

    if (_rpCollapsed) {
      /* Show expand arrow icon */
      collapseBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="10,4 6,8 10,12"/></svg>`;
      collapseBtn.title = 'Expand panel';
      layout.style.gridTemplateColumns = `var(--panel-w) 1fr ${RP_ICON_W}px`;
    } else {
      /* Show collapse arrow icon */
      collapseBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="6,4 10,8 6,12"/></svg>`;
      collapseBtn.title = 'Collapse panel';
      setRPWidth(_rpWidth);
    }
  });

  /* ── Resize (drag left edge) ── */
  let _resizing     = false;
  let _resizeStartX = 0;
  let _resizeStartW = 0;

  handle?.addEventListener('mousedown', e => {
    if (_rpCollapsed) return;
    _resizing     = true;
    _resizeStartX = e.clientX;
    _resizeStartW = panel.getBoundingClientRect().width;
    document.body.style.cursor     = 'ew-resize';
    document.body.style.userSelect = 'none';
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
      document.body.style.userSelect = '';
    }
  });
}

function setRPWidth(w) {
  const layout = document.getElementById('appLayout');
  if (!layout) return;

  if (_rpCollapsed) {
    layout.style.gridTemplateColumns = `var(--panel-w) 1fr ${RP_ICON_W}px`;
  } else {
    layout.style.gridTemplateColumns = `var(--panel-w) 1fr ${w}px`;
  }
}

window.setRPWidth = setRPWidth;
