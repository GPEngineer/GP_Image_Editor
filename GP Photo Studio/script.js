/* ==========================================================
   GP Image Editor — SCRIPT 3.1 (CLEANED)
   - single source of truth for rendering: renderCanvasWithFilters
   - JPG/PNG/WEBP via saveImageWithQuality
   - TIFF/BMP via saveAsTiff / saveAsBmp
   ========================================================== */

/* STATE */
let originalImage = null;
let imageLoaded = false;
let currentZoom = 100;
let cropper = null;

let rotation = 0;
let flipX = 1;
let flipY = 1;

let history = [];
let historyIndex = -1;

/* DOM ELEMENTS */
const imageLoader = document.getElementById("imageLoader");
const previewImage = document.getElementById("previewImage");

const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const saturationSlider = document.getElementById("saturation");
const blurSlider = document.getElementById("blur");
const grayscaleSlider = document.getElementById("grayscale");
const sepiaSlider = document.getElementById("sepia");
const hueSlider = document.getElementById("hue");
const invertSlider = document.getElementById("invert");
const opacitySlider = document.getElementById("opacity");
const sharpnessSlider = document.getElementById("sharpness");

const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const saturationValue = document.getElementById("saturationValue");
const blurValue = document.getElementById("blurValue");
const grayscaleValue = document.getElementById("grayscaleValue");
const sepiaValue = document.getElementById("sepiaValue");
const hueValue = document.getElementById("hueValue");
const invertValue = document.getElementById("invertValue");
const opacityValue = document.getElementById("opacityValue");
const sharpnessValue = document.getElementById("sharpnessValue");

const zoomValue = document.getElementById("zoomValue");

/* ==========================================================
   LOAD IMAGE
   ========================================================== */

imageLoader.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    originalImage = e.target.result;
    previewImage.src = originalImage;
    previewImage.style.display = "inline-block";

    imageLoaded = true;

    // reset transforms for new image
    rotation = 0;
    flipX = 1;
    flipY = 1;
    currentZoom = 100;

    applyFilters();
    saveHistory();
    centerImage();
  };

  reader.readAsDataURL(file);
});

/* ==========================================================
   APPLY FILTERS
   ========================================================== */

function applyFilters() {
  if (!imageLoaded) return;

  brightnessValue.textContent = brightnessSlider.value;
  contrastValue.textContent = contrastSlider.value;
  saturationValue.textContent = saturationSlider.value;
  blurValue.textContent = blurSlider.value;
  grayscaleValue.textContent = grayscaleSlider.value;
  sepiaValue.textContent = sepiaSlider.value;
  hueValue.textContent = hueSlider.value;
  invertValue.textContent = invertSlider.value;
  opacityValue.textContent = opacitySlider.value;
  sharpnessValue.textContent = sharpnessSlider.value;

  previewImage.style.filter = `
    brightness(${brightnessSlider.value}%)
    contrast(${contrastSlider.value}%)
    saturate(${saturationSlider.value}%)
    blur(${blurSlider.value}px)
    grayscale(${grayscaleSlider.value}%)
    sepia(${sepiaSlider.value}%)
    hue-rotate(${hueSlider.value}deg)
    invert(${invertSlider.value}%)
    opacity(${opacitySlider.value}%)
  `;

  previewImage.style.transform = `
    rotate(${rotation}deg)
    scale(${currentZoom / 100})
    scaleX(${flipX})
    scaleY(${flipY})
  `;
}

/* ==========================================================
   SLIDERS
   ========================================================== */

[
  brightnessSlider,
  contrastSlider,
  saturationSlider,
  blurSlider,
  grayscaleSlider,
  sepiaSlider,
  hueSlider,
  invertSlider,
  opacitySlider,
  sharpnessSlider,
].forEach((slider) => {
  slider.addEventListener("input", () => {
    applyFilters();
    saveHistory();
  });
});

/* ==========================================================
   RESET SINGLE
   ========================================================== */

document.querySelectorAll(".reset-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    const slider = document.getElementById(target);

    const defaults = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sharpness: 0,
      grayscale: 0,
      sepia: 0,
      hue: 0,
      invert: 0,
      opacity: 100,
    };

    if (slider && defaults.hasOwnProperty(target)) {
      slider.value = defaults[target];
      applyFilters();
      saveHistory();
    }
  });
});

/* ==========================================================
   RESET ALL
   ========================================================== */

