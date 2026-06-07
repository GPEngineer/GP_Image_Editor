/* ============================================================
   GP Photo Studio 2.1 — transform-rotate.js  v5.0
   Dowolny kąt obrotu (0–360°, 3 miejsca po przecinku)
   Przeliczenie na stopnie/minuty/sekundy (DMS)
   ============================================================ */
"use strict";

let _freeRotateSnap = 0;  // snapshot przy Apply/Cancel

document.addEventListener('DOMContentLoaded', () => {
  const slider   = document.getElementById('freeRotateSlider');
  const input    = document.getElementById('freeRotateInput');
  const valueLbl = document.getElementById('freeRotateValue');
  const dmsLbl   = document.getElementById('freeRotateDMS');
  const applyBtn = document.getElementById('transformApplyBtn');
  const cancelBtn= document.getElementById('transformCancelBtn');
  const resetBtn = document.getElementById('resetFreeRotate');

  if (!slider) return;

  /* Live update */
  function onSliderChange() {
    const deg = parseFloat(slider.value);
    syncRotate(deg, 'slider');
  }
  function onInputChange() {
    let deg = parseFloat(input.value);
    if (isNaN(deg)) deg = 0;
    deg = Math.max(0, Math.min(360, deg));
    syncRotate(deg, 'input');
  }

  slider.addEventListener('input',  onSliderChange);
  input.addEventListener('input',   onInputChange);
  input.addEventListener('blur',    onInputChange);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') onInputChange(); });

  resetBtn?.addEventListener('click', () => syncRotate(0, 'both'));

  /* Apply */
  applyBtn?.addEventListener('click', () => {
    if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
    _freeRotateSnap = GP.rotation;
    // rotation jest ustawiony live — Apply = commit + history
    saveHistory && saveHistory('Transform');
    showToast('✓ Transform applied.');
  });

  /* Cancel — przywróć stan sprzed sekcji */
  cancelBtn?.addEventListener('click', () => {
    syncRotate(0, 'both');
    // Przywróć snapshot flip też
    renderImage && renderImage();
    showToast('Transform cancelled.');
  });

  /* ── Funkcja synchronizacji ── */
  function syncRotate(deg, source) {
    deg = Math.max(0, Math.min(360, +deg));
    const degFixed = deg.toFixed(3);

    if (source !== 'slider' && slider) slider.value = deg;
    if (source !== 'input'  && input)  input.value  = degFixed;
    if (valueLbl) valueLbl.textContent = degFixed;
    if (dmsLbl)   dmsLbl.textContent   = decToDMS(deg);

    /* Ustaw rzeczywisty obrót — tylko swobodny (nie addytywny z Rotate L/R) */
    GP.freeRotation = deg;
    renderImage && renderImage();
  }

  window._syncFreeRotate = syncRotate;
});

/* ── Decimal degrees → DMS ── */
function decToDMS(dec) {
  const d   = Math.floor(dec);
  const mf  = (dec - d) * 60;
  const m   = Math.floor(mf);
  const s   = ((mf - m) * 60).toFixed(3);
  return `${d}° ${m}′ ${s}″`;
}

window.decToDMS = decToDMS;
