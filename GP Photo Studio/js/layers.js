/* ============================================================
   GP Photo Studio 2.1 — layers.js  v4.0
   System warstw: rastrowe + tekstowe, drag-to-reorder,
   opacity, flatten, composite rendering
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   STAN WARSTW
   ──────────────────────────────────────────────────────────── */
window.GP_Layers = {
  list   : [],      // tablica warstw (indeks 0 = najwyższa)
  active : 0        // indeks aktywnej warstwy
};

/* Struktura warstwy:
   { id, type:'raster'|'text', name, visible, opacity,
     canvas (dla raster), 
     text, fontFamily, fontSize, fontColor, bold, italic,
     bgColor (dla bloku tekstu, null = transparent),
     x, y (pozycja tekstbloku)
   }
*/

let _layerIdCounter = 1;

/* ────────────────────────────────────────────────────────────
   TWORZENIE WARSTW
   ──────────────────────────────────────────────────────────── */
function createRasterLayer(name, imageElement) {
  const cv  = document.createElement('canvas');
  if (imageElement) {
    cv.width  = imageElement.naturalWidth || imageElement.width;
    cv.height = imageElement.naturalHeight || imageElement.height;
    cv.getContext('2d').drawImage(imageElement, 0, 0);
  } else {
    cv.width  = GP.imageLoaded ? GP.image.naturalWidth  : 800;
    cv.height = GP.imageLoaded ? GP.image.naturalHeight : 600;
  }
  return { id: _layerIdCounter++, type:'raster', name: name||'Layer', visible:true, opacity:100, canvas: cv };
}

function createTextLayer(name) {
  return {
    id: _layerIdCounter++, type:'text',
    name: name||'Text Layer', visible:true, opacity:100,
    text:'Double-click to edit',
    fontFamily:'DM Sans', fontSize:24,
    fontColor:'#ffffff', bold:false, italic:false,
    bgColor: null,   /* null = transparent */
    x:40, y:40
  };
}

/* ────────────────────────────────────────────────────────────
   PUBLICZNE API
   ──────────────────────────────────────────────────────────── */
function addRasterLayer() {
  const layer = createRasterLayer(`Layer ${_layerIdCounter}`);
  GP_Layers.list.unshift(layer);   // na górę listy
  GP_Layers.active = 0;
  refreshLayersUI();
  compositeRender();
  saveHistory && saveHistory('Add Raster Layer');
  showToast('✓ Raster layer added.');
}

function addTextLayer() {
  const layer = createTextLayer(`Text ${_layerIdCounter}`);
  GP_Layers.list.unshift(layer);
  GP_Layers.active = 0;
  refreshLayersUI();
  compositeRender();
  saveHistory && saveHistory('Add Text Layer');
  showToast('✓ Text layer added.');
}

function deleteActiveLayer() {
  if (GP_Layers.list.length <= 1) { showToast('Cannot delete the last layer.'); return; }
  GP_Layers.list.splice(GP_Layers.active, 1);
  GP_Layers.active = Math.min(GP_Layers.active, GP_Layers.list.length - 1);
  refreshLayersUI();
  compositeRender();
  saveHistory && saveHistory('Delete Layer');
}

function flattenAllLayers() {
  showConfirm('Flatten Image',
    'Merge all layers into one? This cannot be undone.',
    () => {
      const cv  = document.getElementById('editorCanvas');
      const tmp = document.createElement('canvas');
      tmp.width  = cv.width;
      tmp.height = cv.height;
      const ctx = tmp.getContext('2d');
      drawAllLayersToCtx(ctx, tmp.width, tmp.height);

      GP_Layers.list = [ createRasterLayer('Background') ];
      GP_Layers.list[0].canvas.width  = tmp.width;
      GP_Layers.list[0].canvas.height = tmp.height;
      GP_Layers.list[0].canvas.getContext('2d').drawImage(tmp, 0, 0);
      GP_Layers.active = 0;

      /* Aktualizuj GP.image */
      const img = new Image();
      img.onload = () => { GP.image = img; GP.imageLoaded = true; renderImage(); };
      img.src = tmp.toDataURL('image/png');

      refreshLayersUI();
      saveHistory && saveHistory('Flatten All');
      showToast('✓ All layers flattened.');
    });
}

