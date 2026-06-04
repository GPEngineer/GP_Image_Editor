/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   filters.js
   ========================================================== */

"use strict";

/* ==========================================================
   MAIN FILTER PIPELINE
   ========================================================== */

function applyCanvasFilters(canvas, ctx) {
  if (!canvas || !ctx) {
    return;
  }
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  imageData = applyBasicFilters(imageData);
  ctx.putImageData(imageData, 0, 0);
  const blurValue = Number(GP.filters.blur);
  if (blurValue > 0) {
    applyBlur(canvas, ctx, blurValue);
  }
}

/* ==========================================================
   BASIC PIXEL FILTERS
   ========================================================== */

function applyBasicFilters(imageData) {
  const data = imageData.data;
  const brightness = Number(GP.filters.brightness) / 100;
  const contrast = Number(GP.filters.contrast);
  const saturation = Number(GP.filters.saturation) / 100;
  const grayscale = Number(GP.filters.grayscale) / 100;
  const sepia = Number(GP.filters.sepia) / 100;
  const invert = Number(GP.filters.invert) / 100;
  const opacity = Number(GP.filters.opacity) / 100;
  const hue = Number(GP.filters.hue);
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    /* =====================
           BRIGHTNESS
           ===================== */

    r *= brightness;
    g *= brightness;
    b *= brightness;

    /* =====================
           CONTRAST
           ===================== */

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    /* =====================
           SATURATION
           ===================== */

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    r = gray + saturation * (r - gray);
    g = gray + saturation * (g - gray);
    b = gray + saturation * (b - gray);

    /* =====================
           GRAYSCALE
           ===================== */

    if (grayscale > 0) {
      r = r * (1 - grayscale) + gray * grayscale;
      g = g * (1 - grayscale) + gray * grayscale;
      b = b * (1 - grayscale) + gray * grayscale;
    }

    /* =====================
           SEPIA
           ===================== */

    if (sepia > 0) {
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r = r * (1 - sepia) + sr * sepia;
      g = g * (1 - sepia) + sg * sepia;
      b = b * (1 - sepia) + sb * sepia;
    }

    /* =====================
           HUE ROTATE
           ===================== */

    if (hue !== 0) {
      const rgb = rotateHue(r, g, b, hue);

      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }

    /* =====================
           INVERT
           ===================== */

    if (invert > 0) {
      r = r * (1 - invert) + (255 - r) * invert;
      g = g * (1 - invert) + (255 - g) * invert;
      b = b * (1 - invert) + (255 - b) * invert;
    }

    /* =====================
           CLAMP
           ===================== */

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
    data[i + 3] = clamp(data[i + 3] * opacity);
  }

  return imageData;
}

/* ==========================================================
   SHARPNESS (Variant B)
   ========================================================== */

function applySharpness(canvas, ctx, amount) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const output = new Uint8ClampedArray(src);
  const strength = 1 + amount * 0.25;
  const kernel = [0, -1, 0, -1, 4 * strength, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let k = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const index = ((y + ky) * width + (x + kx)) * 4;
          const factor = kernel[k++];
          r += src[index] * factor;
          g += src[index + 1] * factor;
          b += src[index + 2] * factor;
        }
      }

      const center = (y * width + x) * 4;
      output[center] = clamp(src[center] + r);
      output[center + 1] = clamp(src[center + 1] + g);
      output[center + 2] = clamp(src[center + 2] + b);
    }
  }

  imageData.data.set(output);

  ctx.putImageData(imageData, 0, 0);
}

/* ==========================================================
   BLUR
   ========================================================== */

function applyBlur(canvas, ctx, radius) {
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");
  tctx.filter = `blur(${radius}px)`;
  tctx.drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(temp, 0, 0);
}

/* ==========================================================
   HUE ROTATION
   ========================================================== */

function rotateHue(r, g, b, degrees) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const nr =
    (0.213 + cos * 0.787 - sin * 0.213) * r +
    (0.715 - cos * 0.715 - sin * 0.715) * g +
    (0.072 - cos * 0.072 + sin * 0.928) * b;

  const ng =
    (0.213 - cos * 0.213 + sin * 0.143) * r +
    (0.715 + cos * 0.285 + sin * 0.14) * g +
    (0.072 - cos * 0.072 - sin * 0.283) * b;

  const nb =
    (0.213 - cos * 0.213 - sin * 0.787) * r +
    (0.715 - cos * 0.715 + sin * 0.715) * g +
    (0.072 + cos * 0.928 + sin * 0.072) * b;

  return {
    r: clamp(nr),
    g: clamp(ng),
    b: clamp(nb),
  };
}

/* ==========================================================
   HELPERS
   ========================================================== */

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}
