/* ============================================================
   GP Photo Studio 2.1 — canvas-renderer.js  v5.0
   Renderowanie z filtrami CSS + swobodny kąt obrotu
   ============================================================ */
"use strict";

function drawCheckerboard(ctx, w, h) {
  const sz = 16;
  for (let y=0; y<h; y+=sz)
    for (let x=0; x<w; x+=sz) {
      ctx.fillStyle = ((Math.floor(x/sz)+Math.floor(y/sz))%2===0) ? '#282828' : '#1c1c1c';
      ctx.fillRect(x,y,sz,sz);
    }
}

function applyCanvasSharpness(imgData, strength) {
  if (strength<=0) return imgData;
  const px=imgData.data, w=imgData.width, h=imgData.height;
  const out=new Uint8ClampedArray(px), f=strength/10;
  const K=[0,-f,0,-f,1+4*f,-f,0,-f,0];
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    let r=0,g=0,b=0,k=0;
    for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++) {
      const p=((y+ky)*w+(x+kx))*4, wt=K[k++];
      r+=px[p]*wt; g+=px[p+1]*wt; b+=px[p+2]*wt;
    }
    const o=(y*w+x)*4;
    out[o]=Math.max(0,Math.min(255,r)); out[o+1]=Math.max(0,Math.min(255,g));
    out[o+2]=Math.max(0,Math.min(255,b)); out[o+3]=px[o+3];
  }
  imgData.data.set(out); return imgData;
}

function renderImage() {
  if (!GP.imageLoaded) return;
  const cv  = document.getElementById('editorCanvas');
  const ctx = cv.getContext('2d');
  const img = GP.image;
  const zoom= GP.zoom/100;
  const iw  = img.naturalWidth, ih = img.naturalHeight;

  /* Łączny kąt = snap 90° + swobodny */
  const totalDeg = ((GP.rotation + (GP.freeRotation||0)) % 360 + 360) % 360;
  const totalRad = totalDeg * Math.PI / 180;
  const rotated  = totalDeg === 90 || totalDeg === 270;

  /* Rozmiar płótna po obrocie */
  const sin = Math.abs(Math.sin(totalRad)), cos = Math.abs(Math.cos(totalRad));
  const rw  = Math.round(iw*cos + ih*sin);
  const rh  = Math.round(iw*sin + ih*cos);

  cv.width  = rw;
  cv.height = rh;

  ctx.clearRect(0,0,rw,rh);
  drawCheckerboard(ctx,rw,rh);

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
  ctx.translate(rw/2, rh/2);
  ctx.rotate(totalRad);
  ctx.scale(GP.flipX, GP.flipY);
  ctx.drawImage(img, -iw/2, -ih/2, iw, ih);
  ctx.restore();

  if (GP.filters.sharpness>0) {
    let id=ctx.getImageData(0,0,cv.width,cv.height);
    ctx.putImageData(applyCanvasSharpness(id,GP.filters.sharpness),0,0);
  }
  if (GP.sharpenPro?.enabled && typeof applySharpenPro==='function') {
    let id=ctx.getImageData(0,0,cv.width,cv.height);
    ctx.putImageData(applySharpenPro(id,GP.sharpenPro.amount,GP.sharpenPro.radius,GP.sharpenPro.threshold),0,0);
  }
  if (GP.vignette?.enabled && GP.vignette.strength>0) {
    applyVignetteCanvas(ctx,cv.width,cv.height,GP.vignette.strength);
  }

  cv.style.transform       = `scale(${zoom})`;
  cv.style.transformOrigin = 'center center';

  /* Aktualizuj info */
  const iz=document.getElementById('infoZoom'); if(iz) iz.textContent=GP.zoom+'%';
  const is=document.getElementById('infoSize'); if(is) is.textContent=`${iw} × ${ih}`;
  const fi=document.getElementById('infoFile'); if(fi&&GP.fileName) fi.textContent=GP.fileName;
}

function applyVignetteCanvas(ctx,w,h,strength) {
  if (strength<=0) return;
  const s=strength/100;
  const gr=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.3,w/2,h/2,Math.max(w,h)*0.75);
  gr.addColorStop(0,'rgba(0,0,0,0)');
  gr.addColorStop(1,`rgba(0,0,0,${Math.min(s,1)})`);
  ctx.save(); ctx.globalCompositeOperation='source-atop';
  ctx.fillStyle=gr; ctx.fillRect(0,0,w,h); ctx.restore();
}

function getRenderedCanvas() { return document.getElementById('editorCanvas'); }

window.renderImage       = renderImage;
window.getRenderedCanvas = getRenderedCanvas;
window.drawCheckerboard  = drawCheckerboard;
