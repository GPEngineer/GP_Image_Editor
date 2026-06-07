/* ============================================================
   GP Photo Studio 2.1 — ui.js  v4.0
   Suwaki filtrów, sekcja Basic Adjustments, Sharpen Pro, Vignette
   ============================================================ */
"use strict";

const FILTER_DEFAULTS = {
  brightness:100, contrast:100, saturation:100,
  sharpness:0, blur:0, grayscale:0,
  sepia:0, hue:0, invert:0, opacity:100
};

document.addEventListener('DOMContentLoaded', () => {
  /* wszystkie <details> domyślnie zwinięte */
  document.querySelectorAll('details').forEach(d => d.removeAttribute('open'));

  initSliders();
  initResetButtons();
  initBasicSectionActions();
  initSharpenProUI();
  initVignetteUI();
});

/* ────────────────────────────────────────────────────────────
   SUWAKI — live preview
   ──────────────────────────────────────────────────────────── */
function initSliders() {
  Object.keys(FILTER_DEFAULTS).forEach(name => {
    const sl = document.getElementById(name);
    const lb = document.getElementById(name + 'Value');
    if (!sl) return;
    sl.addEventListener('input', () => {
      const v = Number(sl.value);
      GP.filters[name] = v;
      if (lb) lb.textContent = v;
      renderImage();
    });
    /* zapis historii dopiero po puszczeniu suwaka */
    sl.addEventListener('change', () => {
      if (typeof saveHistory === 'function') saveHistory(`${name.charAt(0).toUpperCase()+name.slice(1)} adjust`);
    });
  });
}

/* ────────────────────────────────────────────────────────────
   PRZYCISKI RESET (pojedynczy filtr)
   ──────────────────────────────────────────────────────────── */
function initResetButtons() {
  document.querySelectorAll('.reset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!(target in FILTER_DEFAULTS)) return;
      const val = FILTER_DEFAULTS[target];
      const sl  = document.getElementById(target);
      const lb  = document.getElementById(target + 'Value');
      GP.filters[target] = val;
      if (sl) sl.value        = val;
      if (lb) lb.textContent  = val;
      renderImage();
      if (typeof saveHistory === 'function') saveHistory(`Reset ${target}`);
    });
  });
}

/* ────────────────────────────────────────────────────────────
   BASIC ADJUSTMENTS — Apply / Cancel
   ──────────────────────────────────────────────────────────── */
let _basicSnap = null;

function initBasicSectionActions() {
  const sec = document.getElementById('basicSection');
  if (!sec) return;

  sec.addEventListener('toggle', () => {
    if (sec.open) _basicSnap = JSON.parse(JSON.stringify(GP.filters));
  });

  document.getElementById('basicApplyBtn')?.addEventListener('click', () => {
    if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
    _basicSnap = JSON.parse(JSON.stringify(GP.filters));
    if (typeof saveHistory === 'function') saveHistory('Basic Adjustments');
    showToast('✓ Basic Adjustments applied.');
  });

  document.getElementById('basicCancelBtn')?.addEventListener('click', () => {
    if (_basicSnap) {
      GP.filters = JSON.parse(JSON.stringify(_basicSnap));
      Object.entries(GP.filters).forEach(([k,v]) => {
        const sl = document.getElementById(k);
        const lb = document.getElementById(k+'Value');
        if (sl) sl.value       = v;
        if (lb) lb.textContent = v;
      });
      renderImage();
    }
    showToast('Basic Adjustments cancelled.');
  });
}

/* ────────────────────────────────────────────────────────────
   SHARPEN PRO
   ──────────────────────────────────────────────────────────── */
function initSharpenProUI() {
  const amt  = document.getElementById('proAmount');
  const rad  = document.getElementById('proRadius');
  const thr  = document.getElementById('proThreshold');
  const aLbl = document.getElementById('proAmountValue');
  const rLbl = document.getElementById('proRadiusValue');
  const tLbl = document.getElementById('proThresholdValue');

  amt?.addEventListener('input',  () => { aLbl.textContent = amt.value; });
  rad?.addEventListener('input',  () => { rLbl.textContent = rad.value; });
  thr?.addEventListener('input',  () => { tLbl.textContent = thr.value; });

  document.getElementById('applySharpenProBtn')?.addEventListener('click', () => {
    if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
    GP.sharpenPro = { amount:+amt.value, radius:+rad.value, threshold:+thr.value, enabled:true };
    renderImage();
    if (typeof saveHistory === 'function') saveHistory('Sharpen Pro');
    showToast('✓ Sharpen Pro applied.');
  });

  document.getElementById('cancelSharpenProBtn')?.addEventListener('click', () => {
    GP.sharpenPro = { amount:70, radius:2, threshold:4, enabled:false };
    if (amt)  { amt.value  = 70; aLbl.textContent = 70; }
    if (rad)  { rad.value  = 2;  rLbl.textContent = 2;  }
    if (thr)  { thr.value  = 4;  tLbl.textContent = 4;  }
    renderImage();
    showToast('Sharpen Pro cancelled.');
  });
}

/* ────────────────────────────────────────────────────────────
   VIGNETTE
   ──────────────────────────────────────────────────────────── */
function initVignetteUI() {
  const sl  = document.getElementById('vignetteStrength');
  const lb  = document.getElementById('vignetteValue');

  sl?.addEventListener('input', () => {
    lb.textContent       = sl.value;
    GP.vignette.strength = +sl.value;
    GP.vignette.enabled  = GP.vignette.strength > 0;
    renderImage();
  });

  document.getElementById('applyVignetteBtn')?.addEventListener('click', () => {
    if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
    GP.vignette = { strength:+(sl?.value||0), enabled:+(sl?.value||0) > 0 };
    renderImage();
    if (typeof saveHistory === 'function') saveHistory('Vignette');
    showToast('✓ Vignette applied.');
  });

  document.getElementById('cancelVignetteBtn')?.addEventListener('click', () => {
    GP.vignette = { strength:0, enabled:false };
    if (sl)  { sl.value = 0;  lb.textContent = 0; }
    renderImage();
    showToast('Vignette cancelled.');
  });
}

/* Public */
window.FILTER_DEFAULTS = FILTER_DEFAULTS;