function mergeDown() {
  const idx = GP_Layers.active;
  if (idx >= GP_Layers.list.length - 1) { showToast('No layer below to merge.'); return; }
  const top    = GP_Layers.list[idx];
  const bottom = GP_Layers.list[idx + 1];
  if (bottom.type !== 'raster') { showToast('Can only merge down to a raster layer.'); return; }

  const ctx = bottom.canvas.getContext('2d');
  ctx.globalAlpha = top.opacity / 100;
  if (top.type === 'raster') {
    ctx.drawImage(top.canvas, 0, 0);
  } else {
    drawTextLayerToCtx(ctx, top);
  }
  ctx.globalAlpha = 1;

  GP_Layers.list.splice(idx, 1);
  GP_Layers.active = Math.max(0, idx - 1);
  refreshLayersUI();
  compositeRender();
  saveHistory && saveHistory('Merge Down');
}

function setLayerOpacity(idx, val) {
  if (!GP_Layers.list[idx]) return;
  GP_Layers.list[idx].opacity = val;
  compositeRender();
}

function toggleLayerVisibility(idx) {
  if (!GP_Layers.list[idx]) return;
  GP_Layers.list[idx].visible = !GP_Layers.list[idx].visible;
  refreshLayersUI();
  compositeRender();
}

function moveLayerUp(idx) {
  if (idx <= 0) return;
  [GP_Layers.list[idx], GP_Layers.list[idx-1]] = [GP_Layers.list[idx-1], GP_Layers.list[idx]];
  GP_Layers.active = idx - 1;
  refreshLayersUI();
  compositeRender();
}

function moveLayerDown(idx) {
  if (idx >= GP_Layers.list.length - 1) return;
  [GP_Layers.list[idx], GP_Layers.list[idx+1]] = [GP_Layers.list[idx+1], GP_Layers.list[idx]];
  GP_Layers.active = idx + 1;
  refreshLayersUI();
  compositeRender();
}

/* ────────────────────────────────────────────────────────────
   COMPOSITE RENDER — scala wszystkie warstwy na editorCanvas
   ──────────────────────────────────────────────────────────── */
