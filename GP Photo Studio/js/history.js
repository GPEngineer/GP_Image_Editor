/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   history.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   STACK
   Max 50 steps to keep memory sane.
   Each entry is a serialised snapshot of GP state + raw
   ImageData so rotations/flips/crop are fully reversible.
   ========================================================== */
const HISTORY_LIMIT = 50;

let _stack = []; // array of snapshots
let _pointer = -1; // current position in stack

/* ==========================================================
   SNAPSHOT HELPERS
   ========================================================== */
function createSnapshot() {
  const canvas = document.getElementById("editorCanvas");

  return {
    /* filters & transform */
    filters: JSON.parse(JSON.stringify(GP.filters)),

    sharpenPro: JSON.parse(
      JSON.stringify(
        GP.sharpenPro || {
          amount: 70,
          radius: 2,
          threshold: 4,
          enabled: false,
        },
      ),
    ),

    rotation: GP.rotation,

    flipX: GP.flipX,
    flipY: GP.flipY,
    zoom: GP.zoom,

    /* raw pixel data so we can restore after destructive crop */
    imageData: GP.imageLoaded
      ? canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
      : null,
    imageWidth: GP.imageLoaded ? canvas.width : 0,
    imageHeight: GP.imageLoaded ? canvas.height : 0,

    /* keep a reference to the source image element */
    imageSrc: GP.imageLoaded ? GP.image.src : null,
  };
}

function restoreSnapshot(snap) {
  /* restore filters */
  GP.filters = JSON.parse(JSON.stringify(snap.filters));

  GP.sharpenPro = JSON.parse(
    JSON.stringify(
      snap.sharpenPro || {
        amount: 70,
        radius: 2,
        threshold: 4,
        enabled: false,
      },
    ),
  );

  GP.rotation = snap.rotation;

  GP.flipX = snap.flipX;
  GP.flipY = snap.flipY;
  GP.zoom = snap.zoom;

  /* sync sliders + labels */
  Object.entries(GP.filters).forEach(([name, value]) => {
    const slider = document.getElementById(name);
    const label = document.getElementById(name + "Value");
    if (slider) slider.value = value;
    if (label) label.textContent = value;
  });
  const proAmount = document.getElementById("proAmount");
  const proRadius = document.getElementById("proRadius");
  const proThreshold = document.getElementById("proThreshold");
  const proAmountValue = document.getElementById("proAmountValue");
  const proRadiusValue = document.getElementById("proRadiusValue");
  const proThresholdValue = document.getElementById("proThresholdValue");

  if (proAmount) {
    proAmount.value = GP.sharpenPro.amount;
    proAmountValue.textContent = GP.sharpenPro.amount;
  }

  if (proRadius) {
    proRadius.value = GP.sharpenPro.radius;
    proRadiusValue.textContent = GP.sharpenPro.radius;
  }

  if (proThreshold) {
    proThreshold.value = GP.sharpenPro.threshold;

    proThresholdValue.textContent = GP.sharpenPro.threshold;
  }

  
  document.getElementById("zoomValue").textContent = `${GP.zoom}%`;


  /* restore image */
  if (snap.imageSrc && snap.imageData) {
    /* if src matches current image, just put the pixels back */
    if (GP.imageLoaded && GP.image.src === snap.imageSrc) {
      const canvas = document.getElementById("editorCanvas");
      canvas.width = snap.imageWidth;
      canvas.height = snap.imageHeight;
      canvas.getContext("2d").putImageData(snap.imageData, 0, 0);

      /* re-apply CSS zoom */
      canvas.style.transform = `scale(${GP.zoom / 100})`;
      canvas.style.transformOrigin = "center center";
    } else {
      /* different image — reload from src then re-render */
      const img = new Image();
      img.onload = () => {
        GP.image = img;
        GP.imageLoaded = true;
        renderImage();
      };
      img.src = snap.imageSrc;
    }
  } else {
    renderImage();
  }
}

/* ==========================================================
   PUBLIC API
   ========================================================== */
function saveHistory() {
  /* drop any redo states above current pointer */
  _stack = _stack.slice(0, _pointer + 1);

  _stack.push(createSnapshot());

  if (_stack.length > HISTORY_LIMIT) {
    _stack.shift();
  }

  _pointer = _stack.length - 1;
  updateHistoryButtons();
}

function undo() {
  if (_pointer <= 0) return;
  _pointer--;
  restoreSnapshot(_stack[_pointer]);
  updateHistoryButtons();
}

function redo() {
  if (_pointer >= _stack.length - 1) return;
  _pointer++;
  restoreSnapshot(_stack[_pointer]);
  updateHistoryButtons();
}

/* ==========================================================
   BUTTON STATE
   ========================================================== */
function updateHistoryButtons() {
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  if (undoBtn) undoBtn.disabled = _pointer <= 0;
  if (redoBtn) redoBtn.disabled = _pointer >= _stack.length - 1;
}

/* ==========================================================
   BUTTON LISTENERS
   ========================================================== */
document.getElementById("undoBtn")?.addEventListener("click", undo);
document.getElementById("redoBtn")?.addEventListener("click", redo);

/* ==========================================================
   KEYBOARD SHORTCUTS  Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
   ========================================================== */
window.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  if (e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if (e.key === "y") {
    e.preventDefault();
    redo();
  }
  if (e.key === "z" && e.shiftKey) {
    e.preventDefault();
    redo();
  }
});

/* ==========================================================
   INIT — push initial empty state
   ========================================================== */
window.addEventListener("DOMContentLoaded", () => {
  updateHistoryButtons();
});

/* ==========================================================
   PUBLIC
   ========================================================== */
window.saveHistory = saveHistory;
window.undo = undo;
window.redo = redo;
