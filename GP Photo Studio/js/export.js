/* ============================================================
   GP Photo Studio 2.1 — export.js  v4.0
   Eksport do JPG, PNG, WEBP, TIFF (UTIF), GIF (GIF.js), BMP
   ============================================================ */
"use strict";

let _pendingFormat = null;

/* ────────────────────────────────────────────────────────────
   JAKOŚĆ
   ──────────────────────────────────────────────────────────── */
const qualityDialog   = document.getElementById('qualityDialog');
const qualitySlider   = document.getElementById('qualitySlider');
const qualityValueEl  = document.getElementById('qualityValue');
const qualityOkBtn    = document.getElementById('qualityOkBtn');
const qualityCancelBtn= document.getElementById('qualityCancelBtn');
const qualityLabel    = document.getElementById('qualityFormatLabel');

qualitySlider?.addEventListener('input', () => {
  if (qualityValueEl) qualityValueEl.textContent = qualitySlider.value;
});

/* ────────────────────────────────────────────────────────────
   PRZYCISKI ZAPISU
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveJpgBtn') ?.addEventListener('click', () => requestSave('jpg'));
  document.getElementById('savePngBtn') ?.addEventListener('click', () => requestSave('png'));
  document.getElementById('saveWebpBtn')?.addEventListener('click', () => requestSave('webp'));
  document.getElementById('saveTiffBtn')?.addEventListener('click', () => requestSave('tiff'));
  document.getElementById('saveGifBtn') ?.addEventListener('click', () => requestSave('gif'));
  document.getElementById('saveBmpBtn') ?.addEventListener('click', () => requestSave('bmp'));
  qualityOkBtn    ?.addEventListener('click', confirmSave);
  qualityCancelBtn?.addEventListener('click', cancelSave);
});

/* ────────────────────────────────────────────────────────────
   ŻĄDANIE ZAPISU
   ──────────────────────────────────────────────────────────── */
function requestSave(format) {
  if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
  _pendingFormat = format;

  const lossless = ['png','bmp','tiff','gif'];
  if (lossless.includes(format)) {
    performSave(format, 100);
    return;
  }
  /* JPG / WEBP — pokaż dialog jakości */
  if (qualityLabel) qualityLabel.textContent = format.toUpperCase();
  if (qualityDialog) qualityDialog.style.display = 'block';
}

function confirmSave() {
  const q = qualitySlider ? Number(qualitySlider.value) : 90;
  if (qualityDialog) qualityDialog.style.display = 'none';
  if (_pendingFormat) performSave(_pendingFormat, q);
  _pendingFormat = null;
}
function cancelSave() {
  if (qualityDialog) qualityDialog.style.display = 'none';
  _pendingFormat = null;
}

/* ────────────────────────────────────────────────────────────
   WYKONANIE ZAPISU
   ──────────────────────────────────────────────────────────── */
function performSave(format, quality) {
  const cv = getRenderedCanvas();
  const q  = quality / 100;
  switch(format) {
    case 'jpg':  saveJpeg(cv, q);   break;
    case 'png':  savePng(cv);       break;
    case 'webp': saveWebp(cv, q);   break;
    case 'tiff': saveTiff(cv);      break;
    case 'gif':  saveGif(cv);       break;
    case 'bmp':  saveBmp(cv);       break;
  }
}

/* ────────────────────────────────────────────────────────────
   FORMATY
   ──────────────────────────────────────────────────────────── */
function flattenWhite(src) {
  const tmp = document.createElement('canvas');
  tmp.width = src.width; tmp.height = src.height;
  const c = tmp.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0,0,tmp.width,tmp.height);
  c.drawImage(src,0,0);
  return tmp;
}

function triggerDownload(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function saveJpeg(cv, q) {
  triggerDownload(flattenWhite(cv).toDataURL('image/jpeg', q),
    (GP.fileName||'photo') + '.jpg');
  showToast('✓ JPG saved.');
}
function savePng(cv) {
  triggerDownload(cv.toDataURL('image/png'), (GP.fileName||'photo') + '.png');
  showToast('✓ PNG saved.');
}
function saveWebp(cv, q) {
  triggerDownload(cv.toDataURL('image/webp', q), (GP.fileName||'photo') + '.webp');
  showToast('✓ WEBP saved.');
}

function saveTiff(cv) {
  if (!window.UTIF) { showToast('UTIF library not loaded.'); return; }
  const ctx = cv.getContext('2d');
  const id  = ctx.getImageData(0,0,cv.width,cv.height);
  const buf = UTIF.encodeImage(id.data, cv.width, cv.height);
  const url = URL.createObjectURL(new Blob([buf],{type:'image/tiff'}));
  triggerDownload(url, (GP.fileName||'photo') + '.tif');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ TIFF saved.');
}

function saveBmp(cv) {
  const ctx   = cv.getContext('2d');
  const w     = cv.width, h = cv.height;
  const px    = ctx.getImageData(0,0,w,h).data;
  const row   = Math.floor((24*w+31)/32)*4;
  const pxSz  = row*h;
  const fSz   = 54+pxSz;
  const buf   = new ArrayBuffer(fSz);
  const view  = new DataView(buf);
  let off = 0;
  view.setUint8(off++,0x42); view.setUint8(off++,0x4d);
  view.setUint32(off,fSz,true); off+=4;
  view.setUint16(off,0,true); off+=2; view.setUint16(off,0,true); off+=2;
  view.setUint32(off,54,true); off+=4;
  view.setUint32(off,40,true); off+=4; view.setInt32(off,w,true); off+=4;
  view.setInt32(off,h,true); off+=4; view.setUint16(off,1,true); off+=2;
  view.setUint16(off,24,true); off+=2; view.setUint32(off,0,true); off+=4;
  view.setUint32(off,pxSz,true); off+=4;
  view.setInt32(off,2835,true); off+=4; view.setInt32(off,2835,true); off+=4;
  view.setUint32(off,0,true); off+=4; view.setUint32(off,0,true); off+=4;
  const pad = row-w*3;
  for (let y=h-1;y>=0;y--) {
    for (let x=0;x<w;x++) {
      const p=(y*w+x)*4;
      view.setUint8(off++,px[p+2]); view.setUint8(off++,px[p+1]); view.setUint8(off++,px[p]);
    }
    for (let p=0;p<pad;p++) view.setUint8(off++,0);
  }
  const url = URL.createObjectURL(new Blob([buf],{type:'image/bmp'}));
  triggerDownload(url, (GP.fileName||'photo') + '.bmp');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ BMP saved.');
}

function saveGif(cv) {
  if (!window.GIF) { showToast('GIF.js not loaded.'); return; }
  const gif = new GIF({ workers:2, quality:10, workerScript:'libs/gif.worker.js' });
  gif.addFrame(cv, { copy:true, delay:100 });
  showToast('Generating GIF…');
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, (GP.fileName||'photo') + '.gif');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast('✓ GIF saved.');
  });
  gif.render();
}

window.requestSave = requestSave;
window.showToast   = window.showToast || function(){};