/* ============================================================
   GP Photo Studio 2.1 — text-tool.js  v5.0
   Narzędzie tekstowe: ramka na canvas, kursor move/text,
   drag ramki, resize, formatowanie na żywo
   ============================================================ */
"use strict";

let _textFrames  = [];   // Aktywne ramki tekstowe
let _activeFrame = null;

/* ────────────────────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addTextToolBtn')?.addEventListener('click', addTextFrame);

  /* Text toolbar → formatuje aktywną ramkę na żywo */
  document.getElementById('ttFontFamily')?.addEventListener('change',  applyTextFormat);
  document.getElementById('ttFontSize')  ?.addEventListener('change',  applyTextFormat);
  document.getElementById('ttFontColor') ?.addEventListener('input',   applyTextFormat);
  document.getElementById('ttBold')      ?.addEventListener('click',   toggleBold);
  document.getElementById('ttItalic')    ?.addEventListener('click',   toggleItalic);
});

/* ────────────────────────────────────────────────────────────
   DODAJ RAMKĘ TEKSTOWĄ
   ──────────────────────────────────────────────────────────── */
function addTextFrame(x, y) {
  if (!GP.imageLoaded) { showToast('Load an image first.'); return; }

  const stage = document.getElementById('canvasStage');
  const zoom  = GP.zoom / 100;

  /* Domyślna pozycja = środek widocznego obszaru canvasu */
  const cv    = document.getElementById('editorCanvas');
  const rect  = cv.getBoundingClientRect();
  const startX = typeof x === 'number' ? x : rect.left + rect.width  / 2 - 80;
  const startY = typeof y === 'number' ? y : rect.top  + rect.height / 2 - 20;

  /* Ramka */
  const frame = document.createElement('div');
  frame.className = 'text-frame-overlay';
  frame.style.left   = `${startX - rect.left}px`;
  frame.style.top    = `${startY - rect.top}px`;
  frame.style.width  = '200px';
  frame.style.minHeight = '36px';

  /* Textarea wewnętrzna */
  const ta = document.createElement('textarea');
  ta.className   = 'text-frame-textarea';
  ta.rows        = 1;
  ta.placeholder = 'Type here…';
  applyFormatToElement(ta);

  /* Auto-resize wysokości */
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });

  /* Uchwyt resize */
  const handle = document.createElement('div');
  handle.className = 'text-frame-handle';

  frame.appendChild(ta);
  frame.appendChild(handle);

  /* Dodaj do canvas-stage (żeby skalowała się razem z zoomem) */
  stage.appendChild(frame);
  _textFrames.push(frame);
  _activeFrame = frame;

  /* Focus */
  setTimeout(() => ta.focus(), 50);

  /* ── Drag ramki (kursor 4-strzałkowy) ── */
  makeDraggable(frame, ta);

  /* ── Resize ramki ── */
  makeResizable(frame, handle, ta);

  /* ── Kliknięcie = aktywuj ramkę ── */
  frame.addEventListener('mousedown', () => {
    _activeFrame = frame;
    _textFrames.forEach(f => f.style.border = '1.5px dashed var(--accent)');
    frame.style.border = '1.5px solid var(--accent)';
  });

  /* Dodaj warstwę tekstową do listy warstw */
  if (typeof addTextLayerFromFrame === 'function') addTextLayerFromFrame(frame);
  if (typeof saveHistory === 'function') saveHistory('Add Text');
  showToast('✓ Text frame added. Click to edit.');
}

/* ────────────────────────────────────────────────────────────
   DRAG RAMKI
   ──────────────────────────────────────────────────────────── */
