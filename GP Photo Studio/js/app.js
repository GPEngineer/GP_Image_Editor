/* ============================================================
   GP Photo Studio 2.1 — app.js  v4.1
   Global state, image loading, zoom, pan, transform
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   GLOBAL STATE
   ──────────────────────────────────────────────────────────── */
window.GP = {
  image       : null,
  imageLoaded : false,
  zoom        : 100,
  rotation    : 0,
  flipX       : 1,
  flipY       : 1,
  fileName    : '',

  sharpenPro : { amount:70, radius:2, threshold:4, enabled:false },
  vignette   : { strength:0, enabled:false },

  filters : {
    brightness:100, contrast:100, saturation:100,
    sharpness:0, blur:0, grayscale:0,
    sepia:0, hue:0, invert:0, opacity:100
  },

  settings : {
    showRulers    : false,
    rulerUnit     : 'px',
    rulerDpi      : 96,
    zoomStep      : 10,
    autoCenterZoom: true
  }
};

/* ────────────────────────────────────────────────────────────
   DOM REFERENCES
   ──────────────────────────────────────────────────────────── */
const imageLoader   = document.getElementById('imageLoader');
const canvas        = document.getElementById('editorCanvas');
const zoomValueEl   = document.getElementById('zoomValue');
const dropHint      = document.getElementById('dropHint');
const canvasWrapper = document.getElementById('canvasWrapper');
const imageInfo     = document.getElementById('imageInfo');
const imageDimEl    = document.getElementById('imageDimensions');
const fileNameDisp  = document.getElementById('fileNameDisplay');

/* ────────────────────────────────────────────────────────────
   TOAST
   ──────────────────────────────────────────────────────────── */
function showToast(msg, duration = 2800) {
  const t = document.getElementById('gpToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}
window.showToast = showToast;

/* ────────────────────────────────────────────────────────────
   CONFIRM MODAL
   ──────────────────────────────────────────────────────────── */
function showConfirm(title, msg, onOk, icon='⚠') {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmIcon').textContent  = icon;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  overlay.classList.add('show');

  const okBtn  = document.getElementById('confirmOk');
  const canBtn = document.getElementById('confirmCancel');

  function cleanup() {
    overlay.classList.remove('show');
    okBtn.removeEventListener('click', handleOk);
    canBtn.removeEventListener('click', handleCancel);
    overlay.removeEventListener('click', handleBg);
  }
  function handleOk()     { cleanup(); onOk(); }
  function handleCancel() { cleanup(); }
  function handleBg(e)    { if (e.target === overlay) cleanup(); }

  okBtn.addEventListener('click', handleOk);
  canBtn.addEventListener('click', handleCancel);
  overlay.addEventListener('click', handleBg);
}
window.showConfirm = showConfirm;

/* ────────────────────────────────────────────────────────────
   UNSAVED CHANGES WARNING
   ──────────────────────────────────────────────────────────── */
window.addEventListener('beforeunload', e => {
  if (!GP.imageLoaded) return;
  e.preventDefault();
  e.returnValue = 'You have unsaved work. Are you sure you want to leave?';
  return e.returnValue;
});

/* ────────────────────────────────────────────────────────────
   FILE SELECTION — fix double-open bug
   ──────────────────────────────────────────────────────────── */
document.getElementById('fileUploadLabel').addEventListener('click', e => {
  e.preventDefault();
  imageLoader.value = '';   // reset so same file triggers change event again
  imageLoader.click();
});

imageLoader.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) loadImageFile(file);
  // Reset value so change event fires even for the same file
  imageLoader.value = '';
});

/* ────────────────────────────────────────────────────────────
   IMAGE LOADING
   ──────────────────────────────────────────────────────────── */
function loadImageFile(file) {
  if (!file) return;
  GP.fileName = file.name.replace(/\.[^.]+$/, '');
  fileNameDisp.textContent = file.name;

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      GP.image       = img;
      GP.imageLoaded = true;
      GP.zoom        = 100;
      GP.rotation    = 0;
      GP.flipX       = 1;
      GP.flipY       = 1;

      imageDimEl.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      imageInfo.style.display = '';
      dropHint.classList.add('hidden');

      resizeCanvasToImage();
      fitToScreen();
      renderImage();

      if (typeof saveHistory === 'function') saveHistory('Image loaded');
      if (typeof drawRulers  === 'function') drawRulers();
      showToast(`✓ Loaded: ${file.name}`);
    };
    img.onerror = () => showToast('❌ Cannot open file. Unsupported format.');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
