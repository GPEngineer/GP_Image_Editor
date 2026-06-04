/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   crop.js
   ========================================================== */

"use strict";

/* ==========================================================
   STATE
   ========================================================== */

let cropper = null;
let cropCanvas = null;
let cropImage = null;

/* ==========================================================
   ELEMENTS
   ========================================================== */

const startCropBtn = document.getElementById("startCropBtn");
const applyCropBtn = document.getElementById("applyCropBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const manualCropBtn = document.getElementById("applyManualCropBtn");

/* ==========================================================
   START CROP
   ========================================================== */

function startCrop() {
  if (!GP.imageLoaded) {
    return;
  }
  destroyCropper();
  const editorCanvas = document.getElementById("editorCanvas");
  cropCanvas = document.createElement("canvas");
  cropCanvas.width = editorCanvas.width;
  cropCanvas.height = editorCanvas.height;
  cropCanvas.style.maxWidth = "100%";
  cropCanvas.style.display = "block";
  const ctx = cropCanvas.getContext("2d");
  ctx.drawImage(editorCanvas, 0, 0);
  cropImage = document.createElement("img");
  cropImage.src = cropCanvas.toDataURL("image/png");
  cropImage.style.maxWidth = "100%";
  const wrapper = document.querySelector(".canvas-wrapper");
  wrapper.innerHTML = "";
  wrapper.appendChild(cropImage);
  cropper = new Cropper(cropImage, {
    viewMode: 1,
    autoCropArea: 0.8,
    movable: true,
    zoomable: true,
    scalable: true,
    rotatable: false,
    crop(event) {
      updateCropFields(event.detail);
    },
  });
}

/* ==========================================================
   UPDATE INPUTS
   ========================================================== */

function updateCropFields(data) {
  const x = document.getElementById("cropX");
  const y = document.getElementById("cropY");
  const width = document.getElementById("cropWidth");
  const height = document.getElementById("cropHeight");
  if (x) {
    x.value = Math.round(data.x);
  }
  if (y) {
    y.value = Math.round(data.y);
  }
  if (width) {
    width.value = Math.round(data.width);
  }
  if (height) {
    height.value = Math.round(data.height);
  }
}

/* ==========================================================
   APPLY CROP
   ========================================================== */

function applyCrop() {
  if (!cropper) {
    return;
  }
  const croppedCanvas = cropper.getCroppedCanvas();
  if (!croppedCanvas) {
    return;
  }
  const img = new Image();
  img.onload = () => {
    GP.image = img;
    GP.imageLoaded = true;
    destroyCropper();
    restoreEditorCanvas();
    renderImage();
    if (typeof saveHistory === "function") {
      saveHistory();
    }
  };
  img.src = croppedCanvas.toDataURL("image/png");
}

/* ==========================================================
   CANCEL CROP
   ========================================================== */

function cancelCrop() {
  destroyCropper();
  restoreEditorCanvas();
  renderImage();
}

/* ==========================================================
   MANUAL CROP
   ========================================================== */

function applyManualCrop() {
  if (!GP.imageLoaded) {
    return;
  }
  const x = parseInt(document.getElementById("cropX").value, 10);
  const y = parseInt(document.getElementById("cropY").value, 10);
  const width = parseInt(document.getElementById("cropWidth").value, 10);
  const height = parseInt(document.getElementById("cropHeight").value, 10);
  const sourceCanvas = document.getElementById("editorCanvas");
  const tempCanvas = document.createElement("canvas");

  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
    return;
  }
  if (width <= 0 || height <= 0) {
    return;
  }

  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext("2d");

const safeX = Math.max(0, Math.min(x, sourceCanvas.width - 1));
const safeY = Math.max(0, Math.min(y,sourceCanvas.height - 1));
const safeWidth = Math.min(width,sourceCanvas.width - safeX);
const safeHeight = Math.min(height,sourceCanvas.height - safeY);

  ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);
  const img = new Image();
  img.onload = () => {
    GP.image = img;
    GP.imageLoaded = true;
    renderImage();
    if (typeof saveHistory === "function") {
      saveHistory();
    }
  };
  img.src = tempCanvas.toDataURL("image/png");
}

/* ==========================================================
   DESTROY CROPPER
   ========================================================== */

function destroyCropper() {
  if (!cropper) {
    return;
  }
  cropper.destroy();
  cropper = null;
}

/* ==========================================================
   RESTORE CANVAS
   ========================================================== */

function restoreEditorCanvas() {
  const wrapper = document.querySelector(".canvas-wrapper");
  wrapper.innerHTML = "";
  const canvas = document.createElement("canvas");
  wrapper.appendChild(canvas);
}

/* ==========================================================
   BUTTON EVENTS
   ========================================================== */

startCropBtn?.addEventListener("click", startCrop);
applyCropBtn?.addEventListener("click", applyCrop);
cancelCropBtn?.addEventListener("click", cancelCrop);
manualCropBtn?.addEventListener("click", applyManualCrop);

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.startCrop = startCrop;
window.applyCrop = applyCrop;
window.cancelCrop = cancelCrop;
