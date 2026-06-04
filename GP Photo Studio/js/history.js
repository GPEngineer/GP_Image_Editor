/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   history.js
   ========================================================== */

"use strict";

/* ==========================================================
   HISTORY STORAGE
   ========================================================== */

GP.history = [];
GP.historyIndex = -1;

const MAX_HISTORY_STATES = 50;

/* ==========================================================
   SAVE HISTORY
   ========================================================== */

function saveHistory() {
  if (!GP.imageLoaded) {
    return;
  }

  const state = {
    imageSrc: GP.image.src,
    zoom: GP.zoom,
    rotation: GP.rotation,
    flipX: GP.flipX,
    flipY: GP.flipY,

    filters: {
      brightness: GP.filters.brightness,

      contrast: GP.filters.contrast,
      saturation: GP.filters.saturation,
      sharpness: GP.filters.sharpness,
      blur: GP.filters.blur,
      grayscale: GP.filters.grayscale,
      sepia: GP.filters.sepia,
      hue: GP.filters.hue,
      invert: GP.filters.invert,
      opacity: GP.filters.opacity,
    },
  };

  GP.history = GP.history.slice(0, GP.historyIndex + 1);
  GP.history.push(structuredClone(state));
  if (GP.history.length > MAX_HISTORY_STATES) {
    GP.history.shift();
  }
  GP.historyIndex = GP.history.length - 1;
  updateHistoryButtons();
}

/* ==========================================================
   RESTORE STATE
   ========================================================== */

function restoreHistoryState(state) {
  if (!state) {
    return;
  }

  const img = new Image();
  img.onload = () => {
    GP.image = img;
    GP.imageLoaded = true;
    GP.zoom = state.zoom;
    GP.rotation = state.rotation;
    GP.flipX = state.flipX;
    GP.flipY = state.flipY;
    GP.filters = structuredClone(state.filters);
    updateUIFromState();
    renderImage();
  };

  img.src = state.imageSrc;
}

/* ==========================================================
   UNDO
   ========================================================== */

function undo() {
  if (GP.historyIndex <= 0) {
    return;
  }

  GP.historyIndex--;
  restoreHistoryState(GP.history[GP.historyIndex]);
  updateHistoryButtons();
}

/* ==========================================================
   REDO
   ========================================================== */

function redo() {
  if (GP.historyIndex >= GP.history.length - 1) {
    return;
  }

  GP.historyIndex++;
  restoreHistoryState(GP.history[GP.historyIndex]);
  updateHistoryButtons();
}

/* ==========================================================
   UPDATE BUTTONS
   ========================================================== */

function updateHistoryButtons() {
  const undoBtn = document.getElementById("undoBtn");

  const redoBtn = document.getElementById("redoBtn");

  if (undoBtn) {
    undoBtn.disabled = GP.historyIndex <= 0;
  }

  if (redoBtn) {
    redoBtn.disabled = GP.historyIndex >= GP.history.length - 1;
  }
}

/* ==========================================================
   UI SYNCHRONIZATION
   ========================================================== */

function updateUIFromState() {
  const controls = [
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

  controls.forEach((name) => {
    const slider = document.getElementById(name);
    const label = document.getElementById(name + "Value");
    const value = GP.filters[name];

    if (slider) {
      slider.value = value;
    }

    if (label) {
      label.textContent = value;
    }
  });

  const zoomValue = document.getElementById("zoomValue");
  if (zoomValue) {
    zoomValue.textContent = GP.zoom + "%";
  }
}

/* ==========================================================
   INITIALIZE HISTORY EVENTS
   ========================================================== */

document.getElementById("undoBtn")?.addEventListener("click", undo);
document.getElementById("redoBtn")?.addEventListener("click", redo);

/* ==========================================================
   AUTO HISTORY SAVE
   ========================================================== */

/* ==========================================================
   INITIALIZATION
   ========================================================== */

window.addEventListener("DOMContentLoaded", () => {
  /*registerHistoryListeners();*/

  updateHistoryButtons();
});

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.saveHistory = saveHistory;

window.undo = undo;
window.redo = redo;
