/* ============================================================
   GP Photo Studio 2.1 — color-palette.js  v4.1
   Color picker: RGB / HSV, hex input, user swatches,
   canvas color sampler, color popup on left panel swatch
   ============================================================ */
"use strict";

let _currentColor = { r: 61, g: 158, b: 255 };
let _colorMode    = 'rgb';
let _userColors   = [];

/* Load saved user colors */
try {
  const saved = localStorage.getItem('GP_UserColors');
  if (saved) _userColors = JSON.parse(saved);
} catch(e) {}

/* ────────────────────────────────────────────────────────────
   COLOR CONVERSIONS
   ──────────────────────────────────────────────────────────── */
function rgbToHex(r,g,b) {
  return [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (isNaN(n)) return null;
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function rgbToHsv(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  let h=0, s=max===0 ? 0 : d/max, v=max;
  if (d>0) {
    if (max===r) h=((g-b)/d)%6;
    else if (max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h=Math.round(h*60); if(h<0) h+=360;
  }
  return { h, s:Math.round(s*100), v:Math.round(v*100) };
}
function hsvToRgb(h,s,v) {
  s/=100; v/=100;
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c;
  let r=0,g=0,b=0;
  if      (h<60)  {r=c;g=x;}
  else if (h<120) {r=x;g=c;}
  else if (h<180) {g=c;b=x;}
  else if (h<240) {g=x;b=c;}
  else if (h<300) {r=x;b=c;}
  else            {r=c;b=x;}
  return { r:Math.round((r+m)*255), g:Math.round((g+m)*255), b:Math.round((b+m)*255) };
}

/* ────────────────────────────────────────────────────────────
   UPDATE UI
   ──────────────────────────────────────────────────────────── */
function updateColorUI(source) {
  const {r,g,b} = _currentColor;
  const hex = rgbToHex(r,g,b);

  const swatch   = document.getElementById('colorSwatch');
  const hexInput = document.getElementById('colorHex');
  if (swatch)   swatch.style.background   = '#'+hex;
  if (hexInput && source !== 'hex') hexInput.value = hex;

  if (_colorMode === 'rgb') {
    ['r','g','b'].forEach((ch,i) => {
      const vals = [r,g,b];
      const sl = document.getElementById(ch+'Slider');
      const vl = document.getElementById(ch+'Val');
      if (sl && source!=='rgb') sl.value = vals[i];
      if (vl) vl.textContent = vals[i];
    });
  } else {
    const {h,s,v} = rgbToHsv(r,g,b);
    [['hsvH',h,'hsvHVal'],['hsvS',s,'hsvSVal'],['hsvV',v,'hsvVVal']].forEach(([id,val,lblId]) => {
      const sl = document.getElementById(id);
      const lb = document.getElementById(lblId);
      if (sl && source!=='hsv') sl.value = val;
      if (lb) lb.textContent = val;
    });
  }

  /* Also sync the popup if open */
  _syncPopup(hex);
}

/* ────────────────────────────────────────────────────────────
   COLOR POPUP (left panel swatch → same picker as toolbar)
   ──────────────────────────────────────────────────────────── */
let _popupOpen = false;
let _popupEl   = null;

function _buildColorPopup() {
  if (_popupEl) return _popupEl;

  const el = document.createElement('div');
  el.id = 'colorSwatchPopup';
  el.className = 'color-popup';
  el.innerHTML = `
    <div class="color-popup__header">Color Picker</div>
    <div class="color-popup__modes">
      <button class="btn btn--sm color-popup-mode-btn is-active" data-mode="rgb">RGB</button>
      <button class="btn btn--sm color-popup-mode-btn" data-mode="hsv">HSV</button>
    </div>
    <div class="color-popup__hex-row">
      <span class="color-hex-hash">#</span>
      <input type="text" id="popupColorHex" class="color-hex-input" maxlength="6" spellcheck="false"/>
      <div class="color-popup__preview" id="popupColorPreview"></div>
    </div>
    <div id="popupRgbControls">
      <div class="control"><div class="control__row"><span class="control__name">R</span><span class="control__value" id="popupRVal">61</span></div><input type="range" id="popupRSlider" min="0" max="255" class="slider-r"/></div>
      <div class="control"><div class="control__row"><span class="control__name">G</span><span class="control__value" id="popupGVal">158</span></div><input type="range" id="popupGSlider" min="0" max="255" class="slider-g"/></div>
      <div class="control"><div class="control__row"><span class="control__name">B</span><span class="control__value" id="popupBVal">255</span></div><input type="range" id="popupBSlider" min="0" max="255" class="slider-b"/></div>
    </div>
    <div id="popupHsvControls" style="display:none">
      <div class="control"><div class="control__row"><span class="control__name">H</span><span class="control__value" id="popupHsvHVal">0</span></div><input type="range" id="popupHsvH" min="0" max="360" class="slider-h"/></div>
      <div class="control"><div class="control__row"><span class="control__name">S</span><span class="control__value" id="popupHsvSVal">0</span></div><input type="range" id="popupHsvS" min="0" max="100" class="slider-s"/></div>
      <div class="control"><div class="control__row"><span class="control__name">V</span><span class="control__value" id="popupHsvVVal">0</span></div><input type="range" id="popupHsvV" min="0" max="100" class="slider-v"/></div>
    </div>
    <div class="color-popup__saved-row">
      <span class="section-sublabel">Saved Colors</span>
      <button class="btn btn--sm btn--ghost" id="popupAddColorBtn" title="Save current color">+ Save</button>
    </div>
    <div class="user-colors" id="popupUserColors"></div>
  `;
  document.body.appendChild(el);
  _popupEl = el;

  /* Mode switch */
  el.querySelectorAll('.color-popup-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.color-popup-mode-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      _colorMode = btn.dataset.mode;
      document.querySelectorAll('.color-mode-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.mode === _colorMode);
      });
      document.getElementById('rgbControls').style.display = _colorMode==='rgb' ? '' : 'none';
      document.getElementById('hsvControls').style.display = _colorMode==='hsv' ? '' : 'none';
      el.querySelector('#popupRgbControls').style.display = _colorMode==='rgb' ? '' : 'none';
      el.querySelector('#popupHsvControls').style.display = _colorMode==='hsv' ? '' : 'none';
      updateColorUI('mode');
    });
  });

  /* Hex */
  el.querySelector('#popupColorHex')?.addEventListener('input', function() {
    const rgb = hexToRgb(this.value);
    if (rgb) { _currentColor = rgb; updateColorUI('hex'); }
  });

  /* RGB sliders */
  ['r','g','b'].forEach(ch => {
    el.querySelector(`#popup${ch.toUpperCase()}Slider`)?.addEventListener('input', function() {
      _currentColor[ch] = +this.value;
      updateColorUI('rgb');
    });
  });

  /* HSV sliders */
  function onPopupHsvChange() {
    const h = +(el.querySelector('#popupHsvH')?.value||0);
    const s = +(el.querySelector('#popupHsvS')?.value||0);
    const v = +(el.querySelector('#popupHsvV')?.value||0);
    _currentColor = hsvToRgb(h,s,v);
    updateColorUI('hsv');
  }
  ['popupHsvH','popupHsvS','popupHsvV'].forEach(id => {
    el.querySelector('#'+id)?.addEventListener('input', onPopupHsvChange);
  });

  /* Save color */
  el.querySelector('#popupAddColorBtn')?.addEventListener('click', () => {
    const hex = '#' + rgbToHex(_currentColor.r, _currentColor.g, _currentColor.b);
    if (!_userColors.includes(hex)) {
      _userColors.push(hex);
      if (_userColors.length > 20) _userColors.shift();
      localStorage.setItem('GP_UserColors', JSON.stringify(_userColors));
    }
    renderUserColors();
    _renderPopupUserColors();
  });

  /* Close on outside click */
  document.addEventListener('mousedown', e => {
    if (_popupOpen && !_popupEl.contains(e.target) &&
        e.target.id !== 'colorSwatch') {
      _closePopup();
    }
  });

  return el;
}

