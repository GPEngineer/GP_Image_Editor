/* ============================================================
   GP Photo Studio 2.1 — layers.js  v4.1
   Layer system: raster + text layers, opacity, flatten, composite rendering
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   LAYER STATE
   ──────────────────────────────────────────────────────────── */
window.GP_Layers = {
  list   : [],   // array of layers (index 0 = topmost)
  active : 0     // index of active layer
};

let _layerIdCounter = 1;

/* ────────────────────────────────────────────────────────────
   LAYER CREATION
   ──────────────────────────────────────────────────────────── */
function createRasterLayer(name, imageElement) {
  const cv = document.createElement('canvas');
  if (imageElement) {
    cv.width  = imageElement.naturalWidth  || imageElement.width;
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
    text: 'Double-click to edit',
    fontFamily:'DM Sans', fontSize:24,
    fontColor:'#ffffff', bold:false, italic:false,
    bgColor: null,
    x:40, y:40
  };
}

/* ────────────────────────────────────────────────────────────
   PUBLIC API
   ──────────────────────────────────────────────────────────── */
function addRasterLayer() {
  const layer = createRasterLayer(`Layer ${_layerIdCounter}`);
  GP_Layers.list.unshift(layer);
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

      /* Update GP.image */
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

  /* Render top into bottom */
  const ctx = bottom.canvas.getContext('2d');
  ctx.save();
  ctx.globalAlpha = top.opacity / 100;
  if (top.type === 'raster') {
    ctx.drawImage(top.canvas, 0, 0);
  } else {
    drawTextLayer(ctx, top);
  }
  ctx.restore();

  GP_Layers.list.splice(idx, 1);
  GP_Layers.active = Math.max(0, idx - 1);
  refreshLayersUI();
  compositeRender();
  saveHistory && saveHistory('Merge Down');
  showToast('✓ Merged down.');
}

function setLayerOpacity(idx, value) {
  if (GP_Layers.list[idx]) {
    GP_Layers.list[idx].opacity = value;
    compositeRender();
  }
}

function toggleLayerVisibility(idx) {
  if (GP_Layers.list[idx]) {
    GP_Layers.list[idx].visible = !GP_Layers.list[idx].visible;
    const btn = document.querySelector(`.layer-vis[data-idx="${idx}"]`);
    if (btn) btn.innerHTML = GP_Layers.list[idx].visible
      ? `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 8 C3 4 13 4 15 8 C13 12 3 12 1 8Z"/><circle cx="8" cy="8" r="2.5"/></svg>`
      : `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><line x1="2" y1="2" x2="14" y2="14"/><path d="M5 5C3 6.5 1 8 1 8S5 13 8 13C9.5 13 11 12.3 12 11"/><path d="M10.5 4C9.7 3.4 8.9 3 8 3C5 3 1 8 1 8"/></svg>`;
    compositeRender();
  }
}

function moveLayerUp(idx) {
  if (idx <= 0) return;
  [GP_Layers.list[idx], GP_Layers.list[idx-1]] = [GP_Layers.list[idx-1], GP_Layers.list[idx]];
  GP_Layers.active = idx - 1;
  refreshLayersUI(); compositeRender();
}

function moveLayerDown(idx) {
  if (idx >= GP_Layers.list.length - 1) return;
  [GP_Layers.list[idx], GP_Layers.list[idx+1]] = [GP_Layers.list[idx+1], GP_Layers.list[idx]];
  GP_Layers.active = idx + 1;
  refreshLayersUI(); compositeRender();
}

/* ────────────────────────────────────────────────────────────
   COMPOSITE RENDER
   ──────────────────────────────────────────────────────────── */
function compositeRender() {
  if (typeof renderImage === 'function') renderImage();
}

function getRenderedCanvas() {
  const src = document.getElementById('editorCanvas');
  if (!GP_Layers.list.length) return src;

  const tmp = document.createElement('canvas');
  tmp.width  = src.width;
  tmp.height = src.height;
  const ctx = tmp.getContext('2d');
  drawAllLayersToCtx(ctx, tmp.width, tmp.height);
  return tmp;
}
window.getRenderedCanvas = getRenderedCanvas;

