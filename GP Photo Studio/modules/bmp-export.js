/* ==========================================================
   BMP EXPORT MODULE — PRAWIDZIWY BMP
   Wymaga: bmp.js
   ========================================================== */

function saveAsBmp(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, width, height);

  const bmpData = bmp.encode({
    data: imageData.data,
    width: width,
    height: height,
  });

  const blob = new Blob([bmpData.data], { type: "image/bmp" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "image.bmp";
  link.click();
}
