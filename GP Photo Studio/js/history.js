/* ============================================================
   GP Photo Studio 2.1 — history.js  v4.1
   Undo/redo stack + history UI with SVG icons
   ============================================================ */
"use strict";

let _stack   = [];
let _pointer = -1;

/* ────────────────────────────────────────────────────────────
   SAVE HISTORY
   ──────────────────────────────────────────────────────────── */
function saveHistory(label) {
  if (!GP.imageLoaded) return;

  const cv  = document.getElementById('editorCanvas');
  const src = (typeof getRenderedCanvas === 'function') ? getRenderedCanvas() : cv;
  const snapshot = document.createElement('canvas');
  snapshot.width  = src.width;
  snapshot.height = src.height;
  snapshot.getContext('2d').drawImage(src, 0, 0);

  /* Trim forward history */
  _stack   = _stack.slice(0, _pointer + 1);
  _stack.push({ canvas: snapshot, label, state: JSON.parse(JSON.stringify(GP)) });
  _pointer = _stack.length - 1;

  /* Keep max 50 entries */
  if (_stack.length > 50) {
    _stack.shift();
    _pointer--;
  }

  refreshHistoryUI();
  _persistHistoryMeta(label);
}
window.saveHistory = saveHistory;

/* ────────────────────────────────────────────────────────────
   UNDO / REDO
   ──────────────────────────────────────────────────────────── */
function undo() {
  if (_pointer <= 0) return;
  _pointer--;
  _applyHistoryEntry(_stack[_pointer]);
  refreshHistoryUI();
}
function redo() {
  if (_pointer >= _stack.length - 1) return;
  _pointer++;
  _applyHistoryEntry(_stack[_pointer]);
  refreshHistoryUI();
}
window.undo = undo;
window.redo = redo;

function jumpToHistory(idx) {
  if (idx < 0 || idx >= _stack.length) return;
  _pointer = idx;
  _applyHistoryEntry(_stack[idx]);
  refreshHistoryUI();
}

function clearHistoryStack() {
  _stack   = [];
  _pointer = -1;
  refreshHistoryUI();
}
window.clearHistoryStack = clearHistoryStack;

function _applyHistoryEntry(entry) {
  const cv  = document.getElementById('editorCanvas');
  const ctx = cv.getContext('2d');
  cv.width  = entry.canvas.width;
  cv.height = entry.canvas.height;
  ctx.drawImage(entry.canvas, 0, 0);

  /* Restore GP state (non-image parts) */
  const s = entry.state;
  GP.zoom     = s.zoom;
  GP.rotation = s.rotation;
  GP.flipX    = s.flipX;
  GP.flipY    = s.flipY;
  GP.filters  = { ...s.filters };
  GP.sharpenPro = { ...s.sharpenPro };
  GP.vignette   = { ...s.vignette };

  const zv = document.getElementById('zoomValue');
  if (zv) zv.textContent = GP.zoom + '%';
  if (typeof renderImage === 'function') renderImage();
}

/* ────────────────────────────────────────────────────────────
   PERSIST METADATA (localStorage)
   ──────────────────────────────────────────────────────────── */
function _persistHistoryMeta(label) {
  try {
    const key   = 'GP_HistoryList';
    const list  = JSON.parse(localStorage.getItem(key) || '[]');
    const clean = label.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g,'_');
    list.push({ name: clean, ts: Date.now(), label });
    while (list.length > 10) list.shift();
    localStorage.setItem(key, JSON.stringify(list));
  } catch(e) { /* localStorage may be unavailable */ }
}

/* ────────────────────────────────────────────────────────────
   SVG ICON HELPER — matches icons used elsewhere in the project
   ──────────────────────────────────────────────────────────── */
