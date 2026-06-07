/* ============================================================
   GP Photo Studio 2.1 — history.js  v4.0
   Stack historii, undo/redo, wizualna lista, zapis do History_list
   ============================================================ */
"use strict";

const HISTORY_LIMIT = 20;
let _stack   = [];
let _pointer = -1;

/* ────────────────────────────────────────────────────────────
   SNAPSHOT
   ──────────────────────────────────────────────────────────── */
function createSnapshot(label) {
  const cv = document.getElementById('editorCanvas');
  return {
    label,
    ts: Date.now(),
    filters   : JSON.parse(JSON.stringify(GP.filters)),
    sharpenPro: JSON.parse(JSON.stringify(GP.sharpenPro)),
    vignette  : JSON.parse(JSON.stringify(GP.vignette)),
    rotation  : GP.rotation,
    flipX     : GP.flipX,
    flipY     : GP.flipY,
    zoom      : GP.zoom,
    imageData : GP.imageLoaded ? cv.getContext('2d').getImageData(0,0,cv.width,cv.height) : null,
    imgW      : GP.imageLoaded ? cv.width  : 0,
    imgH      : GP.imageLoaded ? cv.height : 0,
    imgSrc    : GP.imageLoaded ? GP.image.src : null
  };
}

function restoreSnapshot(snap) {
  GP.filters    = JSON.parse(JSON.stringify(snap.filters));
  GP.sharpenPro = JSON.parse(JSON.stringify(snap.sharpenPro));
  GP.vignette   = JSON.parse(JSON.stringify(snap.vignette));
  GP.rotation   = snap.rotation;
  GP.flipX      = snap.flipX;
  GP.flipY      = snap.flipY;
  GP.zoom       = snap.zoom;

  /* Sync sliders */
  Object.entries(GP.filters).forEach(([k,v]) => {
    const s = document.getElementById(k);
    const l = document.getElementById(k+'Value');
    if (s) s.value        = v;
    if (l) l.textContent  = v;
  });
  const sync = (id, val, lblId) => {
    const el = document.getElementById(id); if (el) el.value = val;
    const lb = document.getElementById(lblId); if (lb) lb.textContent = val;
  };
  sync('proAmount',   GP.sharpenPro.amount,    'proAmountValue');
  sync('proRadius',   GP.sharpenPro.radius,    'proRadiusValue');
  sync('proThreshold',GP.sharpenPro.threshold, 'proThresholdValue');
  sync('vignetteStrength', GP.vignette.strength, 'vignetteValue');

  const zv = document.getElementById('zoomValue');
  if (zv) zv.textContent = `${GP.zoom}%`;

  /* Restore pixels */
  if (snap.imgSrc && snap.imageData) {
    if (GP.imageLoaded && GP.image.src === snap.imgSrc) {
      const cv = document.getElementById('editorCanvas');
      cv.width  = snap.imgW;
      cv.height = snap.imgH;
      cv.getContext('2d').putImageData(snap.imageData, 0, 0);
      cv.style.transform = `scale(${GP.zoom/100})`;
      cv.style.transformOrigin = 'center center';
    } else {
      const img = new Image();
      img.onload = () => { GP.image = img; GP.imageLoaded = true; renderImage(); };
      img.src = snap.imgSrc;
    }
  } else {
    renderImage();
  }
}

/* ────────────────────────────────────────────────────────────
   PUBLIC API
   ──────────────────────────────────────────────────────────── */
function saveHistory(label) {
  _stack   = _stack.slice(0, _pointer + 1);
  _stack.push(createSnapshot(label || 'Edit'));
  if (_stack.length > HISTORY_LIMIT) _stack.shift();
  _pointer = _stack.length - 1;
  refreshHistoryUI();
  saveHistoryFile(label);
}

function undo() {
  if (_pointer <= 0) return;
  _pointer--;
  restoreSnapshot(_stack[_pointer]);
  refreshHistoryUI();
}

function redo() {
  if (_pointer >= _stack.length - 1) return;
  _pointer++;
  restoreSnapshot(_stack[_pointer]);
  refreshHistoryUI();
}

function jumpToHistory(idx) {
  if (idx < 0 || idx >= _stack.length) return;
  _pointer = idx;
  restoreSnapshot(_stack[_pointer]);
  refreshHistoryUI();
}

function clearHistoryStack() {
  _stack = []; _pointer = -1;
  refreshHistoryUI();
}

/* ────────────────────────────────────────────────────────────
   ZAPIS DO History_list (symulowany przez localStorage)
   ──────────────────────────────────────────────────────────── */
function saveHistoryFile(label) {
  if (!GP.imageLoaded) return;
  /* W środowisku przeglądarki nie możemy pisać do dysku.
     Przechowujemy metadane w localStorage jako namiastkę "History_list". */
  try {
    const key   = 'GP_HistoryList';
    const list  = JSON.parse(localStorage.getItem(key) || '[]');
    const clean = label.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g,'_');
    list.push({ name: clean, ts: Date.now(), label });
    while (list.length > 10) list.shift(); // max 10 wpisów
    localStorage.setItem(key, JSON.stringify(list));
  } catch(e) { /* localStorage może być niedostępny */ }
}

/* ────────────────────────────────────────────────────────────
   UI HISTORII
   ──────────────────────────────────────────────────────────── */
function refreshHistoryUI() {
  /* przyciski undo/redo */
  const ub = document.getElementById('undoBtn');
  const rb = document.getElementById('redoBtn');
  if (ub) ub.disabled = _pointer <= 0;
  if (rb) rb.disabled = _pointer >= _stack.length - 1;

  /* licznik */
  const cnt = document.getElementById('historyCount');
  if (cnt) cnt.textContent = _stack.length;

  /* lista */
  const list = document.getElementById('historyList');
  if (!list) return;
  if (_stack.length === 0) {
    list.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  const iconFor = lbl =>
    lbl.includes('Sharpen') ? '⚡' :
    lbl.includes('Rotate')  ? '🔄' :
    lbl.includes('Flip')    ? '↔'  :
    lbl.includes('Crop')    ? '✂'  :
    lbl.includes('Vignette')? '🌑' :
    lbl.includes('Reset')   ? '↺'  :
    lbl.includes('Loaded')  ? '📂' :
    lbl.includes('Layer')   ? '🗂'  : '🎨';

  list.innerHTML = '';
  /* newest first */
  for (let i = _stack.length - 1; i >= 0; i--) {
    const s    = _stack[i];
    const item = document.createElement('div');
    item.className = 'history-item' + (i === _pointer ? ' is-active' : '');
    item.innerHTML =
      `<span class="history-item__icon">${iconFor(s.label)}</span>` +
      `<span class="history-item__name">${s.label}</span>` +
      `<button class="history-item__del" data-idx="${i}" title="Remove">✕</button>`;

    item.addEventListener('click', ev => {
      if (ev.target.classList.contains('history-item__del')) return;
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
  refreshHistoryUI();
});

/* Ctrl+Z / Ctrl+Y */
window.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
});

/* ────────────────────────────────────────────────────────────
   EKSPORT
   ──────────────────────────────────────────────────────────── */
window.saveHistory      = saveHistory;
window.undo             = undo;
window.redo             = redo;
window.clearHistoryStack= clearHistoryStack;