/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   export.js
   ========================================================== */

"use strict";

/* ==========================================================
   QUALITY DIALOG
   ========================================================== */

let pendingExportFormat = null;

const qualityDialog = document.getElementById("qualityDialog");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");
const qualityOkBtn = document.getElementById("qualityOkBtn");
const qualityCancelBtn = document.getElementById("qualityCancelBtn");

/* ==========================================================
   QUALITY EVENTS
   ========================================================== */

if (qualitySlider) {
  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value;
  });
}

if (qualityOkBtn) {
  qualityOkBtn.addEventListener("click", () => {
    const quality = Number(qualitySlider.value) / 100;
    qualityDialog.style.display = "none";
    exportWithQuality(pendingExportFormat, quality);
    pendingExportFormat = null;
  });
}

if (qualityCancelBtn) {
  qualityCancelBtn.addEventListener("click", () => {
    qualityDialog.style.display = "none";
    pendingExportFormat = null;
  });
}

/* ==========================================================
   CANVAS
   ========================================================== */

function getEditorCanvas() {
  return document.getElementById("editorCanvas");
}

/* ==========================================================
   EXPORT ENTRY
   ========================================================== */

function exportImage(format) {
  if (!GP.imageLoaded) {
    return;
  }

  if (format === "jpg" || format === "webp") {
    pendingExportFormat = format;
    qualityDialog.style.display = "block";
    return;
  }

  exportWithQuality(format, 1.0);
}

/* ==========================================================
   EXPORT WITH QUALITY
   ========================================================== */

function exportWithQuality(format, quality) {
  const canvas = getEditorCanvas();

  if (!canvas) {
    return;
  }
  switch (format) {
    case "png":
      exportPNG(canvas);
      break;
    case "jpg":
      exportJPG(canvas, quality);
      break;
    case "webp":
      exportWEBP(canvas, quality);
      break;
    case "tiff":
      exportTIFF(canvas);
      break;
    case "bmp":
      exportBMP(canvas);
      break;
  }
}

/* ==========================================================
   DOWNLOAD
   ========================================================== */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ==========================================================
   PNG
   ========================================================== */

function exportPNG(canvas) {
  canvas.toBlob((blob) => {
    downloadBlob(blob, "image.png");
  }, "image/png");
}

/* ==========================================================
   JPG
   ========================================================== */

function exportJPG(canvas, quality) {
  const jpegData = canvas.toDataURL("image/jpeg", quality);

  if (typeof piexif !== "undefined") {
    try {
      if (
        GP.image &&
        GP.image.src &&
        GP.image.src.startsWith("data:image/jpeg")
      ) {
        const exif = piexif.load(GP.image.src);
        const exifBytes = piexif.dump(exif);
        const finalData = piexif.insert(exifBytes, jpegData);
        saveDataURL(finalData, "image.jpg");
        return;
      }
    } catch (e) {
      console.warn("EXIF copy failed", e);
    }
  }

  saveDataURL(jpegData, "image.jpg");
}

/* ==========================================================
   WEBP
   ========================================================== */

function exportWEBP(canvas, quality) {
  const data = canvas.toDataURL("image/webp", quality);
  saveDataURL(data, "image.webp");
}

/* ==========================================================
   TIFF
   ========================================================== */

function exportTIFF(canvas) {
  if (typeof UTIF === "undefined") {
    alert("UTIF.js not loaded");
    return;
  }
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = UTIF.encodeImage(imageData.data, canvas.width, canvas.height);
  const blob = new Blob([buffer], {
    type: "image/tiff",
  });
  downloadBlob(blob, "image.tiff");
}

/* ==========================================================
   BMP
   ========================================================== */

function exportBMP(canvas) {
  if (typeof bmp === "undefined") {
    alert("bmp-js library not loaded");
    return;
  }
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bmpData = bmp.encode({
    data: imageData.data,
    width: canvas.width,
    height: canvas.height,
  });
  const blob = new Blob([bmpData.data], {
    type: "image/bmp",
  });
  downloadBlob(blob, "image.bmp");
}

/* ==========================================================
   SAVE DATA URL
   ========================================================== */

function saveDataURL(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ==========================================================
   BUTTON EVENTS
   ========================================================== */

document.getElementById("savePngBtn")?.addEventListener("click", () => {
  exportImage("png");
});
document.getElementById("saveJpgBtn")?.addEventListener("click", () => {
  exportImage("jpg");
});
document.getElementById("saveWebpBtn")?.addEventListener("click", () => {
  exportImage("webp");
});
document.getElementById("saveTiffBtn")?.addEventListener("click", () => {
  exportImage("tiff");
});
document.getElementById("saveBmpBtn")?.addEventListener("click", () => {
  exportImage("bmp");
});

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.exportImage = exportImage;