function makeDraggable(frame, ta) {
  let dragging = false, ox=0, oy=0;

  /* Ruch zaczyna tylko gdy klikamy na krawędź ramki (nie na textarea) */
  frame.addEventListener('mousedown', e => {
    if (e.target === ta) return;   // textarea = kursor tekstowy
    dragging = true;
    ox = e.clientX - frame.offsetLeft;
    oy = e.clientY - frame.offsetTop;
    frame.style.cursor = 'move';
    e.preventDefault();
  });

  /* Kursor przy hover na ramce */
  frame.addEventListener('mousemove', e => {
    if (e.target === ta) {
      frame.style.cursor = 'text';
    } else {
      frame.style.cursor = dragging ? 'move' : 'grab';
    }
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    frame.style.left = (e.clientX - ox) + 'px';
    frame.style.top  = (e.clientY - oy) + 'px';
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    frame.style.cursor = '';
  });
}

/* ────────────────────────────────────────────────────────────
   RESIZE RAMKI
   ──────────────────────────────────────────────────────────── */
function makeResizable(frame, handle, ta) {
  let resizing = false, startX=0, startY=0, startW=0, startH=0;

  handle.addEventListener('mousedown', e => {
    resizing = true;
    startX   = e.clientX;
    startY   = e.clientY;
    startW   = frame.offsetWidth;
    startH   = frame.offsetHeight;
    e.stopPropagation();
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!resizing) return;
    const newW = Math.max(80,  startW + (e.clientX - startX));
    const newH = Math.max(36,  startH + (e.clientY - startY));
    frame.style.width  = newW + 'px';
    frame.style.height = newH + 'px';
    ta.style.height    = (newH - 10) + 'px';
  });
  window.addEventListener('mouseup', () => { resizing = false; });
}

/* ────────────────────────────────────────────────────────────
   FORMATOWANIE TEKSTU
   ──────────────────────────────────────────────────────────── */
function applyTextFormat() {
  if (!_activeFrame) return;
  const ta = _activeFrame.querySelector('textarea');
  if (ta) applyFormatToElement(ta);
}

function applyFormatToElement(el) {
  const ff   = document.getElementById('ttFontFamily')?.value || 'DM Sans';
  const fs   = document.getElementById('ttFontSize')  ?.value || '24';
  const fc   = document.getElementById('ttFontColor') ?.value || '#ffffff';
  const bold = document.getElementById('ttBold')?.classList.contains('active');
  const ital = document.getElementById('ttItalic')?.classList.contains('active');

  el.style.fontFamily = `"${ff}", sans-serif`;
  el.style.fontSize   = fs + 'px';
  el.style.color      = fc;
  el.style.fontWeight = bold ? 'bold'   : 'normal';
  el.style.fontStyle  = ital ? 'italic' : 'normal';
}

function toggleBold() {
  document.getElementById('ttBold')?.classList.toggle('active');
  applyTextFormat();
}
function toggleItalic() {
  document.getElementById('ttItalic')?.classList.toggle('active');
  applyTextFormat();
}

/* ────────────────────────────────────────────────────────────
   SPŁASZCZENIE warstwy tekstowej na canvas (przy flatten)
   ──────────────────────────────────────────────────────────── */
function flattenTextFrames() {
  const cv  = document.getElementById('editorCanvas');
  const ctx = cv.getContext('2d');

  _textFrames.forEach(frame => {
    const ta   = frame.querySelector('textarea');
    if (!ta) return;

    const cvRect  = cv.getBoundingClientRect();
    const frRect  = frame.getBoundingClientRect();
    const zoom    = GP.zoom / 100;

    const x = (frRect.left - cvRect.left) / zoom;
    const y = (frRect.top  - cvRect.top)  / zoom;

    const lines = ta.value.split('\n');
    ctx.save();
    ctx.font      = `${ta.style.fontWeight} ${ta.style.fontStyle} ${ta.style.fontSize} ${ta.style.fontFamily}`;
    ctx.fillStyle = ta.style.color || '#fff';
    ctx.textBaseline = 'top';
    const lh = parseFloat(ta.style.fontSize) * 1.4;
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lh));
    ctx.restore();

    frame.remove();
  });
  _textFrames = [];
  _activeFrame = null;
}

window.addTextFrame       = addTextFrame;
window.flattenTextFrames  = flattenTextFrames;
window.applyTextFormat    = applyTextFormat;