function drawAllLayersToCtx(ctx, w, h) {
  /* Draw bottom-to-top */
  for (let i = GP_Layers.list.length - 1; i >= 0; i--) {
    const layer = GP_Layers.list[i];
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity / 100;
    if (layer.type === 'raster') {
      ctx.drawImage(layer.canvas, 0, 0, w, h);
    } else {
      drawTextLayer(ctx, layer);
    }
    ctx.restore();
  }
}

function drawTextLayer(ctx, layer) {
  const style = `${layer.bold?'bold ':''} ${layer.italic?'italic ':''} ${layer.fontSize}px "${layer.fontFamily}",sans-serif`;
  ctx.font    = style.trim();
  const lines = layer.text.split('\n');
  const lh    = layer.fontSize * 1.4;

  /* Text block background */
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
   LAYERS UI
   ──────────────────────────────────────────────────────────── */
function refreshLayersUI() {
  const list = document.getElementById('layersList');
  if (!list) return;

  list.innerHTML = '';

  GP_Layers.list.forEach((layer, idx) => {
    const item = document.createElement('div');
    item.className = 'layer-item' + (idx === GP_Layers.active ? ' is-active' : '');
    item.dataset.idx = idx;

    const eyeSVG  = layer.visible
      ? `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 8 C3 4 13 4 15 8 C13 12 3 12 1 8Z"/><circle cx="8" cy="8" r="2.5"/></svg>`
      : `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><line x1="2" y1="2" x2="14" y2="14"/><path d="M4 6C2.5 7 1 8 1 8S5 13 8 13" stroke-linecap="round"/><path d="M12 10C13.5 9 15 8 15 8S11 3 8 3" stroke-linecap="round"/></svg>`;
    const typeSVG = layer.type === 'text'
      ? `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="8" y1="4" x2="8" y2="12"/><line x1="4" y1="4" x2="12" y2="4"/></svg>`
      : `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="12" height="12" rx="1"/></svg>`;

    item.innerHTML = `
      <button class="layer-btn layer-vis" data-idx="${idx}" title="Toggle visibility">${eyeSVG}</button>
      <span class="layer-type">${typeSVG}</span>
      <span class="layer-name" title="${layer.name}">${layer.name}</span>
      <div class="layer-controls">
        <button class="layer-btn layer-up"  data-idx="${idx}" title="Move up">
          <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="4,10 8,6 12,10"/></svg>
        </button>
        <button class="layer-btn layer-dn"  data-idx="${idx}" title="Move down">
          <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg>
        </button>
        <button class="layer-btn layer-del" data-idx="${idx}" title="Delete">
          <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
        </button>
      </div>
    `;

    /* Click = select active layer */
    item.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      GP_Layers.active = idx;
      refreshLayersUI();
      updateTextToolbar();
    });

    list.appendChild(item);

    /* Opacity slider */
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

  /* Wire up buttons */
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
   TEXT TOOLBAR — active when text layer is selected
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

  /* Sync controls */
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
   INIT — create layer on first image load
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Layer section buttons */
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

  /* Create layer on first image load */
  const origLoad = window.loadImageFile;
  window.loadImageFile = function(file) {
    origLoad(file);
    /* Wait for load */
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
   EXPORTS
   ──────────────────────────────────────────────────────────── */
window.addRasterLayer    = addRasterLayer;
window.addTextLayer      = addTextLayer;
window.flattenAllLayers  = flattenAllLayers;
window.compositeRender   = compositeRender;
window.refreshLayersUI   = refreshLayersUI;
window.updateTextToolbar = updateTextToolbar;

/* Update layer counter in right panel */
const _origRefreshLayersUI = window.refreshLayersUI;
window.refreshLayersUI = function() {
  _origRefreshLayersUI && _origRefreshLayersUI();
  const el = document.getElementById('infoLayers');
  if (el) el.textContent = GP_Layers.list.length;
};