function _syncPopup(hex) {
  if (!_popupEl || !_popupOpen) return;
  const {r,g,b} = _currentColor;

  const ph = _popupEl.querySelector('#popupColorHex');
  const pp = _popupEl.querySelector('#popupColorPreview');
  if (ph) ph.value = hex;
  if (pp) pp.style.background = '#'+hex;

  if (_colorMode === 'rgb') {
    const map = { r, g, b };
    ['r','g','b'].forEach(ch => {
      const sl = _popupEl.querySelector(`#popup${ch.toUpperCase()}Slider`);
      const vl = _popupEl.querySelector(`#popup${ch.toUpperCase()}Val`);
      if (sl) sl.value = map[ch];
      if (vl) vl.textContent = map[ch];
    });
  } else {
    const {h,s,v} = rgbToHsv(r,g,b);
    [['popupHsvH',h,'popupHsvHVal'],['popupHsvS',s,'popupHsvSVal'],['popupHsvV',v,'popupHsvVVal']]
      .forEach(([id,val,lblId]) => {
        const sl = _popupEl.querySelector('#'+id);
        const lb = _popupEl.querySelector('#'+lblId);
        if (sl) sl.value = val;
        if (lb) lb.textContent = val;
      });
  }
}

function _renderPopupUserColors() {
  if (!_popupEl) return;
  const container = _popupEl.querySelector('#popupUserColors');
  if (!container) return;
  container.innerHTML = '';
  if (_userColors.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">No saved colors</span>';
    return;
  }
  _userColors.forEach((hex,i) => {
    const sw = document.createElement('div');
    sw.className = 'user-color-swatch';
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', () => {
      const rgb = hexToRgb(hex);
      if (rgb) { _currentColor = rgb; updateColorUI('swatch'); }
    });
    container.appendChild(sw);
  });
}

