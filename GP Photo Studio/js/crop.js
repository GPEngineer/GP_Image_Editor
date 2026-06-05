/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   crop.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   STATE
   ========================================================== */
let _cropper     = null;
let _cropActive  = false;
let _cropTempImg = null;   // <img> element used by Cropper.js

/* ==========================================================
   DOM
   ========================================================== */
const startCropBtn      = document.getElementById("startCropBtn");
const applyCropBtn      = document.getElementById("applyCropBtn");
const cancelCropBtn     = document.getElementById("cancelCropBtn");
const applyManualBtn    = document.getElementById("applyManualCropBtn");
const cropXInput        = document.getElementById("cropX");
const cropYInput        = document.getElementById("cropY");
const cropWInput        = document.getElementById("cropWidth");
const cropHInput        = document.getElementById("cropHeight");

/* ==========================================================
   START CROP
   Renders current canvas into a temp <img>, overlays Cropper.js
   ========================================================== */
startCropBtn?.addEventListener("click", startCrop);

function startCrop() {
  if (!GP.imageLoaded) {
    alert("Load an image first.");
    return;
  }
  if (_cropActive) return;

  _cropActive = true;

  const canvas = document.getElementById("editorCanvas");

  /* create a temp img from current canvas state */
  _cropTempImg = document.createElement("img");
  _cropTempImg.src = canvas.toDataURL("image/png");

  /* position the temp img on top of the canvas */
  _cropTempImg.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${canvas.width}px;
    height: ${canvas.height}px;
    z-index: 100;
    transform: scale(${GP.zoom / 100});
    transform-origin: top left;
  `;

  const stage = document.getElementById("canvasStage");
  stage.style.position = "relative";
  stage.appendChild(_cropTempImg);

  /* hide the real canvas while cropper is active */
  canvas.style.visibility = "hidden";

  /* init Cropper.js */
  _cropper = new Cropper(_cropTempImg, {
    viewMode: 1,
    autoCropArea: 0.8,
    movable: false,
    rotatable: false,
    scalable: false,
    zoomable: false,
    crop(event) {
      /* keep numeric inputs in sync */
      if (cropXInput) cropXInput.value = Math.round(event.detail.x);
      if (cropYInput) cropYInput.value = Math.round(event.detail.y);
      if (cropWInput) cropWInput.value = Math.round(event.detail.width);
      if (cropHInput) cropHInput.value = Math.round(event.detail.height);
    },
  });
}

/* ==========================================================
   APPLY CROP
   ========================================================== */
applyCropBtn?.addEventListener("click", applyCrop);

function applyCrop() {
  if (!_cropActive || !_cropper) return;

  const croppedCanvas = _cropper.getCroppedCanvas();
  if (!croppedCanvas) { cancelCrop(); return; }

  /* replace the source image with the cropped result */
  const newImg = new Image();
  newImg.onload = () => {
    GP.image        = newImg;
    GP.imageLoaded  = true;
    GP.rotation     = 0;
    GP.flipX        = 1;
    GP.flipY        = 1;

    const canvas = document.getElementById("editorCanvas");
    canvas.width  = newImg.naturalWidth;
    canvas.height = newImg.naturalHeight;
    canvas.style.visibility = "";

    /* update dimension info */
    const dimEl = document.getElementById("imageDimensions");
    if (dimEl) dimEl.textContent = `${newImg.naturalWidth} × ${newImg.naturalHeight} px`;

    _cleanupCropper();
    renderImage();
    saveHistory();
  };
  newImg.src = croppedCanvas.toDataURL("image/png");
}

/* ==========================================================
   CANCEL CROP
   ========================================================== */
cancelCropBtn?.addEventListener("click", cancelCrop);

function cancelCrop() {
  if (!_cropActive) return;
  const canvas = document.getElementById("editorCanvas");
  canvas.style.visibility = "";
  _cleanupCropper();
}

/* ==========================================================
   MANUAL / NUMERIC CROP
   ========================================================== */
applyManualBtn?.addEventListener("click", applyManualCrop);

function applyManualCrop() {
  if (!GP.imageLoaded) return;

  const x = parseInt(cropXInput?.value) || 0;
  const y = parseInt(cropYInput?.value) || 0;
  const w = parseInt(cropWInput?.value) || 100;
  const h = parseInt(cropHInput?.value) || 100;

  const src = document.getElementById("editorCanvas");

  /* clamp to canvas size */
  const cx = Math.max(0, Math.min(x, src.width  - 1));
  const cy = Math.max(0, Math.min(y, src.height - 1));
  const cw = Math.max(1, Math.min(w, src.width  - cx));
  const ch = Math.max(1, Math.min(h, src.height - cy));

  /* extract region */
  const tmp  = document.createElement("canvas");
  tmp.width  = cw;
  tmp.height = ch;
  tmp.getContext("2d").drawImage(src, cx, cy, cw, ch, 0, 0, cw, ch);

  const newImg = new Image();
  newImg.onload = () => {
    GP.image        = newImg;
    GP.imageLoaded  = true;
    GP.rotation     = 0;
    GP.flipX        = 1;
    GP.flipY        = 1;

    const canvas = document.getElementById("editorCanvas");
    canvas.width  = cw;
    canvas.height = ch;

    const dimEl = document.getElementById("imageDimensions");
    if (dimEl) dimEl.textContent = `${cw} × ${ch} px`;

    renderImage();
    saveHistory();
  };
  newImg.src = tmp.toDataURL("image/png");
}

/* ==========================================================
   INTERNAL CLEANUP
   ========================================================== */
function _cleanupCropper() {
  if (_cropper) {
    _cropper.destroy();
    _cropper = null;
  }
  if (_cropTempImg && _cropTempImg.parentNode) {
    _cropTempImg.parentNode.removeChild(_cropTempImg);
    _cropTempImg = null;
  }
  _cropActive = false;
}

/* ==========================================================
   PUBLIC
   ========================================================== */
window.startCrop       = startCrop;
window.applyCrop       = applyCrop;
window.cancelCrop      = cancelCrop;
window.applyManualCrop = applyManualCrop;
