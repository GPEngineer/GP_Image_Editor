/* ============================================================
   GP Photo Studio 2.1 — rulers.js  v5.0
   Linijka pozioma (rulerX) + pionowa (rulerY)
   Linijka pionowa przylegająca do lewej krawędzi prawego panelu
   ============================================================ */
"use strict";

const R_SZ  = 20;
const R_BG  = '#192a40';
const R_TICK= '#3d9eff';
const R_TEXT= '#8ab0cc';

function drawRulers(){ drawRulerX(); drawRulerY(); }

function drawRulerX(){
  const el=document.getElementById('rulerX'); if(!el)return;
  const wrapper=document.getElementById('canvasWrapper');
  const W=wrapper.clientWidth;
  el.width=W; el.height=R_SZ;
  const ctx=el.getContext('2d');
  ctx.fillStyle=R_BG; ctx.fillRect(0,0,W,R_SZ);
  if(!GP.imageLoaded)return;

  const zoom=GP.zoom/100, dpi=GP.settings.rulerDpi||96, unit=GP.settings.rulerUnit||'px';
  const cv=document.getElementById('editorCanvas');
  const imgW=cv.width;
  const cvRect=cv.getBoundingClientRect(), wrRect=wrapper.getBoundingClientRect();
  const cLeft=cvRect.left-wrRect.left+wrapper.scrollLeft - (cv.offsetWidth*(zoom-1)/2);

  const ppu=unit==='mm'?dpi/25.4:1;
  const step=chooseSep(zoom*ppu), pxStep=step/ppu;

  ctx.strokeStyle=R_TICK; ctx.fillStyle=R_TEXT; ctx.font='9px "JetBrains Mono",monospace'; ctx.lineWidth=1; ctx.textBaseline='top';
  let imgPx=0;
  while(imgPx<=imgW+pxStep){
    const sx=cLeft+imgPx*zoom;
    if(sx<0){imgPx+=pxStep;continue;} if(sx>W+200)break;
    const x=Math.round(sx)+0.5;
    const lbl=unit==='mm'?(imgPx/ppu).toFixed(1):Math.round(imgPx).toString();
    const isMajor=(Math.round(imgPx)%(Math.round(pxStep)*5)===0);
    const tH=isMajor?R_SZ*0.6:R_SZ*0.35;
    ctx.beginPath(); ctx.moveTo(x,R_SZ-tH); ctx.lineTo(x,R_SZ); ctx.stroke();
    if(isMajor) ctx.fillText(lbl,x+2,2);
    imgPx+=pxStep;
  }
  ctx.fillStyle=R_TICK; ctx.font='8px sans-serif'; ctx.fillText(unit,2,2);
}

function drawRulerY(){
  const el=document.getElementById('rulerY'); if(!el)return;
  const wrapper=document.getElementById('canvasWrapper');
  const H=wrapper.clientHeight;
  el.width=R_SZ; el.height=H;
  const ctx=el.getContext('2d');
  ctx.fillStyle=R_BG; ctx.fillRect(0,0,R_SZ,H);
  if(!GP.imageLoaded)return;

  const zoom=GP.zoom/100, dpi=GP.settings.rulerDpi||96, unit=GP.settings.rulerUnit||'px';
  const cv=document.getElementById('editorCanvas');
  const imgH=cv.height;
  const cvRect=cv.getBoundingClientRect(), wrRect=wrapper.getBoundingClientRect();
  const cTop=cvRect.top-wrRect.top+wrapper.scrollTop - (cv.offsetHeight*(zoom-1)/2);

  const ppu=unit==='mm'?dpi/25.4:1;
  const step=chooseSep(zoom*ppu), pxStep=step/ppu;

  ctx.strokeStyle=R_TICK; ctx.fillStyle=R_TEXT; ctx.font='9px "JetBrains Mono",monospace'; ctx.lineWidth=1;
  let imgPx=0;
  while(imgPx<=imgH+pxStep){
    const sy=cTop+imgPx*zoom;
    if(sy<0){imgPx+=pxStep;continue;} if(sy>H+200)break;
    const y=Math.round(sy)+0.5;
    const lbl=unit==='mm'?(imgPx/ppu).toFixed(1):Math.round(imgPx).toString();
    const isMajor=(Math.round(imgPx)%(Math.round(pxStep)*5)===0);
    const tW=isMajor?R_SZ*0.6:R_SZ*0.35;
    ctx.beginPath(); ctx.moveTo(R_SZ-tW,y); ctx.lineTo(R_SZ,y); ctx.stroke();
    if(isMajor){
      ctx.save(); ctx.translate(2,y-2); ctx.rotate(-Math.PI/2); ctx.fillText(lbl,0,0); ctx.restore();
    }
    imgPx+=pxStep;
  }
}

function chooseSep(scale){
  for(const s of [1,2,5,10,20,50,100,200,500,1000,2000,5000]) if(s*scale>=40) return s;
  return 5000;
}

document.addEventListener('DOMContentLoaded',()=>{
  const w=document.getElementById('canvasWrapper');
  w?.addEventListener('scroll',()=>{ if(GP.settings.showRulers) drawRulers(); });

  /* Odśwież linijki po zmianie rozmiaru okna */
  window.addEventListener('resize',()=>{ if(GP.settings.showRulers) drawRulers(); });
});

window.drawRulers=drawRulers;
