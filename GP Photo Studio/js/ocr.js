/* ============================================================
   GP Photo Studio 2.1 — ocr.js  v4.0
   OCR tekstu z obrazu — używa Tesseract.js (CDN)
   Wyniki trafiają do panelu tekstowego w prawym panelu
   ============================================================ */
"use strict";

let _ocrRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ocrBtn')?.addEventListener('click', runOCR);
});

/* ────────────────────────────────────────────────────────────
   GŁÓWNA FUNKCJA OCR
   ──────────────────────────────────────────────────────────── */
async function runOCR() {
  if (!GP.imageLoaded) { showToast('Load an image first.'); return; }
  if (_ocrRunning)     { showToast('OCR is already running…'); return; }

  /* Sprawdź czy Tesseract jest załadowany */
  if (typeof Tesseract === 'undefined') {
    showToast('Loading OCR engine…');
    await loadTesseract();
  }

  _ocrRunning = true;
  showOcrProgress(0, 'Initializing OCR engine…');

  try {
    const cv     = getRenderedCanvas();
    const dataUrl = cv.toDataURL('image/png');

    const result = await Tesseract.recognize(dataUrl, 'eng+pol', {
      logger: m => {
        if (m.status === 'recognizing text') {
          showOcrProgress(Math.round(m.progress * 100), 'Recognizing text…');
        }
      }
    });

    const text = result.data.text.trim();
    showOcrResult(text);
    saveHistory('OCR Text');
    showToast(`✓ OCR complete — ${text.length} characters found.`);

  } catch (err) {
    showToast('❌ OCR error: ' + err.message);
    console.error('OCR error:', err);
  } finally {
    _ocrRunning = false;
    hideOcrProgress();
  }
}

/* ────────────────────────────────────────────────────────────
   LAZY LOAD TESSERACT.JS
   ──────────────────────────────────────────────────────────── */
function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (typeof Tesseract !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src   = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload  = resolve;
    script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
    document.head.appendChild(script);
  });
}

/* ────────────────────────────────────────────────────────────
   PROGRESS UI
   ──────────────────────────────────────────────────────────── */
function showOcrProgress(pct, msg) {
  const bar   = document.getElementById('ocrProgressBar');
  const label = document.getElementById('ocrProgressLabel');
  const wrap  = document.getElementById('ocrProgress');
  if (wrap)  wrap.style.display  = 'block';
  if (bar)   bar.style.width     = pct + '%';
  if (label) label.textContent   = `${msg} ${pct}%`;
}

function hideOcrProgress() {
  const wrap = document.getElementById('ocrProgress');
  if (wrap) wrap.style.display = 'none';
}

/* ────────────────────────────────────────────────────────────
   WYŚWIETL WYNIK W PRAWYM PANELU
   ──────────────────────────────────────────────────────────── */
function showOcrResult(text) {
  const out = document.getElementById('ocrOutput');
  if (!out) return;
  out.value = text;

  /* Otwórz sekcję OCR w prawym panelu */
  const sec = document.getElementById('ocrSection');
  if (sec) sec.open = true;

  /* Otwórz prawy panel jeśli schowany */
  const rp = document.getElementById('rightPanel');
  if (rp) rp.classList.add('open');
}

window.runOCR = runOCR;
