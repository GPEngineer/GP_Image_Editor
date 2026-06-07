/* ============================================================
   GP Photo Studio 2.1 — crop.js  v5.0
   Kadrowanie: wyśrodkowana ramka, drag całej ramki,
   drag każdej krawędzi, poprawna pozycja na canvas
   ============================================================ */
"use strict";

let _cropActive=false, _cropCv=null, _cropCtx=null;
let _cropRect={x:0,y:0,w:0,h:0};
let _drag={type:null,startX:0,startY:0,origRect:null};
const HANDLE_SIZE=8;

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('cropToolBtn')?.addEventListener('click',startCropTool);
  document.getElementById('applyCropToolBtn')?.addEventListener('click',applyCropTool);
  document.getElementById('cancelCropToolBtn')?.addEventListener('click',cancelCropTool);
});

/* ── START ── */
function startCropTool(){
  if(!GP.imageLoaded){showToast('Load an image first.');return;}
  if(_cropActive)return;
  _cropActive=true;

  const cv=document.getElementById('editorCanvas');
  const stage=document.getElementById('canvasStage');
  const zoom=GP.zoom/100;

  /* Nakładka dokładnie na canvas */
  _cropCv=document.createElement('canvas');
  _cropCv.width=cv.width; _cropCv.height=cv.height;

  const cvRect=cv.getBoundingClientRect();
  const stageRect=stage.getBoundingClientRect();

  _cropCv.style.cssText=[
    'position:absolute',
    `left:${cvRect.left-stageRect.left}px`,
    `top:${cvRect.top-stageRect.top}px`,
    `width:${cvRect.width}px`,
    `height:${cvRect.height}px`,
    'z-index:50',
    'cursor:crosshair'
  ].join(';');

  _cropCtx=_cropCv.getContext('2d');
  stage.appendChild(_cropCv);

  /* Domyślny crop = cały obraz wyśrodkowany */
  const margin=Math.min(cv.width,cv.height)*0.1;
  _cropRect={x:margin,y:margin,w:cv.width-margin*2,h:cv.height-margin*2};
  drawCropOverlay();

  _cropCv.addEventListener('mousedown',onCropDown);
  window.addEventListener('mousemove',onCropMove);
  window.addEventListener('mouseup',onCropUp);

  document.getElementById('cropToolbar').style.display='flex';
  document.getElementById('cropToolBtn').style.display='none';
  showToast('Crop: drag to adjust, then Apply.');
}

/* ── RYSOWANIE ── */
function drawCropOverlay(){
  if(!_cropCtx||!_cropCv)return;
  const W=_cropCv.width,H=_cropCv.height;
  const {x,y,w,h}=_cropRect;
  _cropCtx.clearRect(0,0,W,H);

  /* Ciemna maska */
  _cropCtx.fillStyle='rgba(0,0,0,0.55)';
  _cropCtx.fillRect(0,0,W,H);
  _cropCtx.clearRect(x,y,w,h);

  /* Ramka */
  _cropCtx.strokeStyle='#3d9eff'; _cropCtx.lineWidth=1.5;
  _cropCtx.strokeRect(x,y,w,h);

  /* Siatka 1/3 */
  _cropCtx.strokeStyle='rgba(61,158,255,0.3)'; _cropCtx.lineWidth=0.7;
  for(let i=1;i<3;i++){
    _cropCtx.beginPath();
    _cropCtx.moveTo(x+w*i/3,y); _cropCtx.lineTo(x+w*i/3,y+h);
    _cropCtx.moveTo(x,y+h*i/3); _cropCtx.lineTo(x+w,y+h*i/3);
    _cropCtx.stroke();
  }

  /* Narożniki */
  const c=10; _cropCtx.strokeStyle='#3d9eff'; _cropCtx.lineWidth=2.5;
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([cx,cy,sx,sy])=>{
    _cropCtx.beginPath(); _cropCtx.moveTo(cx+sx*c,cy); _cropCtx.lineTo(cx,cy); _cropCtx.lineTo(cx,cy+sy*c); _cropCtx.stroke();
  });

  /* Uchwyty krawędzi */
  _cropCtx.fillStyle='rgba(61,158,255,0.8)';
  const hs=HANDLE_SIZE/2;
  [[x+w/2,y],[x+w/2,y+h],[x,y+h/2],[x+w,y+h/2]].forEach(([hx,hy])=>{
    _cropCtx.fillRect(hx-hs,hy-hs,HANDLE_SIZE,HANDLE_SIZE);
  });

  /* Wymiary */
  _cropCtx.fillStyle='rgba(0,0,0,0.7)'; _cropCtx.fillRect(x+2,y+2,88,18);
  _cropCtx.fillStyle='#fff'; _cropCtx.font='11px "JetBrains Mono",monospace';
  _cropCtx.fillText(`${Math.round(w)} × ${Math.round(h)}`,x+6,y+14);
}

/* ── POZYCJA na canvas ── */
function getCvPos(e){
  const r=_cropCv.getBoundingClientRect();
  const sc=_cropCv.width/r.width;
  return{x:(e.clientX-r.left)*sc, y:(e.clientY-r.top)*sc};
}

