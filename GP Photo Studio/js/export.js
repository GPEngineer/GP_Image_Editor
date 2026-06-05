/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   export.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   STATE
   ========================================================== */
let _pendingFormat = null;   // 'jpg' | 'png' | 'webp' | 'tiff' | 'bmp'

/* ==========================================================
   DOM
   ========================================================== */
const qualityDialog   = document.getElementById("qualityDialog");
const qualitySlider   = document.getElementById("qualitySlider");
const qualityValueEl  = document.getElementById("qualityValue");
const qualityOkBtn    = document.getElementById("qualityOkBtn");
const qualityCancelBtn = document.getElementById("qualityCancelBtn");

/* ==========================================================
   QUALITY SLIDER SYNC
   ========================================================== */
qualitySlider?.addEventListener("input", () => {
  if (qualityValueEl) qualityValueEl.textContent = qualitySlider.value;
});

/* ==========================================================
   BUTTON LISTENERS
   ========================================================== */
document.getElementById("saveJpgBtn")?.addEventListener("click",  () => requestSave("jpg"));
document.getElementById("savePngBtn")?.addEventListener("click",  () => requestSave("png"));
document.getElementById("saveWebpBtn")?.addEventListener("click", () => requestSave("webp"));
document.getElementById("saveTiffBtn")?.addEventListener("click", () => requestSave("tiff"));
document.getElementById("saveBmpBtn")?.addEventListener("click",  () => requestSave("bmp"));

qualityOkBtn?.addEventListener("click",     confirmSave);
qualityCancelBtn?.addEventListener("click", cancelSave);

/* ==========================================================
   REQUEST SAVE  — show quality dialog for lossy formats
   ========================================================== */
function requestSave(format) {
  if (!GP.imageLoaded) {
    showToast("Load an image first.");
    return;
  }

  _pendingFormat = format;

  /* PNG is lossless — no quality dialog needed */
  if (format === "png") {
    performSave("png", 100);
    return;
  }

  /* show quality dialog */
  if (qualityDialog) qualityDialog.style.display = "block";
}

/* ==========================================================
   CONFIRM SAVE
   ========================================================== */
function confirmSave() {
  const quality = qualitySlider ? Number(qualitySlider.value) : 90;
  hideQualityDialog();
  if (_pendingFormat) performSave(_pendingFormat, quality);
  _pendingFormat = null;
}

function cancelSave() {
  hideQualityDialog();
  _pendingFormat = null;
}

function hideQualityDialog() {
  if (qualityDialog) qualityDialog.style.display = "none";
}

/* ==========================================================
   PERFORM SAVE
   ========================================================== */
function performSave(format, quality) {
  const canvas = getRenderedCanvas();
  const q      = quality / 100;

  switch (format) {
    case "jpg":  saveAsJpeg(canvas, q);  break;
    case "png":  saveAsPng(canvas);      break;
    case "webp": saveAsWebp(canvas, q);  break;
    case "tiff": saveAsTiff(canvas);     break;
    case "bmp":  saveAsBmp(canvas);      break;
  }
}

/* ==========================================================
   JPEG
   ========================================================== */
function saveAsJpeg(canvas, quality) {
  /* JPEG doesn't support alpha — flatten onto white */
  const flat = flattenToWhite(canvas);
  const dataURL = flat.toDataURL("image/jpeg", quality);
  triggerDownload(dataURL, "photo.jpg");
}

/* ==========================================================
   PNG
   ========================================================== */
function saveAsPng(canvas) {
  triggerDownload(canvas.toDataURL("image/png"), "photo.png");
}

/* ==========================================================
   WEBP
   ========================================================== */
function saveAsWebp(canvas, quality) {
  const dataURL = canvas.toDataURL("image/webp", quality);
  triggerDownload(dataURL, "photo.webp");
}

/* ==========================================================
   TIFF  (via UTIF library)
   ========================================================== */
function saveAsTiff(canvas) {
  if (typeof UTIF === "undefined") {
    showToast("TIFF library (UTIF) not loaded.");
    return;
  }

  const ctx      = canvas.getContext("2d");
  const imgData  = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tiffBuf  = UTIF.encodeImage(imgData.data, canvas.width, canvas.height);
  const blob     = new Blob([tiffBuf], { type: "image/tiff" });
  const url      = URL.createObjectURL(blob);

  triggerDownload(url, "photo.tiff");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ==========================================================
   BMP  (via bmp-js library)
   ========================================================== */
function saveAsBmp(canvas) {
  if (typeof BmpJs === "undefined" && typeof bmpJS === "undefined") {
    showToast("BMP library not loaded.");
    return;
  }

  const bmpLib  = typeof BmpJs !== "undefined" ? BmpJs : bmpJS;
  const ctx     = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const rawData = bmpLib.encode({
    data:   imgData.data,
    width:  canvas.width,
    height: canvas.height,
  });

  const blob = new Blob([rawData.data], { type: "image/bmp" });
  const url  = URL.createObjectURL(blob);

  triggerDownload(url, "photo.bmp");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ==========================================================
   HELPERS
   ========================================================== */

/** Flatten transparent canvas onto a white background (for JPEG). */
function flattenToWhite(src) {
  const tmp  = document.createElement("canvas");
  tmp.width  = src.width;
  tmp.height = src.height;
  const ctx  = tmp.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tmp.width, tmp.height);
  ctx.drawImage(src, 0, 0);
  return tmp;
}

/** Trigger a browser download from a dataURL or object URL. */
function triggerDownload(url, filename) {
  const a     = document.createElement("a");
  a.href      = url;
  a.download  = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ==========================================================
   TOAST  (lightweight notification)
   ========================================================== */
function showToast(msg, duration = 3000) {
  let toast = document.getElementById("gpToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "gpToast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: #1a2740;
      color: #dce8f5;
      border: 1px solid #243d5c;
      padding: 9px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,.5);
      transition: opacity .3s;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.style.opacity = "1";

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = "0";
  }, duration);
}

/* ==========================================================
   PUBLIC
   ========================================================== */
window.requestSave = requestSave;
window.showToast   = showToast;
