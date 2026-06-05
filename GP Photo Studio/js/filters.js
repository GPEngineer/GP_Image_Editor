/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   filters.js  v3.0

   All CSS-based filters (brightness, contrast, saturation,
   blur, grayscale, sepia, hue-rotate, invert, opacity) are
   applied directly inside canvas-renderer.js via ctx.filter.

   Pixel-level sharpness convolution also lives there.

   This file is kept as an extension point for any future
   custom pixel-manipulation filters (e.g. curves, levels,
   noise, vignette, etc.).
   ========================================================== */

"use strict";

/* ==========================================================
   FUTURE FILTERS PLACEHOLDER
   ========================================================== */

/**
 * applyVignette(ctx, width, height, strength)
 * Example of a custom canvas post-process filter.
 * strength: 0–1
 */
function applyVignette(ctx, width, height, strength) {
  if (strength <= 0) return;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${Math.min(strength, 1)})`);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/* ==========================================================
   PUBLIC
   ========================================================== */
window.applyVignette = applyVignette;