document.getElementById("resetAllBtn").addEventListener("click", () => {
  brightnessSlider.value = 100;
  contrastSlider.value = 100;
  saturationSlider.value = 100;
  blurSlider.value = 0;
  grayscaleSlider.value = 0;
  sepiaSlider.value = 0;
  hueSlider.value = 0;
  invertSlider.value = 0;
  opacitySlider.value = 100;
  sharpnessSlider.value = 0;

  currentZoom = 100;
  rotation = 0;
  flipX = 1;
  flipY = 1;

  zoomValue.textContent = "100%";

  applyFilters();
  saveHistory();
  centerImage();
});

/* ==========================================================
   ZOOM
   ========================================================== */

document.getElementById("zoomInBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  currentZoom += 10;
  updateZoom();
});

document.getElementById("zoomResetBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  currentZoom = 100;
  updateZoom();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  currentZoom -= 10;
  if (currentZoom < 10) currentZoom = 10;

  updateZoom();
});

function updateZoom() {
  applyFilters();
  zoomValue.textContent = `${currentZoom}%`;
  centerImage();
}

/* ==========================================================
   FIT SCREEN
   ========================================================== */

document.getElementById("fitScreenBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  const container = document.querySelector(".preview-container");
  const img = previewImage;

  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  const containerWidth = container.clientWidth - 60;
  const containerHeight = container.clientHeight - 60;

  const scaleX = containerWidth / naturalWidth;
  const scaleY = containerHeight / naturalHeight;

  let newZoom = Math.floor(Math.min(scaleX, scaleY) * 100);
  if (newZoom > 100) newZoom = 100;

  currentZoom = newZoom;

  updateZoom();
  centerImage();
});

/* ==========================================================
   CENTER SCREEN
   ========================================================== */

function centerImage() {
  const container = document.querySelector(".preview-container");
  const inner = document.querySelector(".preview-inner");

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const innerWidth = inner.scrollWidth;
  const innerHeight = inner.scrollHeight;

  container.scrollLeft = (innerWidth - containerWidth) / 2;
  container.scrollTop = (innerHeight - containerHeight) / 2;
}

document.getElementById("centerScreenBtn").addEventListener("click", () => {
  centerImage();
});

/* ==========================================================
   HISTORY
   ========================================================== */

function saveHistory() {
  if (!imageLoaded) return;

  const state = {
    brightness: brightnessSlider.value,
    contrast: contrastSlider.value,
    saturation: saturationSlider.value,
    blur: blurSlider.value,
    grayscale: grayscaleSlider.value,
    sepia: sepiaSlider.value,
    hue: hueSlider.value,
    invert: invertSlider.value,
    opacity: opacitySlider.value,
    sharpness: sharpnessSlider.value,

    rotation: rotation,
    flipX: flipX,
    flipY: flipY,
    zoom: currentZoom,

    image: originalImage,
  };

  history.splice(historyIndex + 1);
  history.push(JSON.parse(JSON.stringify(state)));
  historyIndex = history.length - 1;
}

function restoreState(state) {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  brightnessSlider.value = state.brightness;
  contrastSlider.value = state.contrast;
  saturationSlider.value = state.saturation;
  blurSlider.value = state.blur;
  grayscaleSlider.value = state.grayscale;
  sepiaSlider.value = state.sepia;
  hueSlider.value = state.hue;
  invertSlider.value = state.invert;
  opacitySlider.value = state.opacity;
  sharpnessSlider.value = state.sharpness;

  rotation = state.rotation;
  flipX = state.flipX;
  flipY = state.flipY;
  currentZoom = state.zoom;

  originalImage = state.image;
  previewImage.src = originalImage;

  previewImage.onload = () => {
    applyFilters();
    centerImage();
  };
}

document.getElementById("undoBtn").addEventListener("click", () => {
  if (historyIndex <= 0) return;

  historyIndex--;
  restoreState(history[historyIndex]);
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if (historyIndex >= history.length - 1) return;

  historyIndex++;
  restoreState(history[historyIndex]);
});

/* ==========================================================
   ROTATE / FLIP
   ========================================================== */

document.getElementById("rotateLeftBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  rotation -= 90;
  applyFilters();
  saveHistory();
  centerImage();
});

document.getElementById("rotateRightBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  rotation += 90;
  applyFilters();
  saveHistory();
  centerImage();
});

document.getElementById("flipHorizontalBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  flipX *= -1;
  applyFilters();
  saveHistory();
  centerImage();
});