/* ── HIT TEST ── */
function hitTest(pos){
  const {x,y,w,h}=_cropRect;
  const hs=HANDLE_SIZE;
  // Uchwyty środkowe krawędzi
  if(Math.abs(pos.x-(x+w/2))<hs&&Math.abs(pos.y-y)<hs) return 'n';
  if(Math.abs(pos.x-(x+w/2))<hs&&Math.abs(pos.y-(y+h))<hs) return 's';
  if(Math.abs(pos.y-(y+h/2))<hs&&Math.abs(pos.x-x)<hs) return 'w';
  if(Math.abs(pos.y-(y+h/2))<hs&&Math.abs(pos.x-(x+w))<hs) return 'e';
  // Wnętrze = drag całej ramki
  if(pos.x>x&&pos.x<x+w&&pos.y>y&&pos.y<y+h) return 'move';
  return 'new';
}

function onCropDown(e){
  if(e.button!==0)return;
  const pos=getCvPos(e);
  const hit=hitTest(pos);
  _drag={type:hit,startX:pos.x,startY:pos.y,origRect:{..._cropRect}};
  if(hit==='new'){_cropRect={x:pos.x,y:pos.y,w:0,h:0};}
  e.preventDefault();
}

function onCropMove(e){
  if(!_drag.type)return;
  const pos=getCvPos(e);
  const dx=pos.x-_drag.startX, dy=pos.y-_drag.startY;
  const or=_drag.origRect;
  const W=_cropCv.width, H=_cropCv.height;

  if(_drag.type==='new'){
    const x=Math.min(_drag.startX,pos.x), y=Math.min(_drag.startY,pos.y);
    _cropRect={x:Math.max(0,x),y:Math.max(0,y),w:Math.min(Math.abs(dx),W-Math.max(0,x)),h:Math.min(Math.abs(dy),H-Math.max(0,y))};
  } else if(_drag.type==='move'){
    _cropRect={...or,x:Math.max(0,Math.min(W-or.w,or.x+dx)),y:Math.max(0,Math.min(H-or.h,or.y+dy))};
  } else if(_drag.type==='n'){
    const ny=Math.max(0,or.y+dy); _cropRect={...or,y:ny,h:Math.max(10,or.h-dy)};
  } else if(_drag.type==='s'){
    _cropRect={...or,h:Math.max(10,Math.min(H-or.y,or.h+dy))};
  } else if(_drag.type==='w'){
    const nx=Math.max(0,or.x+dx); _cropRect={...or,x:nx,w:Math.max(10,or.w-dx)};
  } else if(_drag.type==='e'){
    _cropRect={...or,w:Math.max(10,Math.min(W-or.x,or.w+dx))};
  }

  /* Kursor */
  const cursors={move:'move',n:'n-resize',s:'s-resize',w:'w-resize',e:'e-resize',new:'crosshair'};
  _cropCv.style.cursor=cursors[_drag.type]||'crosshair';
  drawCropOverlay();
}

function onCropUp(){
  if(_drag.type==='new'&&_cropRect.w<2){_cropRect=_drag.origRect||_cropRect;}
  _drag={type:null};
  drawCropOverlay();
}

/* ── APPLY ── */
function applyCropTool(){
  if(!_cropActive)return;
  const {x,y,w,h}=_cropRect;
  if(w<2||h<2){showToast('Select a larger area.');return;}
  const src=document.getElementById('editorCanvas');
  const tmp=document.createElement('canvas');
  tmp.width=Math.round(w); tmp.height=Math.round(h);
  tmp.getContext('2d').drawImage(src,Math.round(x),Math.round(y),Math.round(w),Math.round(h),0,0,Math.round(w),Math.round(h));
  const img=new Image();
  img.onload=()=>{
    GP.image=img; GP.imageLoaded=true; GP.rotation=0; GP.freeRotation=0; GP.flipX=1; GP.flipY=1;
    src.width=img.naturalWidth; src.height=img.naturalHeight;
    const d=document.getElementById('imageDimensions'); if(d) d.textContent=`${img.naturalWidth} × ${img.naturalHeight} px`;
    cleanupCrop(); renderImage(); fitToScreen();
    if(typeof saveHistory==='function') saveHistory('Crop');
    showToast(`✓ Cropped to ${Math.round(w)} × ${Math.round(h)} px`);
  };
  img.src=tmp.toDataURL('image/png');
}

/* ── CANCEL ── */
function cancelCropTool(){cleanupCrop();showToast('Crop cancelled.');}

function cleanupCrop(){
  if(_cropCv){
    _cropCv.removeEventListener('mousedown',onCropDown);
    window.removeEventListener('mousemove',onCropMove);
    window.removeEventListener('mouseup',onCropUp);
    _cropCv.parentNode?.removeChild(_cropCv); _cropCv=null;
  }
  _cropActive=false;
  document.getElementById('cropToolbar').style.display='none';
  document.getElementById('cropToolBtn').style.display='';
}

window.startCropTool=startCropTool; window.applyCropTool=applyCropTool; window.cancelCropTool=cancelCropTool;
