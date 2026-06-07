/* ============================================================
   GP Photo Studio 2.1 — clipboard.js  v4.0
   Kopiowanie spłaszczonego obrazu do schowka systemowego
   ============================================================ */
"use strict";

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('copyImageBtn')?.addEventListener('click', copyImageToClipboard);
});

async function copyImageToClipboard() {
  if (!GP.imageLoaded) { showToast('Load an image first.'); return; }

  const src = getRenderedCanvas();

  /* Spłaszcz na białe tło (JPEG-style) aby mieć pewność kompatybilności */
  const flat = document.createElement('canvas');
  flat.width  = src.width;
  flat.height = src.height;
  const ctx = flat.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(src, 0, 0);

  try {
    flat.toBlob(async blob => {
      if (!blob) { showToast('❌ Could not create image blob.'); return; }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('✓ Image copied to clipboard!');
      } catch (err) {
        /* Fallback: otwórz w nowej karcie */
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          showToast('Clipboard API not available — image opened in new tab.');
        } else {
          showToast('❌ Clipboard not available. Allow popup for fallback.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    }, 'image/png');
  } catch (err) {
    showToast('❌ Copy failed: ' + err.message);
  }
}

window.copyImageToClipboard = copyImageToClipboard;
