/* ============================================================
   GP Photo Studio 2.1 — crop.js  v4.0
   Kadrowanie myszką przez nakładkę canvas (toolbar Crop)
   ============================================================ */
"use strict";

let _cropActive  = false;
let _cropCanvas  = null;   // nakładka canvas
let _cropCtx     = null;
let _cropDragging= false;
let _cropRect    = {x:0,y:0,w:0,h:0};
let _cropStart   = {x:0,y:0};

/* ────────────────────────────────────────────────────────────
   START KADROWANIA (przycisk Crop w toolbarze)
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cropToolBtn')?.addEventListener('click', startCropTool);
  document.getElementById('applyCropToolBtn')?.addEventListener('click', applyCropTool);
  document.getElementById('cancelCropToolBtn')?.addEventListener('click', cancelCropTool);
});

function startCropTool() {
  if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
  if (_cropActive) return;
  _cropActive = true;

  const cv    = document.getElementById('editorCanvas');
  const stage = document.getElementById('canvasStage');
  const zoom  = GP.zoom / 100;

  /* Utwórz nakładkę */
  _cropCanvas        = document.createElement('canvas');
  _cropCanvas.width  = cv.width;
  _cropCanvas.height = cv.height;
  _cropCanvas.style.cssText = [
    'position:absolute','top:0','left:0','z-index:50',
    `width:${cv.width}px`, `height:${cv.height}px`,
    `transform:scale(${zoom})`, 'transform-origin:center center',
    'cursor:crosshair'
  ].join(';');

  _cropCtx = _cropCanvas.getContext('2d');
  stage.style.position = 'relative';
  stage.appendChild(_cropCanvas);

  /* Inicjalne zaznaczenie = cały obraz */
  _cropRect = {x:0, y:0, w:cv.width, h:cv.height};
  drawCropOverlay();

  /* Zdarzenia */
  _cropCanvas.addEventListener('mousedown', onCropMouseDown);
  window.addEventListener('mousemove', onCropMouseMove);
  window.addEventListener('mouseup',   onCropMouseUp);

  /* Pokaż toolbar */
  document.getElementById('cropToolbar').style.display = 'flex';
  document.getElementById('cropToolBtn').style.display = 'none';
  showToast('Crop: drag to select area, then Apply.');
}

/* ────────────────────────────────────────────────────────────
   RYSUNEK NAKŁADKI
   ──────────────────────────────────────────────────────────── */
function drawCropOverlay() {
  if (!_cropCtx || !_cropCanvas) return;
  const w = _cropCanvas.width, h = _cropCanvas.height;
  _cropCtx.clearRect(0,0,w,h);

  /* Ciemna maska */
  _cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
  _cropCtx.fillRect(0,0,w,h);

  /* Wycięcie */
  const {x,y} = _cropRect;
  const cw = Math.max(_cropRect.w, 1), ch = Math.max(_cropRect.h, 1);
  _cropCtx.clearRect(x, y, cw, ch);

  /* Ramka */
  _cropCtx.strokeStyle = '#3d9eff';
  _cropCtx.lineWidth   = 1.5;
  _cropCtx.strokeRect(x, y, cw, ch);

  /* Linie siatki (reguła 1/3) */
  _cropCtx.strokeStyle = 'rgba(61,158,255,0.35)';
  _cropCtx.lineWidth   = 0.5;
  for (let i=1; i<3; i++) {
    _cropCtx.beginPath();
    _cropCtx.moveTo(x + cw*i/3, y); _cropCtx.lineTo(x + cw*i/3, y+ch);
    _cropCtx.moveTo(x, y + ch*i/3); _cropCtx.lineTo(x+cw, y + ch*i/3);
    _cropCtx.stroke();
  }

  /* Narożniki */
  const corner = 8;
  _cropCtx.strokeStyle = '#3d9eff';
  _cropCtx.lineWidth   = 2.5;
  [ [x,y],[x+cw,y],[x,y+ch],[x+cw,y+ch] ].forEach(([cx,cy]) => {
    const sx = cx === x ? 1 : -1, sy = cy === y ? 1 : -1;
    _cropCtx.beginPath();
    _cropCtx.moveTo(cx + sx*corner, cy); _cropCtx.lineTo(cx, cy); _cropCtx.lineTo(cx, cy + sy*corner);
    _cropCtx.stroke();
  });

  /* Wymiary */
  const cw2 = Math.abs(Math.round(_cropRect.w)), ch2 = Math.abs(Math.round(_cropRect.h));
  _cropCtx.fillStyle = 'rgba(0,0,0,0.65)';
  _cropCtx.fillRect(x+2, y+2, 90, 18);
  _cropCtx.fillStyle = '#fff';
  _cropCtx.font      = '11px "JetBrains Mono",monospace';
  _cropCtx.fillText(`${cw2} × ${ch2}`, x+6, y+14);
}