document.getElementById("flipVerticalBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  flipY *= -1;
  applyFilters();
  saveHistory();
  centerImage();
});

/* ==========================================================
   CROP
   ========================================================== */

document.getElementById("startCropBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  if (cropper) cropper.destroy();

  cropper = new Cropper(previewImage, {
    viewMode: 1,
    autoCropArea: 0.8,
    background: false,
    movable: true,
    zoomable: true,

    crop(event) {
      document.getElementById("cropX").value = Math.round(event.detail.x);
      document.getElementById("cropY").value = Math.round(event.detail.y);
      document.getElementById("cropWidth").value = Math.round(event.detail.width);
      document.getElementById("cropHeight").value = Math.round(event.detail.height);
    },
  });
});

document.getElementById("cancelCropBtn").addEventListener("click", () => {
  if (!cropper) return;

  cropper.destroy();
  cropper = null;
});

document.getElementById("applyCropBtn").addEventListener("click", () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas();
  originalImage = canvas.toDataURL("image/png");
  previewImage.src = originalImage;

  cropper.destroy();
  cropper = null;

  rotation = 0;
  flipX = 1;
  flipY = 1;
  currentZoom = 100;

  previewImage.onload = () => {
    applyFilters();
    saveHistory();
    centerImage();
  };
});

/* ==========================================================
   MANUAL CROP
   ========================================================== */

document.getElementById("applyManualCropBtn").addEventListener("click", () => {
  if (!imageLoaded) return;

  const x = parseInt(document.getElementById("cropX").value);
  const y = parseInt(document.getElementById("cropY").value);
  const width = parseInt(document.getElementById("cropWidth").value);
  const height = parseInt(document.getElementById("cropHeight").value);

  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.filter = `
      brightness(${brightnessSlider.value}%)
      contrast(${contrastSlider.value}%)
      saturate(${saturationSlider.value}%)
      blur(${blurSlider.value}px)
      grayscale(${grayscaleSlider.value}%)
      sepia(${sepiaSlider.value}%)
      hue-rotate(${hueSlider.value}deg)
      invert(${invertSlider.value}%)
      opacity(${opacitySlider.value}%)
    `;

    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

    originalImage = canvas.toDataURL("image/png");
    previewImage.src = originalImage;

    previewImage.onload = () => {
      applyFilters();
      saveHistory();
      centerImage();
    };
  };

  img.src = originalImage;
});

/* ==========================================================
   DRAG TO PAN
   ========================================================== */

let isPanning = false;
let startX, startY, scrollLeftStart, scrollTopStart;

const container = document.querySelector(".preview-container");

container.addEventListener("mousedown", (e) => {
  if (!imageLoaded) return;

  isPanning = true;
  container.style.cursor = "grabbing";

  startX = e.clientX;
  startY = e.clientY;

  scrollLeftStart = container.scrollLeft;
  scrollTopStart = container.scrollTop;
});

container.addEventListener("mousemove", (e) => {
  if (!isPanning) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  container.scrollLeft = scrollLeftStart - dx;
  container.scrollTop = scrollTopStart - dy;
});

container.addEventListener("mouseup", () => {
  isPanning = false;
  container.style.cursor = "grab";
});

container.addEventListener("mouseleave", () => {
  isPanning = false;
  container.style.cursor = "grab";
});

/* ==========================================================
   QUALITY DIALOG
   ========================================================== */

let pendingFormat = null;

const qualityDialog = document.getElementById("qualityDialog");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");

qualitySlider.addEventListener("input", () => {
  qualityValue.textContent = qualitySlider.value;
});

document.getElementById("qualityOkBtn").addEventListener("click", () => {
  const q = qualitySlider.value / 100;
  qualityDialog.style.display = "none";
  saveImageWithQuality(pendingFormat, q);
  pendingFormat = null;
});

document.getElementById("qualityCancelBtn").addEventListener("click", () => {
  qualityDialog.style.display = "none";
  pendingFormat = null;
});

/* ==========================================================
   RENDER CANVAS WITH FILTERS
   - uses previewImage (already loaded) as source to avoid async issues
   ========================================================== */

