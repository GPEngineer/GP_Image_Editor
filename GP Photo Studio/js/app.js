/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   app.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   GLOBAL STATE
   ========================================================== */
window.GP = {
  image: null,
  imageLoaded: false,
  zoom: 100,
  rotation: 0,
  flipX: 1,
  flipY: 1,

  sharpenPro: {
    amount: 70,
    radius: 2,
    threshold: 4,
    enabled: false,
  },

  filters: {
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
  },
};

/* ==========================================================
   DOM REFS
   ========================================================== */
const imageLoader = document.getElementById("imageLoader");
const canvas = document.getElementById("editorCanvas");
const zoomValueEl = document.getElementById("zoomValue");
const dropHint = document.getElementById("dropHint");
const canvasWrapper = document.getElementById("canvasWrapper");
const imageInfo = document.getElementById("imageInfo");
const imageDimEl = document.getElementById("imageDimensions");
const fileNameDisp = document.getElementById("fileNameDisplay");

/* ==========================================================
   LOAD IMAGE — from <input>
   ========================================================== */
imageLoader.addEventListener("change", (e) => loadImageFile(e.target.files[0]));

function loadImageFile(file) {
  if (!file) return;
  fileNameDisp.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      GP.image = img;
      GP.imageLoaded = true;
      GP.zoom = 100;
      GP.rotation = 0;
      GP.flipX = 1;
      GP.flipY = 1;

      /* update info bar */
      imageDimEl.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      imageInfo.style.display = "";

      /* hide drop hint */
      dropHint.classList.add("hidden");

      /* resize canvas, fit to screen, render */
      resizeCanvasToImage();
      fitToScreen(); // auto-fit on first load
      renderImage();

      if (typeof saveHistory === "function") saveHistory();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ==========================================================
   DRAG & DROP on canvas wrapper
   ========================================================== */
canvasWrapper.addEventListener("dragover", (e) => {
  e.preventDefault();
  canvasWrapper.classList.add("drag-over");
});
canvasWrapper.addEventListener("dragleave", () =>
  canvasWrapper.classList.remove("drag-over"),
);
canvasWrapper.addEventListener("drop", (e) => {
  e.preventDefault();
  canvasWrapper.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    loadImageFile(file);
    imageLoader.value = ""; // reset so same file can be re-dropped
  }
});

/* also make the file-label button work */
document
  .querySelector(".file-upload-label")
  ?.addEventListener("click", () => imageLoader.click());

/* ==========================================================
   CANVAS RESIZE
   ========================================================== */
function resizeCanvasToImage() {
  if (!GP.imageLoaded) return;
  canvas.width = GP.image.naturalWidth;
  canvas.height = GP.image.naturalHeight;
}

/* ==========================================================
   ZOOM
   ========================================================== */
document.getElementById("zoomInBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.zoom = Math.min(GP.zoom + 10, 3200);
  updateZoom(true);
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.zoom = Math.max(GP.zoom - 10, 5);
  updateZoom(true);
});

document.getElementById("zoomResetBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.zoom = 100;
  updateZoom(true);
});

function updateZoom(center = false) {
  zoomValueEl.textContent = `${GP.zoom}%`;
  renderImage();
  if (center) centerCanvas();
}

/* ==========================================================
   FIT TO SCREEN
   ========================================================== */
document.getElementById("fitScreenBtn").addEventListener("click", fitToScreen);

function fitToScreen() {
  if (!GP.imageLoaded) return;
  const wrapper = canvasWrapper;
  const available_w = wrapper.clientWidth - 100;
  const available_h = wrapper.clientHeight - 100;
  const scale_x = available_w / GP.image.naturalWidth;
  const scale_y = available_h / GP.image.naturalHeight;
  const zoom = Math.floor(Math.min(scale_x, scale_y) * 100);
  GP.zoom = Math.max(5, Math.min(zoom, 3200));
  updateZoom(true);
}

/* ==========================================================
   CENTER CANVAS
   ========================================================== */
document
  .getElementById("centerScreenBtn")
  .addEventListener("click", () => centerCanvas());

