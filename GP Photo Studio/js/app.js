/* ============================================================
   GP Photo Studio 2.1 — app.js  v4.0
   Stan globalny, ładowanie obrazu, zoom, pan, transform
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   STAN GLOBALNY
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
   REFERENCJE DOM
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
   MODAL POTWIERDZENIA
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
   OSTRZEŻENIE PRZY F5 / ZAMKNIĘCIU
   ──────────────────────────────────────────────────────────── */
window.addEventListener('beforeunload', e => {
  if (!GP.imageLoaded) return;
  e.preventDefault();
  e.returnValue = 'Masz niezapisaną pracę. Czy na pewno chcesz opuścić stronę?';
  return e.returnValue;
});

/* ────────────────────────────────────────────────────────────
   WYBÓR PLIKU — naprawa błędu podwójnego otwierania okna
   ──────────────────────────────────────────────────────────── */
document.getElementById('fileUploadLabel').addEventListener('click', e => {
  e.preventDefault();
  imageLoader.value = '';   // reset żeby ten sam plik dał się załadować ponownie
  imageLoader.click();
});

imageLoader.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) loadImageFile(file);
  // Reset wartości żeby event 'change' odpalił się nawet dla tego samego pliku
  imageLoader.value = '';
});

/* ────────────────────────────────────────────────────────────
   ŁADOWANIE OBRAZU
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

      if (typeof saveHistory === 'function') saveHistory('Załadowano plik');
      if (typeof drawRulers  === 'function') drawRulers();
      showToast(`✓ Załadowano: ${file.name}`);
    };
    img.onerror = () => showToast('❌ Nie można otworzyć pliku.');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ────────────────────────────────────────────────────────────
   WYCZYSZCZENIE OBRAZU
   ──────────────────────────────────────────────────────────── */
document.getElementById('clearImageBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) { showToast('Brak załadowanego obrazu.'); return; }
  showConfirm('Wyczyść obraz',
    'Spowoduje to usunięcie aktualnego obrazu z edytora. Niezapisane zmiany zostaną utracone. Kontynuować?',
    () => {
      GP.image       = null;
      GP.imageLoaded = false;
      GP.zoom        = 100;
      GP.rotation    = 0;
      GP.flipX       = 1;
      GP.flipY       = 1;

      fileNameDisp.textContent = 'Wybierz obraz…';
      imageInfo.style.display  = 'none';
      dropHint.classList.remove('hidden');

      const c = document.getElementById('editorCanvas');
      c.width = c.height = 1;
      c.getContext('2d').clearRect(0,0,1,1);
      c.style.transform = '';

      resetFiltersToDefault();
      resetAllSliders();
      if (typeof clearHistoryStack === 'function') clearHistoryStack();
      showToast('Obraz usunięty.');
    }, '🗑');
});

/* ────────────────────────────────────────────────────────────
   DRAG & DROP
   ──────────────────────────────────────────────────────────── */
canvasWrapper.addEventListener('dragover',  e => { e.preventDefault(); canvasWrapper.classList.add('drag-over'); });
canvasWrapper.addEventListener('dragleave', ()  => canvasWrapper.classList.remove('drag-over'));
canvasWrapper.addEventListener('drop', e => {
  e.preventDefault();
  canvasWrapper.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
});

/* ────────────────────────────────────────────────────────────
   ROZMIAR CANVASU
   ──────────────────────────────────────────────────────────── */
function resizeCanvasToImage() {
  if (!GP.imageLoaded) return;
  canvas.width  = GP.image.naturalWidth;
  canvas.height = GP.image.naturalHeight;
}

/* ────────────────────────────────────────────────────────────
   ZOOM
   ──────────────────────────────────────────────────────────── */
document.getElementById('zoomInBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.zoom = Math.min(GP.zoom + (GP.settings.zoomStep||10), 3200);
  updateZoom(GP.settings.autoCenterZoom);
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.zoom = Math.max(GP.zoom - (GP.settings.zoomStep||10), 5);
  updateZoom(GP.settings.autoCenterZoom);
});
document.getElementById('zoomResetBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.zoom = 100;
  updateZoom(true);
});

function updateZoom(center = false) {
  zoomValueEl.textContent = `${GP.zoom}%`;
  renderImage();
  if (center) centerCanvas();
  if (typeof drawRulers === 'function' && GP.settings.showRulers) drawRulers();
}

/* ────────────────────────────────────────────────────────────
   DOPASOWANIE DO EKRANU
   ──────────────────────────────────────────────────────────── */
document.getElementById('fitScreenBtn').addEventListener('click', fitToScreen);

function fitToScreen() {
  if (!GP.imageLoaded) return;
  const w  = canvasWrapper.clientWidth  - 100;
  const h  = canvasWrapper.clientHeight - 100;
  const sx = w / GP.image.naturalWidth;
  const sy = h / GP.image.naturalHeight;
  GP.zoom  = Math.max(5, Math.min(Math.floor(Math.min(sx, sy)*100), 3200));
  updateZoom(true);
}

