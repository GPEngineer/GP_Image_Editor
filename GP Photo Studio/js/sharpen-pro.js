/* ============================================================
   GP Photo Studio 2.1 — sharpen-pro.js  v4.0
   Unsharp Mask — algorytm zbliżony do Photoshopa
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   BOX BLUR (rozmycie pomocnicze)
   ──────────────────────────────────────────────────────────── */
function boxBlur(src, w, h, radius) {
  const dst = new Uint8ClampedArray(src.length);
  const r   = Math.max(1, Math.round(radius));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rs=0, gs=0, bs=0, n=0;
      for (let ky=-r; ky<=r; ky++) {
        const py = y+ky;
        if (py<0||py>=h) continue;
        for (let kx=-r; kx<=r; kx++) {
          const px = x+kx;
          if (px<0||px>=w) continue;
          const p = (py*w+px)*4;
          rs+=src[p]; gs+=src[p+1]; bs+=src[p+2]; n++;
        }
      }
      const o = (y*w+x)*4;
      dst[o]   = rs/n; dst[o+1] = gs/n;
      dst[o+2] = bs/n; dst[o+3] = src[o+3];
    }
  }
  return dst;
}

/* ────────────────────────────────────────────────────────────
   UNSHARP MASK
   amount    : 0–200 (% wzmocnienia krawędzi)
   radius    : 1–10  (promień rozmycia w pikselach)
   threshold : 0–50  (minimalny kontrast do wyostrzenia)
   ──────────────────────────────────────────────────────────── */
function applySharpenPro(imageData, amount, radius, threshold) {
  const w   = imageData.width;
  const h   = imageData.height;
  const src = imageData.data;
  const blr = boxBlur(src, w, h, radius);
  const res = new Uint8ClampedArray(src.length);
  const str = amount / 100;

  for (let i = 0; i < src.length; i+=4) {
    const rd = src[i]   - blr[i];
    const gd = src[i+1] - blr[i+1];
    const bd = src[i+2] - blr[i+2];
    res[i]   = Math.abs(rd)>threshold ? clamp8(src[i]   + rd*str) : src[i];
    res[i+1] = Math.abs(gd)>threshold ? clamp8(src[i+1] + gd*str) : src[i+1];
    res[i+2] = Math.abs(bd)>threshold ? clamp8(src[i+2] + bd*str) : src[i+2];
    res[i+3] = src[i+3];
  }
  imageData.data.set(res);
  return imageData;
}

function clamp8(v) { return v<0?0:v>255?255:v; }

window.applySharpenPro = applySharpenPro;
