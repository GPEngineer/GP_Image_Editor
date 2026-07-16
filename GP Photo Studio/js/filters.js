/* ============================================================
   GP Photo Studio 2.1 — filters.js
   Placeholder + applyVignette helper
   ============================================================ */
"use strict";

/* Future custom pixel-manipulation filters go here */

window.applyVignette = function(ctx, width, height, strength) {
  if (strength <= 0) return;
  const s = strength / 100;
  const gr = ctx.createRadialGradient(
    width/2, height/2, Math.min(width,height)*0.3,
    width/2, height/2, Math.max(width,height)*0.75
  );
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(0,0,0,${Math.min(s,1)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};