/* ────────────────────────────────────────────────────────────
   CENTROWANIE
   ──────────────────────────────────────────────────────────── */
document.getElementById('centerScreenBtn').addEventListener('click', () => centerCanvas());

function centerCanvas() {
  requestAnimationFrame(() => {
    canvasWrapper.scrollLeft = (canvasWrapper.scrollWidth  - canvasWrapper.clientWidth)  / 2;
    canvasWrapper.scrollTop  = (canvasWrapper.scrollHeight - canvasWrapper.clientHeight) / 2;
  });
}

/* ────────────────────────────────────────────────────────────
   PRZESUWANIE (środkowy przycisk myszy lub Alt+LMB)
   ──────────────────────────────────────────────────────────── */
let _panActive = false;
let _panStart  = {x:0,y:0,sl:0,st:0};

canvasWrapper.addEventListener('mousedown', e => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    _panActive = true;
    _panStart  = {x:e.clientX,y:e.clientY,sl:canvasWrapper.scrollLeft,st:canvasWrapper.scrollTop};
    canvasWrapper.style.cursor = 'grabbing';
    e.preventDefault();
  }
});
window.addEventListener('mousemove', e => {
  if (!_panActive) return;
  canvasWrapper.scrollLeft = _panStart.sl - (e.clientX - _panStart.x);
  canvasWrapper.scrollTop  = _panStart.st - (e.clientY - _panStart.y);
});
window.addEventListener('mouseup', () => { _panActive = false; canvasWrapper.style.cursor = ''; });

/* Ctrl+Scroll = zoom */
canvasWrapper.addEventListener('wheel', e => {
  if (!GP.imageLoaded) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const d = e.deltaY < 0 ? (GP.settings.zoomStep||10) : -(GP.settings.zoomStep||10);
    GP.zoom = Math.max(5, Math.min(GP.zoom + d, 3200));
    updateZoom(false);
  }
}, {passive:false});

/* ────────────────────────────────────────────────────────────
   OBRÓT
   ──────────────────────────────────────────────────────────── */
document.getElementById('rotateLeftBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.rotation -= 90;
  renderImage(); saveHistory('Obrót w lewo');
});
document.getElementById('rotateRightBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.rotation += 90;
  renderImage(); saveHistory('Obrót w prawo');
});

/* ────────────────────────────────────────────────────────────
   LUSTRZANE ODBICIE
   ──────────────────────────────────────────────────────────── */
document.getElementById('flipHorizontalBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.flipX *= -1; renderImage(); saveHistory('Lustro poziome');
});
document.getElementById('flipVerticalBtn').addEventListener('click', () => {
  if (!GP.imageLoaded) return;
  GP.flipY *= -1; renderImage(); saveHistory('Lustro pionowe');
});

/* ────────────────────────────────────────────────────────────
   RESET WSZYSTKICH KOREKT
   ──────────────────────────────────────────────────────────── */
