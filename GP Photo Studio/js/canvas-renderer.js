/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   canvas-renderer.js
   ========================================================== */

"use strict";

/* ==========================================================
   CANVAS HELPERS
   ========================================================== */
function getCanvas() {
  return document.getElementById("editorCanvas");
}
function getContext() {
  return getCanvas().getContext("2d");
}

/* ==========================================================
   CHECKERBOARD BACKGROUND
   ========================================================== */
function drawCheckerboard(ctx, width, height) {
  const size = 20;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const even = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
      ctx.fillStyle = even ? "#3a3f46" : "#4b5159";
      ctx.fillRect(x, y, size, size);
    }
  }
}

/* ==========================================================
   SHARPNESS FILTER
   ========================================================== */
function applyCanvasSharpness(imageData, strength) {
  if (strength <= 0) {
    return imageData;
  }
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels);
  const factor = strength / 10;
  const kernel = [
    0,
    -1 * factor,
    0,

    -1 * factor,
    5 + 4 * factor,
    -1 * factor,

    0,
    -1 * factor,
    0,
  ];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pos = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[k++];
          r += pixels[pos] * weight;
          g += pixels[pos + 1] * weight;
          b += pixels[pos + 2] * weight;
        }
      }
      const outPos = (y * width + x) * 4;
      output[outPos] = Math.max(0, Math.min(255, r));
      output[outPos + 1] = Math.max(0, Math.min(255, g));
      output[outPos + 2] = Math.max(0, Math.min(255, b));
    }
  }
  imageData.data.set(output);
  return imageData;
}

/* ==========================================================
   MAIN RENDER
   ========================================================== */
function renderImage() {
  if (!GP.imageLoaded) {
    return;
  }
  const canvas = getCanvas();
  const ctx = getContext();
  const img = GP.image;
  const zoom = GP.zoom / 100;
  const rotation = GP.rotation;
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  drawCheckerboard(ctx, width, height);
  ctx.save();
  ctx.filter = `
        brightness(${GP.filters.brightness}%)
        contrast(${GP.filters.contrast}%)
        saturate(${GP.filters.saturation}%)
        blur(${GP.filters.blur}px)
        grayscale(${GP.filters.grayscale}%)
        sepia(${GP.filters.sepia}%)
        hue-rotate(${GP.filters.hue}deg)
        invert(${GP.filters.invert}%)
        opacity(${GP.filters.opacity}%)
        `;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(GP.flipX, GP.flipY);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();

  /* =====================================
       SHARPNESS
       ===================================== */
  if (GP.filters.sharpness > 0) {
    let imageData = ctx.getImageData(0, 0, width, height);
    imageData = applyCanvasSharpness(imageData, GP.filters.sharpness);
    ctx.putImageData(imageData, 0, 0);
  }

  /* =====================================
       CSS ZOOM
       ===================================== */
  canvas.style.transform = `scale(${zoom})`;
  canvas.style.transformOrigin = "center center";
}

/* ==========================================================
   EXPORT CANVAS
   ========================================================== */
function getRenderedCanvas() {
  return getCanvas();
}

/* ==========================================================
   PUBLIC API
   ========================================================== */
window.renderImage = renderImage;
window.getRenderedCanvas = getRenderedCanvas;