function centerCanvas() {
  requestAnimationFrame(() => {
    canvasWrapper.scrollLeft =
      (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2;
    canvasWrapper.scrollTop =
      (canvasWrapper.scrollHeight - canvasWrapper.clientHeight) / 2;
  });
}

/* ==========================================================
   MIDDLE-MOUSE / SPACE+DRAG panning (canvas stage)
   ========================================================== */
let _panActive = false;
let _panStart = { x: 0, y: 0, sl: 0, st: 0 };

canvasWrapper.addEventListener("mousedown", (e) => {
  if ((e.button === 1) || (e.button === 0 && e.altKey)) {
    _panActive = true;
    _panStart = {
      x: e.clientX,
      y: e.clientY,
      sl: canvasWrapper.scrollLeft,
      st: canvasWrapper.scrollTop,
    };
    canvasWrapper.style.cursor = "grabbing";
    e.preventDefault();
  }
});

window.addEventListener("mousemove", (e) => {
  if (!_panActive) return;
  canvasWrapper.scrollLeft = _panStart.sl - (e.clientX - _panStart.x);
  canvasWrapper.scrollTop = _panStart.st - (e.clientY - _panStart.y);
});

window.addEventListener("mouseup", () => {
  _panActive = false;
  canvasWrapper.style.cursor = "";
});

/* Ctrl+Scroll zoom */
canvasWrapper.addEventListener(
  "wheel",
  (e) => {
    if (!GP.imageLoaded) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 10 : -10;
      GP.zoom = Math.max(5, Math.min(GP.zoom + delta, 3200));
      updateZoom(false);
    }
  },
  { passive: false },
);

/* ==========================================================
   ROTATION
   ========================================================== */
document.getElementById("rotateLeftBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.rotation -= 90;
  renderImage();
  saveHistory();
});

document.getElementById("rotateRightBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.rotation += 90;
  renderImage();
  saveHistory();
});

/* ==========================================================
   FLIP
   ========================================================== */
document.getElementById("flipHorizontalBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.flipX *= -1;
  renderImage();
  saveHistory();
});

document.getElementById("flipVerticalBtn").addEventListener("click", () => {
  if (!GP.imageLoaded) return;
  GP.flipY *= -1;
  renderImage();
  saveHistory();
});

/* ==========================================================
   RESET ALL
   ========================================================== */
document.getElementById("resetAllBtn").addEventListener("click", resetAll);

function resetAll() {
  GP.filters = {
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
  GP.rotation = 0;
  GP.flipX = 1;
  GP.flipY = 1;
  GP.zoom = 100;

  GP.sharpenPro = {
    amount: 70,
    radius: 2,
    threshold: 4,
    enabled: false,
  };

  zoomValueEl.textContent = "100%";
  resetAllSliders();
  renderImage();
  centerCanvas();
  if (typeof saveHistory === "function") saveHistory();
}

/* ==========================================================
   SLIDER RESET HELPER
   ========================================================== */
function resetAllSliders() {
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
  for (const [id, val] of Object.entries(defaults)) {
    const el = document.getElementById(id);
    const lbl = document.getElementById(`${id}Value`);
    if (el) el.value = val;
    if (lbl) lbl.textContent = val;
  }

  const proAmount = document.getElementById("proAmount");
  const proRadius = document.getElementById("proRadius");
  const proThreshold = document.getElementById("proThreshold");
  const proAmountValue = document.getElementById("proAmountValue");
  const proRadiusValue = document.getElementById("proRadiusValue");
  const proThresholdValue = document.getElementById("proThresholdValue");

  if (proAmount) {
    proAmount.value = 70;
    proAmountValue.textContent = 70;
  }

  if (proRadius) {
    proRadius.value = 2;
    proRadiusValue.textContent = 2;
  }

  if (proThreshold) {
    proThreshold.value = 4;
    proThresholdValue.textContent = 4;
  }
}

/* ==========================================================
   CROP UNSAVED WARNING
   — show warning when entering crop if there are active filters
   ========================================================== */
document.getElementById("startCropBtn")?.addEventListener("click", () => {
  const anyActive = Object.entries(GP.filters).some(([k, v]) => {
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
    return v !== defaults[k];
  });
  const warn = document.getElementById("cropUnsavedWarning");
  if (warn) warn.style.display = anyActive ? "" : "none";
});

/* ==========================================================
   INIT
   ========================================================== */
window.addEventListener("DOMContentLoaded", () => {
  console.log("GP Photo Studio 2.0 Canvas Edition — ready");
});