window.loadImageFile = loadImageFile;

/* ────────────────────────────────────────────────────────────
   DRAG & DROP
   ──────────────────────────────────────────────────────────── */
canvasWrapper.addEventListener('dragover', e => { e.preventDefault(); canvasWrapper.classList.add('drag-over'); });
canvasWrapper.addEventListener('dragleave', () => canvasWrapper.classList.remove('drag-over'));
canvasWrapper.addEventListener('drop', e => {
  e.preventDefault();
  canvasWrapper.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadImageFile(file);
});

/* ────────────────────────────────────────────────────────────
   ZOOM
   ──────────────────────────────────────────────────────────── */
function updateZoom(center = true) {
  zoomValueEl.textContent = GP.zoom + '%';
  resizeCanvasToImage();
  renderImage();
  if (center && GP.settings.autoCenterZoom) centerCanvas();
  if (typeof drawRulers === 'function') drawRulers();
}

document.getElementById('zoomInBtn').addEventListener('click', () => {
  GP.zoom = Math.min(GP.zoom + (GP.settings.zoomStep||10), 3200);
  updateZoom();
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  GP.zoom = Math.max(GP.zoom - (GP.settings.zoomStep||10), 5);
  updateZoom();
});
document.getElementById('zoomFitBtn').addEventListener('click', () => { fitToScreen(); renderImage(); });
document.getElementById('zoom100Btn').addEventListener('click', () => { GP.zoom = 100; updateZoom(); });

/* Mouse wheel zoom */
canvasWrapper.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const d = e.deltaY < 0 ? (GP.settings.zoomStep||10) : -(GP.settings.zoomStep||10);
    GP.zoom = Math.max(5, Math.min(GP.zoom + d, 3200));
    updateZoom(false);
  }
}, {passive:false});

/* ────────────────────────────────────────────────────────────
   ROTATION
   ──────────────────────────────────────────────────────────── */
document.getElementById('rotateLeftBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.rotation -= 90;
  renderImage(); saveHistory('Rotate left');
});
document.getElementById('rotateRightBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.rotation += 90;
  renderImage(); saveHistory('Rotate right');
});

/* ────────────────────────────────────────────────────────────
   FLIP
   ──────────────────────────────────────────────────────────── */
document.getElementById('flipHorizontalBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.flipX *= -1; renderImage(); saveHistory('Flip horizontal');
});
document.getElementById('flipVerticalBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.flipY *= -1; renderImage(); saveHistory('Flip vertical');
});

/* ────────────────────────────────────────────────────────────
   RESET ALL ADJUSTMENTS
   ──────────────────────────────────────────────────────────── */
document.getElementById('resetAllBtn').addEventListener('click', () => {
  showConfirm('Reset adjustments',
    'This will restore all sliders to default values. Continue?',
    resetAll, '↺');
});

function resetAll() {
  resetFiltersToDefault();
  GP.rotation   = 0; GP.flipX = 1; GP.flipY = 1; GP.zoom = 100;
  GP.sharpenPro = {amount:70, radius:2, threshold:4, enabled:false};
  GP.vignette   = {strength:0, enabled:false};
  zoomValueEl.textContent = '100%';
  resetAllSliders();
  renderImage();
  centerCanvas();
  saveHistory('Reset all');
  showToast('Adjustments restored to defaults.');
}

/* ────────────────────────────────────────────────────────────
   FIT TO SCREEN / CENTER
   ──────────────────────────────────────────────────────────── */
function fitToScreen() {
  if (!GP.imageLoaded) return;
  const cw = canvasWrapper.clientWidth  - 160;
  const ch = canvasWrapper.clientHeight - 160;
  const iw = GP.image.naturalWidth;
  const ih = GP.image.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih, 1);
  GP.zoom = Math.round(scale * 100);
  zoomValueEl.textContent = GP.zoom + '%';
  resizeCanvasToImage();
  centerCanvas();
  if (typeof drawRulers === 'function') drawRulers();
}
window.fitToScreen = fitToScreen;