/* ────────────────────────────────────────────────────────────
   ZDARZENIA MYSZY
   ──────────────────────────────────────────────────────────── */
function getCanvasPos(e) {
  const rect  = _cropCanvas.getBoundingClientRect();
  const scale = _cropCanvas.width / rect.width;
  return {
    x: (e.clientX - rect.left)  * scale,
    y: (e.clientY - rect.top)   * scale
  };
}

function onCropMouseDown(e) {
  if (e.button !== 0) return;
  _cropDragging = true;
  const pos = getCanvasPos(e);
  _cropStart   = pos;
  _cropRect    = {x:pos.x, y:pos.y, w:0, h:0};
  e.preventDefault();
}

function onCropMouseMove(e) {
  if (!_cropDragging) return;
  const pos  = getCanvasPos(e);
  const x    = Math.min(_cropStart.x, pos.x);
  const y    = Math.min(_cropStart.y, pos.y);
  const w    = Math.abs(pos.x - _cropStart.x);
  const h    = Math.abs(pos.y - _cropStart.y);
  _cropRect  = { x: Math.max(0,x), y: Math.max(0,y),
                 w: Math.min(w, _cropCanvas.width - Math.max(0,x)),
                 h: Math.min(h, _cropCanvas.height - Math.max(0,y)) };
  drawCropOverlay();
}

function onCropMouseUp() { _cropDragging = false; }

/* ────────────────────────────────────────────────────────────
   ZASTOSOWANIE
   ──────────────────────────────────────────────────────────── */
function applyCropTool() {
  if (!_cropActive) return;
  const {x,y,w,h} = _cropRect;
  if (w < 2 || h < 2) { showToast('Select a larger area.'); return; }

  const srcCv = document.getElementById('editorCanvas');
  const tmp   = document.createElement('canvas');
  tmp.width   = Math.round(w);
  tmp.height  = Math.round(h);
  tmp.getContext('2d').drawImage(srcCv, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, Math.round(w), Math.round(h));

  const newImg = new Image();
  newImg.onload = () => {
    GP.image       = newImg;
    GP.imageLoaded = true;
    GP.rotation    = 0;
    GP.flipX       = 1;
    GP.flipY       = 1;

    srcCv.width  = newImg.naturalWidth;
    srcCv.height = newImg.naturalHeight;

    const dimEl = document.getElementById('imageDimensions');
    if (dimEl) dimEl.textContent = `${newImg.naturalWidth} × ${newImg.naturalHeight} px`;

    cleanupCrop();
    renderImage();
    fitToScreen();
    saveHistory('Crop');
    showToast(`✓ Cropped to ${Math.round(w)} × ${Math.round(h)} px`);
  };
  newImg.src = tmp.toDataURL('image/png');
}

/* ────────────────────────────────────────────────────────────
   ANULOWANIE
   ──────────────────────────────────────────────────────────── */
function cancelCropTool() {
  cleanupCrop();
  showToast('Crop cancelled.');
}

function cleanupCrop() {
  if (_cropCanvas) {
    _cropCanvas.removeEventListener('mousedown', onCropMouseDown);
    window.removeEventListener('mousemove', onCropMouseMove);
    window.removeEventListener('mouseup',   onCropMouseUp);
    _cropCanvas.parentNode?.removeChild(_cropCanvas);
    _cropCanvas = null;
  }
  _cropActive = false;
  document.getElementById('cropToolbar').style.display = 'none';
  document.getElementById('cropToolBtn').style.display = '';
}

window.startCropTool  = startCropTool;
window.applyCropTool  = applyCropTool;
window.cancelCropTool = cancelCropTool;