function _svgIconFor(lbl) {
  /* Return inline SVG string matching the project's si-svg style */
  if (lbl.includes('Sharpen') || lbl.includes('sharpen'))
    /* Lightning / enhance */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M9 2 L5 9 h4 L7 14 L13 7 h-4 Z"/></svg>`;
  if (lbl.includes('Rotate') || lbl.includes('rotate'))
    /* Rotate CCW */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 8a6 6 0 1 0 6-6"/><polyline points="2,5 2,8 5,8"/></svg>`;
  if (lbl.includes('Flip') || lbl.includes('flip'))
    /* Flip arrows */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M8 2 v12 M4 5 L8 2 L12 5"/><path d="M4 11 L8 14 L12 11"/></svg>`;
  if (lbl.includes('Crop') || lbl.includes('crop'))
    /* Crop / scissors */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 4 h10 v10"/><path d="M4 2 v10 h10"/></svg>`;
  if (lbl.includes('Vignette') || lbl.includes('vignette'))
    /* Circle with dark rim */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".35"/></svg>`;
  if (lbl.includes('Reset') || lbl.includes('reset'))
    /* Reset / undo circle */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 8a6 6 0 1 0 1.5-4"/><polyline points="2,3 2,8 7,8"/></svg>`;
  if (lbl.includes('loaded') || lbl.includes('Loaded') || lbl.includes('Image loaded'))
    /* File / open */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 2h7l3 3v9H2V2z"/><polyline points="9,2 9,5 12,5"/></svg>`;
  if (lbl.includes('Layer') || lbl.includes('layer') || lbl.includes('Flatten') || lbl.includes('Merge'))
    /* Layers stack */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M2 10 L8 13 L14 10"/><path d="M2 7 L8 10 L14 7"/><path d="M2 4 L8 7 L14 4"/></svg>`;
  if (lbl.includes('Text') || lbl.includes('text'))
    /* T text icon */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="8" y1="4" x2="8" y2="12"/><line x1="4" y1="4" x2="12" y2="4"/></svg>`;
  if (lbl.includes('Filter') || lbl.includes('filter') || lbl.includes('Brightness') || lbl.includes('Contrast'))
    /* Sliders */
    return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="11" x2="14" y2="11"/><circle cx="6" cy="5" r="1.5" fill="currentColor"/><circle cx="10" cy="11" r="1.5" fill="currentColor"/></svg>`;
  /* Default: paint/edit */
  return `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="5" cy="5" r="2" fill="#e55" stroke="none"/><circle cx="11" cy="5" r="2" fill="#5e5" stroke="none"/><circle cx="8" cy="11" r="2" fill="#55f" stroke="none"/></svg>`;
}

/* ────────────────────────────────────────────────────────────
   HISTORY UI
   ──────────────────────────────────────────────────────────── */
function refreshHistoryUI() {
  /* undo/redo buttons */
  const ub = document.getElementById('undoBtn');
  const rb = document.getElementById('redoBtn');
  if (ub) ub.disabled = _pointer <= 0;
  if (rb) rb.disabled = _pointer >= _stack.length - 1;

  /* counter */
  const cnt = document.getElementById('historyCount');
  if (cnt) cnt.textContent = _stack.length;

  /* list */
  const list = document.getElementById('historyList');
  if (!list) return;
  if (_stack.length === 0) {
    list.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  list.innerHTML = '';
  /* newest first */
  for (let i = _stack.length - 1; i >= 0; i--) {
    const s    = _stack[i];
    const item = document.createElement('div');
    item.className = 'history-item' + (i === _pointer ? ' is-active' : '');
    item.innerHTML =
      `<span class="history-item__icon">${_svgIconFor(s.label)}</span>` +
      `<span class="history-item__name">${s.label}</span>` +
      `<button class="history-item__del" data-idx="${i}" title="Remove">` +
        `<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>` +
      `</button>`;

    item.addEventListener('click', ev => {
      if (ev.target.closest('.history-item__del')) return;
      jumpToHistory(i);
    });
    item.querySelector('.history-item__del').addEventListener('click', ev => {
      ev.stopPropagation();
      _stack.splice(i, 1);
      if (_pointer >= _stack.length) _pointer = _stack.length - 1;
      refreshHistoryUI();
    });
    list.appendChild(item);
  }
}
window.refreshHistoryUI = refreshHistoryUI;

/* ────────────────────────────────────────────────────────────
   BUTTON LISTENERS
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('undoBtn')?.addEventListener('click', undo);
  document.getElementById('redoBtn')?.addEventListener('click', redo);
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    showConfirm('Clear History', 'Remove all history entries?', () => {
      clearHistoryStack();
      showToast('History cleared.');
    });
  });
});
