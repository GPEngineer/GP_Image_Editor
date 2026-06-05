/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   sharpen-pro.js  v1.0

   Photoshop-like Unsharp Mask
   Amount
   Radius
   Threshold
   ========================================================== */

"use strict";

/* ==========================================================
   BOX BLUR
   ========================================================== */

function boxBlur(src, width, height, radius) {
  const dst = new Uint8ClampedArray(src.length);

  const r = Math.max(1, Math.round(radius));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rs = 0;
      let gs = 0;
      let bs = 0;
      let count = 0;

      for (let ky = -r; ky <= r; ky++) {
        const py = y + ky;

        if (py < 0 || py >= height) continue;

        for (let kx = -r; kx <= r; kx++) {
          const px = x + kx;

          if (px < 0 || px >= width) continue;

          const pos = (py * width + px) * 4;

          rs += src[pos];
          gs += src[pos + 1];
          bs += src[pos + 2];

          count++;
        }
      }

      const out = (y * width + x) * 4;

      dst[out] = rs / count;
      dst[out + 1] = gs / count;
      dst[out + 2] = bs / count;
      dst[out + 3] = src[out + 3];
    }
  }

  return dst;
}

/* ==========================================================
   UNSHARP MASK
   ========================================================== */

function applySharpenPro(imageData, amount, radius, threshold) {
  const width = imageData.width;
  const height = imageData.height;

  const src = imageData.data;

  const blurred = boxBlur(src, width, height, radius);

  const result = new Uint8ClampedArray(src.length);

  const strength = amount / 100;

  for (let i = 0; i < src.length; i += 4) {
    const rDiff = src[i] - blurred[i];

    const gDiff = src[i + 1] - blurred[i + 1];

    const bDiff = src[i + 2] - blurred[i + 2];

    result[i] =
      Math.abs(rDiff) > threshold ? clamp(src[i] + rDiff * strength) : src[i];

    result[i + 1] =
      Math.abs(gDiff) > threshold
        ? clamp(src[i + 1] + gDiff * strength)
        : src[i + 1];

    result[i + 2] =
      Math.abs(bDiff) > threshold
        ? clamp(src[i + 2] + bDiff * strength)
        : src[i + 2];

    result[i + 3] = src[i + 3];
  }

  imageData.data.set(result);

  return imageData;
}

/* ==========================================================
   CLAMP
   ========================================================== */

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

/* ==========================================================
   PUBLIC
   ========================================================== */

window.applySharpenPro = applySharpenPro;