function compositeRender() {
  if (!GP.imageLoaded) return;
  const cv  = document.getElementById('editorCanvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);

  /* Szachownica */
  if (typeof drawCheckerboardExt === 'function') {
    drawCheckerboardExt(ctx, cv.width, cv.height);
  }

  drawAllLayersToCtx(ctx, cv.width, cv.height);

  /* Zachowaj CSS zoom */
  cv.style.transform       = `scale(${GP.zoom / 100})`;
  cv.style.transformOrigin = 'center center';
}

function drawAllLayersToCtx(ctx, w, h) {
  /* Warstwy rysowane od dołu listy w górę (indeks najwyższy = dno) */
  for (let i = GP_Layers.list.length - 1; i >= 0; i--) {
    const layer = GP_Layers.list[i];
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity / 100;
    if (layer.type === 'raster' && layer.canvas) {
      ctx.drawImage(layer.canvas, 0, 0, w, h);
    } else if (layer.type === 'text') {
      drawTextLayerToCtx(ctx, layer);
    }
    ctx.globalAlpha = 1;
  }
}

function drawTextLayerToCtx(ctx, layer) {
  const style = `${layer.bold?'bold ':''} ${layer.italic?'italic ':''} ${layer.fontSize}px "${layer.fontFamily}",sans-serif`;
  ctx.font    = style.trim();
  const lines = layer.text.split('\n');
  const lh    = layer.fontSize * 1.4;

  /* Tło bloku tekstowego */
  if (layer.bgColor) {
    const maxW = lines.reduce((m,l) => Math.max(m, ctx.measureText(l).width), 0);
    const boxH = lines.length * lh + 8;
    ctx.fillStyle = layer.bgColor;
    ctx.fillRect(layer.x - 4, layer.y - layer.fontSize - 2, maxW + 8, boxH);
  }

  ctx.fillStyle = layer.fontColor;
  lines.forEach((line, i) => {
    ctx.fillText(line, layer.x, layer.y + i * lh);
  });
}

/* ────────────────────────────────────────────────────────────
   UI WARSTW
   ──────────────────────────────────────────────────────────── */
function refreshLayersUI() {
  const list = document.getElementById('layersList');
  if (!list) return;

  list.innerHTML = '';

  GP_Layers.list.forEach((layer, idx) => {
    const item = document.createElement('div');
    item.className = 'layer-item' + (idx === GP_Layers.active ? ' is-active' : '');
    item.dataset.idx = idx;

    const eyeIcon  = layer.visible ? '👁' : '🚫';
    const typeIcon = layer.type === 'text' ? '𝐓' : '▣';

    item.innerHTML = `
      <button class="layer-btn layer-vis" data-idx="${idx}" title="Toggle visibility">${eyeIcon}</button>
      <span class="layer-type">${typeIcon}</span>
      <span class="layer-name" title="${layer.name}">${layer.name}</span>
      <div class="layer-controls">
        <button class="layer-btn layer-up"   data-idx="${idx}" title="Move up">↑</button>
        <button class="layer-btn layer-dn"   data-idx="${idx}" title="Move down">↓</button>
        <button class="layer-btn layer-del"  data-idx="${idx}" title="Delete">✕</button>
      </div>
    `;

    /* Klik = aktywna warstwa */
    item.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return;
      GP_Layers.active = idx;
      refreshLayersUI();
      updateTextToolbar();
    });

    list.appendChild(item);

    /* Opacity suwak */
    const opRow = document.createElement('div');
    opRow.className = 'layer-opacity-row';
    opRow.innerHTML = `
      <span class="layer-op-label">Opacity</span>
      <input type="range" class="layer-op-slider" min="0" max="100" value="${layer.opacity}" data-idx="${idx}"/>
      <span class="layer-op-val">${layer.opacity}%</span>
    `;
    const sl  = opRow.querySelector('.layer-op-slider');
    const opv = opRow.querySelector('.layer-op-val');
    sl.addEventListener('input', () => {
      opv.textContent = sl.value + '%';
      setLayerOpacity(idx, +sl.value);
    });
    list.appendChild(opRow);
  });

  /* Podpięcie przycisków */
  list.querySelectorAll('.layer-vis').forEach(b => {
    b.addEventListener('click', () => toggleLayerVisibility(+b.dataset.idx));
  });
  list.querySelectorAll('.layer-up').forEach(b => {
    b.addEventListener('click', () => moveLayerUp(+b.dataset.idx));
  });
  list.querySelectorAll('.layer-dn').forEach(b => {
    b.addEventListener('click', () => moveLayerDown(+b.dataset.idx));
  });
  list.querySelectorAll('.layer-del').forEach(b => {
    b.addEventListener('click', () => {
      GP_Layers.active = +b.dataset.idx;
      deleteActiveLayer();
    });
  });
}

/* ────────────────────────────────────────────────────────────
   TOOLBAR TEKSTU — aktywny gdy aktywna warstwa = text
   ──────────────────────────────────────────────────────────── */
function updateTextToolbar() {
  const layer   = GP_Layers.list[GP_Layers.active];
  const toolbar = document.getElementById('textToolbar');
  if (!toolbar) return;

  if (!layer || layer.type !== 'text') {
    toolbar.style.display = 'none';
    return;
  }
  toolbar.style.display = 'flex';

  /* Synchronizuj kontrolki */
  const ff = document.getElementById('ttFontFamily');
  const fs = document.getElementById('ttFontSize');
  const fc = document.getElementById('ttFontColor');
  const bl = document.getElementById('ttBold');
  const it = document.getElementById('ttItalic');

  if (ff) ff.value = layer.fontFamily;
  if (fs) fs.value = layer.fontSize;
  if (fc) fc.value = layer.fontColor;
  if (bl) bl.classList.toggle('active', layer.bold);
  if (it) it.classList.toggle('active', layer.italic);
}

