/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   ui.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   FILTER IDS + DEFAULTS
   ========================================================== */
const FILTER_DEFAULTS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hue: 0,
  invert: 0,
  opacity: 100,
};

/* ==========================================================
   INIT
   ========================================================== */
window.addEventListener("DOMContentLoaded", initializeUI);

function initializeUI() {
  initSliders();
  initResetButtons();
}

/* ==========================================================
   SLIDERS
   ========================================================== */
function initSliders() {
  Object.keys(FILTER_DEFAULTS).forEach((name) => {
    const slider = document.getElementById(name);
    const label = document.getElementById(name + "Value");
    if (!slider) return;

    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      GP.filters[name] = value;
      if (label) label.textContent = value;
      renderImage();
    });

    /* also save history on mouseup / touchend (not on every tick) */
    slider.addEventListener("change", () => {
      if (typeof saveHistory === "function") saveHistory();
    });
  });
}

/* ==========================================================
   RESET BUTTONS  (individual per-filter)
   ========================================================== */
function initResetButtons() {
  document.querySelectorAll(".reset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (!(target in FILTER_DEFAULTS)) return;

      const value = FILTER_DEFAULTS[target];
      const slider = document.getElementById(target);
      const label = document.getElementById(target + "Value");

      GP.filters[target] = value;
      if (slider) slider.value = value;
      if (label) label.textContent = value;

      renderImage();
      if (typeof saveHistory === "function") saveHistory();
    });
  });
}

/* ==========================================================
   HELPERS  (called externally by app.js etc.)
   ========================================================== */
function updateAllLabels() {
  Object.keys(FILTER_DEFAULTS).forEach((name) => {
    const slider = document.getElementById(name);
    const label = document.getElementById(name + "Value");
    if (slider && label) label.textContent = slider.value;
  });
}

/* ==========================================================
   PUBLIC
   ========================================================== */
window.updateAllLabels = updateAllLabels;