function _openPopup(anchorEl) {
  _buildColorPopup();
  const rect = anchorEl.getBoundingClientRect();
  /* Position below (or above if near bottom) */
  let top  = rect.bottom + 6;
  let left = rect.left;
  const ph = 340; /* approx popup height */
  if (top + ph > window.innerHeight) top = rect.top - ph - 6;
  if (left + 220 > window.innerWidth) left = window.innerWidth - 226;
  _popupEl.style.top  = top  + 'px';
  _popupEl.style.left = left + 'px';
  _popupEl.style.display = 'block';
  _popupOpen = true;

  /* Sync current color into popup */
  const {r,g,b} = _currentColor;
  _syncPopup(rgbToHex(r,g,b));
  _renderPopupUserColors();
}

function _closePopup() {
  if (_popupEl) _popupEl.style.display = 'none';
  _popupOpen = false;
}

/* ────────────────────────────────────────────────────────────
   USER COLOR SWATCHES (main panel)
   ──────────────────────────────────────────────────────────── */
function renderUserColors() {
  const container = document.getElementById('userColors');
  if (!container) return;
  container.innerHTML = '';
  if (_userColors.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">No saved colors</span>';
    return;
  }
  _userColors.forEach((hex,i) => {
    const sw = document.createElement('div');
    sw.className = 'user-color-swatch';
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', () => {
      const rgb = hexToRgb(hex);
      if (rgb) { _currentColor = rgb; updateColorUI('swatch'); }
    });
    sw.addEventListener('contextmenu', e => {
      e.preventDefault();
      _userColors.splice(i,1);
      localStorage.setItem('GP_UserColors', JSON.stringify(_userColors));
      renderUserColors();
    });
    container.appendChild(sw);
  });
}

