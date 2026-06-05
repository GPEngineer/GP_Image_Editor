/* ==========================================================
   GP Photo Studio 2.0 Canvas Edition
   modules/exif.js  v3.0

   EXIF metadata preservation using piexif.js.
   Loaded before app.js; functions are called from export.js
   when saving JPEG files.
   ========================================================== */

"use strict";

/* ==========================================================
   EXIF STORE
   Populated when an image is loaded; consumed on JPEG export.
   ========================================================== */
window.GP_EXIF = {
  raw: null, // raw exif bytes from piexif (or null if none)
};

/* ==========================================================
   EXTRACT EXIF from a DataURL (JPEG only)
   ========================================================== */
function extractExif(dataURL) {
  if (typeof piexif === "undefined") return;
  try {
    const exifObj = piexif.load(dataURL);
    window.GP_EXIF.raw = piexif.dump(exifObj);
  } catch (e) {
    window.GP_EXIF.raw = null;
  }
}

/* ==========================================================
   INSERT EXIF into a JPEG DataURL
   Returns the modified dataURL, or the original on failure.
   ========================================================== */
function insertExif(jpegDataURL) {
  if (typeof piexif === "undefined") return jpegDataURL;
  if (!window.GP_EXIF.raw) return jpegDataURL;
  try {
    return piexif.insert(window.GP_EXIF.raw, jpegDataURL);
  } catch (e) {
    return jpegDataURL;
  }
}

/* ==========================================================
   HOOK into image load to capture EXIF
   ========================================================== */
const _originalLoadImage = window.loadImageFile;

/* We patch after DOMContentLoaded so app.js has already set up
   the FileReader. Instead of monkey-patching we listen on the
   same imageLoader change event but process the raw file first. */
window.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("imageLoader");
  if (!loader) return;

  loader.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "image/jpeg") {
      window.GP_EXIF.raw = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => extractExif(ev.target.result);
    reader.readAsDataURL(file);
  });
});

/* ==========================================================
   PUBLIC
   ========================================================== */
window.extractExif = extractExif;
window.insertExif = insertExif;