function centerCanvas() {
  const stage = document.getElementById('canvasStage');
  if (!stage) return;
  canvasWrapper.scrollLeft = (stage.scrollWidth  - canvasWrapper.clientWidth)  / 2;
  canvasWrapper.scrollTop  = (stage.scrollHeight - canvasWrapper.clientHeight) / 2;
}
window.centerCanvas = centerCanvas;

/* ────────────────────────────────────────────────────────────
   CANVAS RESIZE
   ──────────────────────────────────────────────────────────── */
function resizeCanvasToImage() {
  if (!GP.imageLoaded) return;
  const scale   = GP.zoom / 100;
  const isRot90 = Math.abs(GP.rotation % 180) === 90;
  const dw = isRot90 ? GP.image.naturalHeight : GP.image.naturalWidth;
  const dh = isRot90 ? GP.image.naturalWidth  : GP.image.naturalHeight;
  canvas.width  = Math.round(dw * scale);
  canvas.height = Math.round(dh * scale);
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';
}
window.resizeCanvasToImage = resizeCanvasToImage;

/* ────────────────────────────────────────────────────────────
   PAN (middle mouse / space+drag)
   ──────────────────────────────────────────────────────────── */
let _panning = false, _panX = 0, _panY = 0, _scrollX = 0, _scrollY = 0;
let _spaceHeld = false;

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) {
    _spaceHeld = true;
    canvasWrapper.style.cursor = 'grab';
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    _spaceHeld = false;
    canvasWrapper.style.cursor = '';
  }
});

canvasWrapper.addEventListener('mousedown', e => {
  if (e.button === 1 || (e.button === 0 && _spaceHeld)) {
    _panning = true;
    _panX    = e.clientX;
    _panY    = e.clientY;
    _scrollX = canvasWrapper.scrollLeft;
    _scrollY = canvasWrapper.scrollTop;
    canvasWrapper.style.cursor = 'grabbing';
    e.preventDefault();
  }
});
window.addEventListener('mousemove', e => {
  if (!_panning) return;
  canvasWrapper.scrollLeft = _scrollX - (e.clientX - _panX);
  canvasWrapper.scrollTop  = _scrollY - (e.clientY - _panY);
});
window.addEventListener('mouseup', () => {
  if (_panning) {
    _panning = false;
    canvasWrapper.style.cursor = _spaceHeld ? 'grab' : '';
  }
});

/* ────────────────────────────────────────────────────────────
   SETTINGS PANEL
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Rulers toggle */
  document.getElementById('showRulers')?.addEventListener('change', function() {
    GP.settings.showRulers = this.checked;
    const ra = document.getElementById('rulerArea');
    const ry = document.getElementById('rulerY');
    if (ra) ra.style.display = this.checked ? '' : 'none';
    if (ry) ry.style.display = this.checked ? '' : 'none';
    if (this.checked && typeof drawRulers === 'function') drawRulers();
  });

  /* Ruler unit */
  document.getElementById('rulerUnit')?.addEventListener('change', function() {
    GP.settings.rulerUnit = this.value;
    if (typeof drawRulers === 'function') drawRulers();
  });

  /* DPI */
  document.getElementById('rulerDpi')?.addEventListener('change', function() {
    GP.settings.rulerDpi = +this.value || 96;
    if (typeof drawRulers === 'function') drawRulers();
  });

  /* Zoom step */
  document.getElementById('zoomStep')?.addEventListener('change', function() {
    GP.settings.zoomStep = +this.value || 10;
  });

  /* Auto-center zoom */
  document.getElementById('autoCenterZoom')?.addEventListener('change', function() {
    GP.settings.autoCenterZoom = this.checked;
  });

  /* Copy image button */
  document.getElementById('copyImageBtn')?.addEventListener('click', () => {
    if (typeof copyImageToClipboard === 'function') copyImageToClipboard();
  });
});