function renderCanvasWithFilters() {
  if (!imageLoaded) return null;

  const img = previewImage; // already loaded element

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.filter = `
    brightness(${brightnessSlider.value}%)
    contrast(${contrastSlider.value}%)
    saturate(${saturationSlider.value}%)
    blur(${blurSlider.value}px)
    grayscale(${grayscaleSlider.value}%)
    sepia(${sepiaSlider.value}%)
    hue-rotate(${hueSlider.value}deg)
    invert(${invertSlider.value}%)
    opacity(${opacitySlider.value}%)
  `;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipX, flipY);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  return canvas;
}

/* ===========================================================
   SAVE IMAGE (JPG / PNG / WEBP)
   ========================================================== */

function saveImage(format) {
  if (!imageLoaded) return;

  if (format === "jpg" || format === "webp") {
    pendingFormat = format;
    qualityDialog.style.display = "block";
    return;
  }

  // PNG or other direct formats (not tiff/bmp)
  saveImageWithQuality(format, 1.0);
}

function saveImageWithQuality(format, quality) {
  const canvas = renderCanvasWithFilters();
  if (!canvas) return;

  let mime = "image/png";
  if (format === "jpg") mime = "image/jpeg";
  if (format === "webp") mime = "image/webp";

  // If piexif is available and originalImage contains EXIF, preserve it for JPG
  if (format === "jpg" && typeof piexif !== "undefined" && originalImage && originalImage.startsWith("data:image/jpeg")) {
    try {
      const jpegDataURL = canvas.toDataURL("image/jpeg", quality);
      const exifObj = piexif.load(originalImage);
      const exifBytes = piexif.dump(exifObj);
      const newDataURL = piexif.insert(exifBytes, jpegDataURL);

      const link = document.createElement("a");
      link.download = `image.jpg`;
      link.href = newDataURL;
      link.click();
      return;
    } catch (e) {
      console.warn("piexif error or EXIF not present, falling back to normal JPEG save", e);
      // fallback to normal below
    }
  }

  const link = document.createElement("a");
  link.download = `image.${format}`;
  link.href = canvas.toDataURL(mime, quality);
  link.click();
}

/* ==========================================================
   TIFF EXPORT
   - expects global TIFF.encode or adjust to library API
   ========================================================== */

function saveAsTiff(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);

  // If TIFF library is present and exposes encode
  if (typeof TIFF !== "undefined" && typeof TIFF.encode === "function") {
    try {
      // Some tiff libs expect {width,height,data} or similar
      const tiffBuffer = TIFF.encode({
        width: width,
        height: height,
        data: imageData.data
      });

      const blob = new Blob([tiffBuffer], { type: "image/tiff" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "image.tiff";
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    } catch (e) {
      console.error("TIFF.encode failed", e);
    }
  }

  // Fallback: save PNG and warn
  console.error("TIFF library not found or API mismatch. Please include/adjust tiff.js.");
  const pngBlob = dataURLToBlob(canvas.toDataURL("image/png"));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(pngBlob);
  link.download = "image.png";
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ==========================================================
   BMP EXPORT
   - expects global bmp.encode or adjust to library API
   ========================================================== */

function saveAsBmp(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);

  if (typeof bmp !== "undefined" && typeof bmp.encode === "function") {
    try {
      // bmp.encode usually returns {data: Uint8Array, width, height}
      const bmpData = bmp.encode({
        data: imageData.data,
        width: width,
        height: height
      });

      const blob = new Blob([bmpData.data], { type: "image/bmp" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "image.bmp";
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    } catch (e) {
      console.error("bmp.encode failed", e);
    }
  }

  console.error("BMP library not found or API mismatch. Please include/adjust bmp.js.");
  const pngBlob = dataURLToBlob(canvas.toDataURL("image/png"));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(pngBlob);
  link.download = "image.png";
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: meta });
}

/* ==========================================================
   EVENT LISTENERS FOR SAVE BUTTONS
   - single set, no duplicates
   ========================================================== */

document.getElementById("saveJpgBtn").addEventListener("click", () => saveImage("jpg"));
document.getElementById("savePngBtn").addEventListener("click", () => saveImage("png"));
document.getElementById("saveWebpBtn").addEventListener("click", () => saveImage("webp"));

document.getElementById("saveTiffBtn").addEventListener("click", () => {
  if (!imageLoaded) return;
  const canvas = renderCanvasWithFilters();
  saveAsTiff(canvas);
});

document.getElementById("saveBmpBtn").addEventListener("click", () => {
  if (!imageLoaded) return;
  const canvas = renderCanvasWithFilters();
  saveAsBmp(canvas);
});
