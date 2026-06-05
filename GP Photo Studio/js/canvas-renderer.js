/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   canvas-renderer.js  v3.0
   ========================================================== */

"use strict";

/* ==========================================================
   HELPERS
   ========================================================== */
function getCanvas() {
  return document.getElementById("editorCanvas");
}
function getContext() {
  return getCanvas().getContext("2d");
}

/* ==========================================================
   CHECKERBOARD  (drawn behind transparent images)
   ========================================================== */
function drawCheckerboard(ctx, width, height) {
  const size = 16;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const even = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
      ctx.fillStyle = even ? "#2a2a2e" : "#1e1e22";
      ctx.fillRect(x, y, size, size);
    }
  }
}

/* ==========================================================
   SHARPNESS CONVOLUTION
   ========================================================== */
function applyCanvasSharpness(imageData, strength) {
  if (strength <= 0) return imageData;

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
      let r = 0,
        g = 0,
        b = 0,
        k = 0;
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
      output[outPos + 3] = pixels[outPos + 3]; // preserve alpha
    }
  }

  imageData.data.set(output);
  return imageData;
}

/* ==========================================================
   MAIN RENDER
   ========================================================== */
function renderImage() {
  if (!GP.imageLoaded) return;

  const canvas = getCanvas();
  const ctx = getContext();
  const img = GP.image;
  const zoom = GP.zoom / 100;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  /* ── canvas dimensions always match the natural image size ── */
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  /* draw checkerboard first (visible through transparent areas) */
  drawCheckerboard(ctx, w, h);

  /* ── apply CSS filters ── */
  ctx.save();
  ctx.filter = [
    `brightness(${GP.filters.brightness}%)`,
    `contrast(${GP.filters.contrast}%)`,
    `saturate(${GP.filters.saturation}%)`,
    `blur(${GP.filters.blur}px)`,
    `grayscale(${GP.filters.grayscale}%)`,
    `sepia(${GP.filters.sepia}%)`,
    `hue-rotate(${GP.filters.hue}deg)`,
    `invert(${GP.filters.invert}%)`,
    `opacity(${GP.filters.opacity}%)`,
  ].join(" ");

  /* ── transform: rotate + flip around centre ── */
  ctx.translate(w / 2, h / 2);
  ctx.rotate((GP.rotation * Math.PI) / 180);
  ctx.scale(GP.flipX, GP.flipY);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  /* ── pixel-level sharpness (post-process) ── */
  if (GP.filters.sharpness > 0) {
    let imgData = ctx.getImageData(0, 0, w, h);
    imgData = applyCanvasSharpness(imgData, GP.filters.sharpness);
    ctx.putImageData(imgData, 0, 0);
  }

  /* ── CSS zoom (scales the canvas element visually) ── */
  canvas.style.transform = `scale(${zoom})`;
  canvas.style.transformOrigin = "center center";
}

/* ==========================================================
   EXPORT  (returns the canvas at its natural resolution,
             without CSS transform scale)
   ========================================================== */
function getRenderedCanvas() {
  return getCanvas();
}

/* ==========================================================
   PUBLIC
   ========================================================== */
window.renderImage = renderImage;
window.getRenderedCanvas = getRenderedCanvas;
