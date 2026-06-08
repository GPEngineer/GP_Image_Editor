/* ============================================================
   GP Photo Studio 2.1 — color-palette.js  v4.0
   Paleta kolorów RGB / HSV, podgląd hex, kolory użytkownika,
   próbnik koloru z obrazu (hover na canvas)
   ============================================================ */
"use strict";

/* ────────────────────────────────────────────────────────────
   STAN
   ──────────────────────────────────────────────────────────── */
let _currentColor = { r:61, g:158, b:255 };
let _colorMode    = 'rgb';
let _userColors   = JSON.parse(localStorage.getItem('GP_UserColors') || '[]');

/* ────────────────────────────────────────────────────────────
   KONWERSJE
   ──────────────────────────────────────────────────────────── */
function rgbToHex(r,g,b) {
  return [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  if (hex.length !== 6 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return { r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16) };
}
function rgbToHsv(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  let h=0, s= max===0 ? 0 : d/max, v=max;
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
   AKTUALIZACJA UI
   ──────────────────────────────────────────────────────────── */
function updateColorUI(source) {
  const {r,g,b} = _currentColor;
  const hex = rgbToHex(r,g,b);

  const swatch    = document.getElementById('colorSwatch');
  const hexInput  = document.getElementById('colorHex');
  if (swatch)   swatch.style.background   = '#'+hex;
  if (hexInput && source !== 'hex') hexInput.value = hex;

  if (_colorMode === 'rgb') {
    const ids = ['rSlider','gSlider','bSlider','rVal','gVal','bVal'];
    const vals = [r,g,b];
    ['r','g','b'].forEach((ch,i) => {
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
}

/* ────────────────────────────────────────────────────────────
   INICJALIZACJA
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Tryb RGB/HSV */
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

  /* Hex input */
  document.getElementById('colorHex')?.addEventListener('input', function() {
    const rgb = hexToRgb(this.value);
    if (rgb) { _currentColor = rgb; updateColorUI('hex'); }
  });

  /* RGB suwaki */
  ['r','g','b'].forEach(ch => {
    document.getElementById(ch+'Slider')?.addEventListener('input', function() {
      _currentColor[ch] = +this.value;
      updateColorUI('rgb');
    });
  });

  /* HSV suwaki */
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

  /* Dodaj kolor użytkownika */
  document.getElementById('addUserColorBtn')?.addEventListener('click', () => {
    const hex = '#' + rgbToHex(_currentColor.r, _currentColor.g, _currentColor.b);
    if (!_userColors.includes(hex)) {
      _userColors.push(hex);
      if (_userColors.length > 20) _userColors.shift();
      localStorage.setItem('GP_UserColors', JSON.stringify(_userColors));
    }
    renderUserColors();
  });

  renderUserColors();
  updateColorUI('init');

  /* Próbnik koloru — hover na canvas */
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

  /* Aktualizuj infoPanel przy render */
  const origRender = window.renderImage;
  window.renderImage = function() {
    if (origRender) origRender();
    const iz = document.getElementById('infoZoom');
    const is = document.getElementById('infoSize');
    const fi = document.getElementById('infoFile');
    if (iz) iz.textContent = GP.zoom + '%';
    if (is && GP.imageLoaded) is.textContent = `${GP.image.naturalWidth} × ${GP.image.naturalHeight}`;
    if (fi && GP.fileName) fi.textContent = GP.fileName;
  };
});

/* ────────────────────────────────────────────────────────────
   KOLORY UŻYTKOWNIKA
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

window.GP_Color = {
  getCurrent: () => ({..._currentColor}),
  getHex    : () => '#' + rgbToHex(_currentColor.r, _currentColor.g, _currentColor.b)
};
