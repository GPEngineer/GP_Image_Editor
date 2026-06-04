/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   ui.js
   ========================================================== */

"use strict";

/* ==========================================================
   FILTER DEFINITIONS
   ========================================================== */

const FILTER_IDS = [
  "brightness",
  "contrast",
  "saturation",
  "sharpness",
  "blur",
  "grayscale",
  "sepia",
  "hue",
  "invert",
  "opacity",
];

/* ==========================================================
   INITIALIZATION
   ========================================================== */

window.addEventListener("DOMContentLoaded", initializeUI);

function initializeUI() {
  initializeSliders();
  initializeResetButtons();
  initializeCollapsibleSections();
}

/* ==========================================================
   SLIDERS
   ========================================================== */

function initializeSliders() {
  FILTER_IDS.forEach((filterName) => {
    const slider = document.getElementById(filterName);

    const valueLabel = document.getElementById(filterName + "Value");

    if (!slider) {
      return;
    }

    slider.addEventListener("input", () => {
      const value = Number(slider.value);

      GP.filters[filterName] = value;

      if (valueLabel) {
        valueLabel.textContent = value;
      }

      renderImage();
    });

  });
}

/* ==========================================================
   RESET BUTTONS
   ========================================================== */

function initializeResetButtons() {
  const defaults = {
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

  document.querySelectorAll(".reset-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;

      if (!defaults.hasOwnProperty(target)) {
        return;
      }

      const value = defaults[target];

      const slider = document.getElementById(target);

      const label = document.getElementById(target + "Value");

      GP.filters[target] = value;

      if (slider) {
        slider.value = value;
      }

      if (label) {
        label.textContent = value;
      }

      renderImage();

      if (typeof saveHistory === "function") {
        saveHistory();
      }
    });
  });
}

/* ==========================================================
   COLLAPSIBLE SECTIONS
   ========================================================== */

function initializeCollapsibleSections() {
  document.querySelectorAll(".tool-section h2").forEach((header) => {
    header.style.cursor = "pointer";

    header.addEventListener("click", () => {
      toggleSection(header);
    });
  });
}

function toggleSection(header) {
  const section = header.parentElement;

  Array.from(section.children).forEach((child) => {
    if (child === header) return;

    const hidden =
      getComputedStyle(child).display === "none";

    child.style.display = hidden ? "" : "none";
  });
}

/* ==========================================================
   LABEL SYNCHRONIZATION
   ========================================================== */

function updateAllLabels() {
  FILTER_IDS.forEach((filterName) => {
    const slider = document.getElementById(filterName);

    const label = document.getElementById(filterName + "Value");

    if (!slider || !label) {
      return;
    }

    label.textContent = slider.value;
  });
}

/* ==========================================================
   SECTION HELPERS
   ========================================================== */

function collapseAllSections() {
  document.querySelectorAll(".tool-section h2").forEach((header) => {
    const section = header.parentElement;

    Array.from(section.children).forEach((child) => {
      if (child !== header) {
        child.style.display = "none";
      }
    });
  });
}

function expandAllSections() {
  document.querySelectorAll(".tool-section").forEach((section) => {
    Array.from(section.children).forEach((child) => {
      child.style.display = "";
    });
  });
}

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.updateAllLabels = updateAllLabels;
window.collapseAllSections = collapseAllSections;
window.expandAllSections = expandAllSections;