/* ────────────────────────────────────────────────────────────
   INICJALIZACJA — pierwsze załadowanie obrazu → tworzy warstwę
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Przyciski w sekcji Layers */
  document.getElementById('addRasterLayerBtn')?.addEventListener('click', addRasterLayer);
  document.getElementById('addTextLayerBtn')  ?.addEventListener('click', addTextLayer);
  document.getElementById('mergeDownBtn')      ?.addEventListener('click', mergeDown);
  document.getElementById('flattenAllBtn')     ?.addEventListener('click', flattenAllLayers);

  /* Text toolbar */
  const applyText = () => {
    const layer = GP_Layers.list[GP_Layers.active];
    if (!layer || layer.type !== 'text') return;
    const ff = document.getElementById('ttFontFamily');
    const fs = document.getElementById('ttFontSize');
    const fc = document.getElementById('ttFontColor');
    if (ff) layer.fontFamily = ff.value;
    if (fs) layer.fontSize   = +fs.value;
    if (fc) layer.fontColor  = fc.value;
    compositeRender();
  };

  document.getElementById('ttFontFamily')?.addEventListener('change', applyText);
  document.getElementById('ttFontSize')  ?.addEventListener('change', applyText);
  document.getElementById('ttFontColor') ?.addEventListener('input',  applyText);

  document.getElementById('ttBold')?.addEventListener('click', () => {
    const layer = GP_Layers.list[GP_Layers.active];
    if (layer?.type === 'text') { layer.bold = !layer.bold; updateTextToolbar(); compositeRender(); }
  });
  document.getElementById('ttItalic')?.addEventListener('click', () => {
    const layer = GP_Layers.list[GP_Layers.active];
    if (layer?.type === 'text') { layer.italic = !layer.italic; updateTextToolbar(); compositeRender(); }
  });
  document.getElementById('ttEditText')?.addEventListener('click', () => {
    const layer = GP_Layers.list[GP_Layers.active];
    if (!layer || layer.type !== 'text') return;
    const txt = prompt('Edit text (use \\n for new line):', layer.text.replace(/\n/g,'\\n'));
    if (txt !== null) { layer.text = txt.replace(/\\n/g,'\n'); compositeRender(); }
  });

  /* Twórz warstwę po załadowaniu pierwszego obrazu */
  const origLoad = window.loadImageFile;
  window.loadImageFile = function(file) {
    origLoad(file);
    /* Poczekaj na załadowanie */
    const check = setInterval(() => {
      if (!GP.imageLoaded) return;
      clearInterval(check);
      if (GP_Layers.list.length === 0) {
        const layer = createRasterLayer('Background', GP.image);
        GP_Layers.list = [layer];
        GP_Layers.active = 0;
        refreshLayersUI();
      }
    }, 100);
  };
});

/* ────────────────────────────────────────────────────────────
   EKSPORT
   ──────────────────────────────────────────────────────────── */
window.addRasterLayer   = addRasterLayer;
window.addTextLayer     = addTextLayer;
window.flattenAllLayers = flattenAllLayers;
window.compositeRender  = compositeRender;
window.refreshLayersUI  = refreshLayersUI;
window.updateTextToolbar= updateTextToolbar;

/* ────────────────────────────────────────────────────────────
   Aktualizuj licznik warstw w prawym panelu
   ──────────────────────────────────────────────────────────── */
const _origRefreshLayersUI = window.refreshLayersUI;
window.refreshLayersUI = function() {
  _origRefreshLayersUI && _origRefreshLayersUI();
  const el = document.getElementById('infoLayers');
  if (el) el.textContent = GP_Layers.list.length;
};