document.getElementById('resetAllBtn').addEventListener('click', () => {
  showConfirm('Resetuj korekty',
    'Spowoduje to przywrócenie wszystkich suwaków do wartości domyślnych. Kontynuować?',
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
  saveHistory('Reset wszystkiego');
  showToast('Korekty przywrócone do domyślnych.');
}

function resetFiltersToDefault() {
  GP.filters = {
    brightness:100, contrast:100, saturation:100,
    sharpness:0, blur:0, grayscale:0, sepia:0, hue:0, invert:0, opacity:100
  };
}

function resetAllSliders() {
  const defaults = {brightness:100,contrast:100,saturation:100,sharpness:0,blur:0,grayscale:0,sepia:0,hue:0,invert:0,opacity:100};
  for (const [id,val] of Object.entries(defaults)) {
    const el  = document.getElementById(id);
    const lbl = document.getElementById(`${id}Value`);
    if (el)  el.value        = val;
    if (lbl) lbl.textContent = val;
  }
  const map = {proAmount:[70,'proAmountValue'], proRadius:[2,'proRadiusValue'], proThreshold:[4,'proThresholdValue'], vignetteStrength:[0,'vignetteValue']};
  for (const [id,[val,lblId]] of Object.entries(map)) {
    const el  = document.getElementById(id);
    const lbl = document.getElementById(lblId);
    if (el)  el.value        = val;
    if (lbl) lbl.textContent = val;
  }
}

/* ────────────────────────────────────────────────────────────
   USTAWIENIA
   ──────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('showRulers').addEventListener('change', e => {
    GP.settings.showRulers = e.target.checked;
    const rw = document.getElementById('rulerWrap');
    rw.style.display = e.target.checked ? 'grid' : 'none';
    if (e.target.checked && typeof drawRulers === 'function') drawRulers();
  });
  document.getElementById('rulerUnit').addEventListener('change', e => {
    GP.settings.rulerUnit = e.target.value;
    if (typeof drawRulers === 'function') drawRulers();
  });
  document.getElementById('rulerDpi').addEventListener('change', e => {
    GP.settings.rulerDpi = Number(e.target.value) || 96;
    if (typeof drawRulers === 'function') drawRulers();
  });
  document.getElementById('zoomStep').addEventListener('change', e => {
    GP.settings.zoomStep = Number(e.target.value);
  });
  document.getElementById('autoCenterZoom').addEventListener('change', e => {
    GP.settings.autoCenterZoom = e.target.checked;
  });
  console.log('GP Photo Studio 2.1 — gotowy');
});

/* ────────────────────────────────────────────────────────────
   EKSPORT PUBLICZNY
   ──────────────────────────────────────────────────────────── */
window.loadImageFile         = loadImageFile;
window.fitToScreen           = fitToScreen;
window.updateZoom            = updateZoom;
window.centerCanvas          = centerCanvas;
window.resizeCanvasToImage   = resizeCanvasToImage;
window.resetFiltersToDefault = resetFiltersToDefault;
window.resetAllSliders       = resetAllSliders;
window.resetAll              = resetAll;

/* ════════════════════════════════════════════════════════════
   TRANSFORM — Apply / Cancel
   (snapshot stanu przed transformacją, przywróć przy Cancel)
   ════════════════════════════════════════════════════════════ */
let _transformSnap = null;

document.addEventListener('DOMContentLoaded', () => {
  /* Snapshot przy każdym otwarciu sekcji Transform */
  document.querySelector('#mainToolbar')?.closest('.app-layout')
    ?.querySelectorAll('details').forEach(d => {
      if (d.querySelector('#transformApplyBtn')) {
        d.addEventListener('toggle', () => {
          if (d.open) _transformSnap = {
            rotation:GP.rotation, flipX:GP.flipX, flipY:GP.flipY
          };
        });
      }
    });

  /* Wygodniej — snapshot przy każdym kliknięciu przycisku obrótu/lustra */
  ['rotateLeftBtn','rotateRightBtn','flipHorizontalBtn','flipVerticalBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('mousedown', () => {
      if (!_transformSnap) _transformSnap = { rotation:GP.rotation, flipX:GP.flipX, flipY:GP.flipY };
    }, true);
  });

  document.getElementById('transformApplyBtn')?.addEventListener('click', () => {
    if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
    _transformSnap = { rotation:GP.rotation, flipX:GP.flipX, flipY:GP.flipY };
    saveHistory('Transform');
    showToast('✓ Transform applied.');
  });

  document.getElementById('transformCancelBtn')?.addEventListener('click', () => {
    if (_transformSnap) {
      GP.rotation = _transformSnap.rotation;
      GP.flipX    = _transformSnap.flipX;
      GP.flipY    = _transformSnap.flipY;
      renderImage();
    }
    _transformSnap = null;
    showToast('Transform cancelled.');
  });

  /* ══ OCR copy / clear buttons ══ */
  document.getElementById('ocrCopyBtn')?.addEventListener('click', () => {
    const out = document.getElementById('ocrOutput');
    if (!out || !out.value) { showToast('Nothing to copy.'); return; }
    navigator.clipboard?.writeText(out.value)
      .then(() => showToast('✓ Text copied to clipboard.'))
      .catch(() => { out.select(); document.execCommand('copy'); showToast('✓ Copied.'); });
  });
  document.getElementById('ocrClearBtn')?.addEventListener('click', () => {
    const out = document.getElementById('ocrOutput');
    if (out) out.value = '';
  });

  /* ══ Right Panel toggle ══ */
  document.getElementById('rightPanelToggle')?.addEventListener('click', () => {
    const rp  = document.getElementById('rightPanel');
    const btn = document.getElementById('rightPanelToggle');
    rp.classList.toggle('collapsed');
    btn.textContent = rp.classList.contains('collapsed') ? '›' : '‹';
  });

  /* ══ Sharpen Pro — reset przyciski ══ */
  document.getElementById('resetProAmount')?.addEventListener('click', () => {
    const sl = document.getElementById('proAmount'); const lb = document.getElementById('proAmountValue');
    if (sl) sl.value = 70; if (lb) lb.textContent = 70;
  });
  document.getElementById('resetProRadius')?.addEventListener('click', () => {
    const sl = document.getElementById('proRadius'); const lb = document.getElementById('proRadiusValue');
    if (sl) sl.value = 2; if (lb) lb.textContent = 2;
  });
  document.getElementById('resetProThreshold')?.addEventListener('click', () => {
    const sl = document.getElementById('proThreshold'); const lb = document.getElementById('proThresholdValue');
    if (sl) sl.value = 4; if (lb) lb.textContent = 4;
  });

  /* ══ Vignette — reset ══ */
  document.getElementById('resetVignette')?.addEventListener('click', () => {
    const sl = document.getElementById('vignetteStrength'); const lb = document.getElementById('vignetteValue');
    if (sl) sl.value = 0; if (lb) lb.textContent = 0;
    GP.vignette = { strength:0, enabled:false };
    renderImage();
  });
});
