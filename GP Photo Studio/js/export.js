/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   export.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   STATE
   ========================================================== */
let _pendingFormat = null; // 'jpg' | 'png' | 'webp' | 'tiff' | 'bmp'

/* ==========================================================
   DOM
   ========================================================== */
const qualityDialog = document.getElementById("qualityDialog");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValueEl = document.getElementById("qualityValue");
const qualityOkBtn = document.getElementById("qualityOkBtn");
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
document
  .getElementById("saveJpgBtn")
  ?.addEventListener("click", () => requestSave("jpg"));
document
  .getElementById("savePngBtn")
  ?.addEventListener("click", () => requestSave("png"));
document
  .getElementById("saveWebpBtn")
  ?.addEventListener("click", () => requestSave("webp"));
document
  .getElementById("saveTiffBtn")
  ?.addEventListener("click", () => requestSave("tiff"));
document
  .getElementById("saveBmpBtn")
  ?.addEventListener("click", () => requestSave("bmp"));
document
  .getElementById("saveGifBtn")
  ?.addEventListener("click", () => requestSave("gif"));

qualityOkBtn?.addEventListener("click", confirmSave);
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
  if (
    format === "png" ||
    format === "bmp" ||
    format === "gif" ||
    format === "tiff"
  ) {
    performSave(format, 100);
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
  const q = quality / 100;

  switch (format) {
    case "jpg":
      saveAsJpeg(canvas, q);
      break;
    case "png":
      saveAsPng(canvas);
      break;
    case "webp":
      saveAsWebp(canvas, q);
      break;
    case "tiff":
      saveAsTiff(canvas);
      break;
    case "gif":
      saveAsGif(canvas);
      break;
    case "bmp":
      saveAsBmp(canvas);
      break;
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
  if (!window.UTIF) {
    showToast("UTIF library not loaded.");
    return;
  }
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = UTIF.encodeImage(imageData.data, canvas.width, canvas.height);
  const blob = new Blob([buffer], {
    type: "image/tiff",
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "photo.tif");
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}

/* ==========================================================
   BMP  (via bmp-js library)
   ========================================================== */
function saveAsBmp(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  let offset = 0;

  /* ========= BMP HEADER ========= */

  view.setUint8(offset++, 0x42);
  view.setUint8(offset++, 0x4d);
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint32(offset, 54, true);
  offset += 4;

  /* ========= DIB HEADER ========= */

  view.setUint32(offset, 40, true);
  offset += 4;
  view.setInt32(offset, width, true);
  offset += 4;
  view.setInt32(offset, height, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 24, true);
  offset += 2;
  view.setUint32(offset, 0, true);
  offset += 4;
  view.setUint32(offset, pixelArraySize, true);
  offset += 4;
  view.setInt32(offset, 2835, true);
  offset += 4;
  view.setInt32(offset, 2835, true);
  offset += 4;
  view.setUint32(offset, 0, true);
  offset += 4;
  view.setUint32(offset, 0, true);
  offset += 4;

  /* ========= PIXELS ========= */

  const padding = rowSize - width * 3;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;
      const r = pixels[pos];
      const g = pixels[pos + 1];
      const b = pixels[pos + 2];
      view.setUint8(offset++, b);
      view.setUint8(offset++, g);
      view.setUint8(offset++, r);
    }

    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  const blob = new Blob([buffer], { type: "image/bmp" });
  const url = URL.createObjectURL(blob);

  triggerDownload(url, "photo.bmp");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ==========================================================
   GIF  (via GIF.js library)
   ========================================================== */

function saveAsGif(canvas) {
  if (!window.GIF) {
    showToast("GIF.js library not loaded.");
    return;
  }

  const gif = new GIF({
    workers: 2,
    quality: 10,
    workerScript: "libs/gif.worker.js",
  });

  gif.addFrame(canvas, {
    copy: true,
    delay: 100,
  });

  showToast("Generating GIF...");

  gif.on("finished", function (blob) {
    const url = URL.createObjectURL(blob);

    triggerDownload(url, "photo.gif");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);

    showToast("GIF saved.");
  });

  gif.render();
}

/* ==========================================================
   HELPERS
   ========================================================== */

/** Flatten transparent canvas onto a white background (for JPEG). */
function flattenToWhite(src) {
  const tmp = document.createElement("canvas");
  tmp.width = src.width;
  tmp.height = src.height;
  const ctx = tmp.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tmp.width, tmp.height);
  ctx.drawImage(src, 0, 0);
  return tmp;
}

/** Trigger a browser download from a dataURL or object URL. */
function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
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
window.showToast = showToast;
