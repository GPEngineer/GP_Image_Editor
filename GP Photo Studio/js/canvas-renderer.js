/* ============================================================
   GP Photo Studio 2.1 — canvas-renderer.js  v4.0
   Renderowanie obrazu, filtry CSS, wyostrzanie, winietowanie
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   SZACHOWNICA (tło dla przezroczystości)
   ──────────────────────────────────────────────────────────── */
function drawCheckerboard(ctx, w, h) {
  const sz = 16;
  for (let y = 0; y < h; y += sz) {
    for (let x = 0; x < w; x += sz) {
      ctx.fillStyle = ((Math.floor(x/sz) + Math.floor(y/sz)) % 2 === 0) ? '#282828' : '#1c1c1c';
      ctx.fillRect(x, y, sz, sz);
    }
  }
}

/* ────────────────────────────────────────────────────────────
   WYOSTRZANIE (splot na pikselach)
   ──────────────────────────────────────────────────────────── */
function applyCanvasSharpness(imgData, strength) {
  if (strength <= 0) return imgData;
  const px = imgData.data, w = imgData.width, h = imgData.height;
  const out = new Uint8ClampedArray(px);
  const f = strength / 10;
  const K = [0,-f,0,-f,1+4*f,-f,0,-f,0];

  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      let r=0,g=0,b=0,k=0;
      for (let ky=-1; ky<=1; ky++) {
        for (let kx=-1; kx<=1; kx++) {
          const p = ((y+ky)*w+(x+kx))*4;
          const wt = K[k++];
          r += px[p]*wt; g += px[p+1]*wt; b += px[p+2]*wt;
        }
      }
      const o = (y*w+x)*4;
      out[o]   = Math.max(0, Math.min(255, r));
      out[o+1] = Math.max(0, Math.min(255, g));
      out[o+2] = Math.max(0, Math.min(255, b));
      out[o+3] = px[o+3];
    }
  }
  imgData.data.set(out);
  return imgData;
}

/* ────────────────────────────────────────────────────────────
   WINIETOWANIE
   ──────────────────────────────────────────────────────────── */
function applyVignetteCanvas(ctx, w, h, strength) {
  if (strength <= 0) return;
  const s = strength / 100;
  const gr = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.3, w/2,h/2,Math.max(w,h)*0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(0,0,0,${Math.min(s,1)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = gr;
  ctx.fillRect(0,0,w,h);
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   GŁÓWNY RENDER
   ──────────────────────────────────────────────────────────── */
function renderImage() {
  if (!GP.imageLoaded) return;

  const cv  = document.getElementById('editorCanvas');
  const ctx = cv.getContext('2d');
  const img = GP.image;
  const zoom = GP.zoom / 100;
  const iw   = img.naturalWidth;
  const ih   = img.naturalHeight;

  const rot     = ((GP.rotation % 360) + 360) % 360;
  const rotated = rot === 90 || rot === 270;
  cv.width  = rotated ? ih : iw;
  cv.height = rotated ? iw : ih;

  ctx.clearRect(0,0,cv.width,cv.height);
  drawCheckerboard(ctx, cv.width, cv.height);

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
    `opacity(${GP.filters.opacity}%)`
  ].join(' ');

  ctx.translate(cv.width/2, cv.height/2);
  ctx.rotate((GP.rotation * Math.PI) / 180);
  ctx.scale(GP.flipX, GP.flipY);
  ctx.drawImage(img, -iw/2, -ih/2, iw, ih);
  ctx.restore();

  /* Wyostrzanie pikselowe */
  if (GP.filters.sharpness > 0) {
    let id = ctx.getImageData(0,0,cv.width,cv.height);
    ctx.putImageData(applyCanvasSharpness(id, GP.filters.sharpness), 0, 0);
  }

  /* Sharpen Pro (Unsharp Mask) */
  if (GP.sharpenPro?.enabled && typeof applySharpenPro === 'function') {
    let id = ctx.getImageData(0,0,cv.width,cv.height);
    ctx.putImageData(applySharpenPro(id, GP.sharpenPro.amount, GP.sharpenPro.radius, GP.sharpenPro.threshold), 0, 0);
  }

  /* Winietowanie */
  if (GP.vignette?.enabled && GP.vignette.strength > 0) {
    applyVignetteCanvas(ctx, cv.width, cv.height, GP.vignette.strength);
  }

  /* CSS zoom (wizualne skalowanie elementu) */
  cv.style.transform       = `scale(${zoom})`;
  cv.style.transformOrigin = 'center center';
}

/* ────────────────────────────────────────────────────────────
   FLAT CANVAS (do eksportu, bez CSS transform)
   ──────────────────────────────────────────────────────────── */
function getRenderedCanvas() {
  return document.getElementById('editorCanvas');
}

window.renderImage       = renderImage;
window.getRenderedCanvas = getRenderedCanvas;