/* ────────────────────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Mode switch (main panel) */
  document.querySelectorAll('.color-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-mode-btn').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      _colorMode = btn.dataset.mode;
      document.getElementById('rgbControls').style.display = _colorMode==='rgb' ? '' : 'none';
      document.getElementById('hsvControls').style.display = _colorMode==='hsv' ? '' : 'none';
      updateColorUI('mode');
    });
  });

  /* Hex input (main panel) */
  document.getElementById('colorHex')?.addEventListener('input', function() {
    const rgb = hexToRgb(this.value);
    if (rgb) { _currentColor = rgb; updateColorUI('hex'); }
  });

  /* RGB sliders (main panel) */
  ['r','g','b'].forEach(ch => {
    document.getElementById(ch+'Slider')?.addEventListener('input', function() {
      _currentColor[ch] = +this.value;
      updateColorUI('rgb');
    });
  });

  /* HSV sliders (main panel) */
  function onHsvChange() {
    const h = +(document.getElementById('hsvH')?.value||0);
    const s = +(document.getElementById('hsvS')?.value||0);
    const v = +(document.getElementById('hsvV')?.value||0);
    _currentColor = hsvToRgb(h,s,v);
    updateColorUI('hsv');
  }
  ['hsvH','hsvS','hsvV'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', onHsvChange);
  });

  /* Save user color (main panel) */
  document.getElementById('addUserColorBtn')?.addEventListener('click', () => {
    const hex = '#' + rgbToHex(_currentColor.r, _currentColor.g, _currentColor.b);
    if (!_userColors.includes(hex)) {
      _userColors.push(hex);
      if (_userColors.length > 20) _userColors.shift();
      localStorage.setItem('GP_UserColors', JSON.stringify(_userColors));
    }
    renderUserColors();
    _renderPopupUserColors();
  });

  /* ── COLOR SWATCH CLICK → open popup ── */
  document.getElementById('colorSwatch')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (_popupOpen) {
      _closePopup();
    } else {
      _openPopup(this);
    }
  });

  renderUserColors();
  updateColorUI('init');

  /* ── Canvas color sampler ── */
  const cw = document.getElementById('canvasWrapper');
  cw?.addEventListener('mousemove', e => {
    if (!GP.imageLoaded) return;
    const cv    = document.getElementById('editorCanvas');
    const rect  = cv.getBoundingClientRect();
    const zoom  = GP.zoom / 100;
    const x     = Math.round((e.clientX - rect.left)  / zoom);
    const y     = Math.round((e.clientY - rect.top)   / zoom);
    if (x<0||y<0||x>=cv.width||y>=cv.height) return;

    const px = cv.getContext('2d').getImageData(x,y,1,1).data;
    const hex = '#' + rgbToHex(px[0],px[1],px[2]);

    const sw  = document.getElementById('pickedColorSwatch');
    const ph  = document.getElementById('pickedHex');
    const pr  = document.getElementById('pickedRgb');
    const pp  = document.getElementById('pickedPos');
    if (sw) sw.style.background = hex;
    if (ph) ph.textContent      = hex;
    if (pr) pr.textContent      = `${px[0]}, ${px[1]}, ${px[2]}`;
    if (pp) pp.textContent      = `${x} / ${y}`;
  });

  /* ── Update info panel on render ── */
  const origRender = window.renderImage;
  window.renderImage = function() {
    if (origRender) origRender();
    const iz = document.getElementById('infoZoom');
    const is = document.getElementById('infoSize');
    const fi = document.getElementById('infoFile');
    if (iz && GP.zoom) iz.textContent = GP.zoom + '%';
    if (is && GP.imageLoaded) is.textContent = `${GP.image.naturalWidth} × ${GP.image.naturalHeight}`;
    if (fi && GP.fileName) fi.textContent = GP.fileName;
  };
});

window.GP_Color = {
  getCurrent: () => ({..._currentColor}),
  getHex    : () => '#' + rgbToHex(_currentColor.r, _currentColor.g, _currentColor.b)
};
