/* ==========================================================
   TIFF EXPORT MODULE — PRAWIDZIWY TIFF
   Wymaga: tiff.js
   ========================================================== */

function saveAsTiff(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, width, height);

  const tiffData = {
    width: width,
    height: height,
    data: imageData.data,
  };

  const tiffBuffer = TIFF.encode(tiffData);

  const blob = new Blob([tiffBuffer], { type: "image/tiff" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "image.tiff";
  link.click();
}
