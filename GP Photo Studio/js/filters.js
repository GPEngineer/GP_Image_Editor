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

/* ============================================================
   GP Photo Studio 2.1 — rulers.js  v4.0
   Linijka pozioma (rulerX) i pionowa (rulerY) ze skalą px / mm
   ============================================================ */
("use strict");

const RULER_H = 20; /* wysokość/szerokość paska linijki w px */
const RULER_BG = "#192a40";
const RULER_FG = "#607c96";
const RULER_TICK = "#3d9eff";
const RULER_TEXT = "#8ab0cc";

/* ────────────────────────────────────────────────────────────
   RYSOWANIE LINIJKI POZIOMEJ
   ──────────────────────────────────────────────────────────── */
function drawRulers() {
  drawRulerX();
  drawRulerY();
}

function drawRulerX() {
  const rulerEl = document.getElementById("rulerX");
  if (!rulerEl) return;

  const wrapper = document.getElementById("canvasWrapper");
  const W = wrapper.clientWidth;
  rulerEl.width = W;
  rulerEl.height = RULER_H;

  const ctx = rulerEl.getContext("2d");
  ctx.clearRect(0, 0, W, RULER_H);

  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, W, RULER_H);

  if (!GP.imageLoaded) return;

  const zoom = GP.zoom / 100;
  const dpi = GP.settings.rulerDpi || 96;
  const unit = GP.settings.rulerUnit || "px";
  const imgW = document.getElementById("editorCanvas").width;

  /* Pozycja canvasu w wrapperze */
  const stage = document.getElementById("canvasStage");
  const stageRect = stage.getBoundingClientRect();
  const wrapRect = wrapper.getBoundingClientRect();
  const canvasEl = document.getElementById("editorCanvas");
  const cvRect = canvasEl.getBoundingClientRect();

  const canvasLeft = cvRect.left - wrapRect.left + wrapper.scrollLeft;

  /* Krok co ile px obrazu stawiamy kreską */
  const pixelsPerUnit = unit === "mm" ? dpi / 25.4 : 1;
  const unitStep = chooseSep(zoom * pixelsPerUnit);
  const pxStep = unitStep / pixelsPerUnit; /* px obrazu między kreskami */

  ctx.strokeStyle = RULER_TICK;
  ctx.fillStyle = RULER_TEXT;
  ctx.font = '9px "JetBrains Mono",monospace';
  ctx.lineWidth = 1;
  ctx.textBaseline = "top";

  let imgPx = 0;
  while (imgPx <= imgW + pxStep) {
    const screenX = canvasLeft + imgPx * zoom;
    if (screenX < 0) {
      imgPx += pxStep;
      continue;
    }
    if (screenX > W + 200) break;

    const x = Math.round(screenX) + 0.5;
    const label =
      unit === "mm"
        ? (imgPx / pixelsPerUnit).toFixed(1)
        : Math.round(imgPx).toString();
    const tickH = imgPx % (pxStep * 5) < 0.01 ? RULER_H * 0.6 : RULER_H * 0.35;

    ctx.beginPath();
    ctx.moveTo(x, RULER_H - tickH);
    ctx.lineTo(x, RULER_H);
    ctx.stroke();

    if (imgPx % (pxStep * 5) < 0.01) {
      ctx.fillText(label, x + 2, 2);
    }
    imgPx += pxStep;
  }

  /* Jednostka */
  ctx.fillStyle = RULER_TICK;
  ctx.font = '8px "DM Sans",sans-serif';
  ctx.fillText(unit, 2, 2);
}

function drawRulerY() {
  const rulerEl = document.getElementById("rulerY");
  if (!rulerEl) return;

  const wrapper = document.getElementById("canvasWrapper");
  const H = wrapper.clientHeight;
  rulerEl.width = RULER_H;
  rulerEl.height = H;
  rulerEl.style.display = "block";

  const ctx = rulerEl.getContext("2d");
  ctx.clearRect(0, 0, RULER_H, H);
  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, RULER_H, H);

  if (!GP.imageLoaded) return;

  const zoom = GP.zoom / 100;
  const dpi = GP.settings.rulerDpi || 96;
  const unit = GP.settings.rulerUnit || "px";
  const imgH = document.getElementById("editorCanvas").height;

  const cvRect = document
    .getElementById("editorCanvas")
    .getBoundingClientRect();
  const wrapRect = wrapper.getBoundingClientRect();
  const canvasTop = cvRect.top - wrapRect.top + wrapper.scrollTop;

  const pixelsPerUnit = unit === "mm" ? dpi / 25.4 : 1;
  const unitStep = chooseSep(zoom * pixelsPerUnit);
  const pxStep = unitStep / pixelsPerUnit;

  ctx.strokeStyle = RULER_TICK;
  ctx.fillStyle = RULER_TEXT;
  ctx.font = '9px "JetBrains Mono",monospace';
  ctx.lineWidth = 1;

  let imgPx = 0;
  while (imgPx <= imgH + pxStep) {
    const screenY = canvasTop + imgPx * zoom;
    if (screenY < 0) {
      imgPx += pxStep;
      continue;
    }
    if (screenY > H + 200) break;

    const y = Math.round(screenY) + 0.5;
    const label =
      unit === "mm"
        ? (imgPx / pixelsPerUnit).toFixed(1)
        : Math.round(imgPx).toString();
    const tickW = imgPx % (pxStep * 5) < 0.01 ? RULER_H * 0.6 : RULER_H * 0.35;

    ctx.beginPath();
    ctx.moveTo(RULER_H - tickW, y);
    ctx.lineTo(RULER_H, y);
    ctx.stroke();

    if (imgPx % (pxStep * 5) < 0.01) {
      /* Tekst pionowy */
      ctx.save();
      ctx.translate(2, y - 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    imgPx += pxStep;
  }
}

/* ────────────────────────────────────────────────────────────
   HELPER: dobierz rozsądny krok
   ──────────────────────────────────────────────────────────── */
function chooseSep(scale) {
  /* scale = ile pikseli ekranu na 1 jednostkę */
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  for (const s of steps) {
    if (s * scale >= 40) return s;
  }
  return 5000;
}

/* ────────────────────────────────────────────────────────────
   Odśwież linijki przy scrollu / zoomie canvasu
   ──────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("canvasWrapper");
  wrapper?.addEventListener("scroll", () => {
    if (GP.settings.showRulers) drawRulers();
  });
});

window.drawRulers = drawRulers;
