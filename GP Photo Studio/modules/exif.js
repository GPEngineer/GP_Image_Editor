/* ==========================================================
   EXIF MODULE — ODCZYT + ZAPIS
   Wymaga: piexif.js
   ========================================================== */

function loadExifFromImage(dataURL) {
  try {
    const exif = piexif.load(dataURL);
    return exif;
  } catch (e) {
    console.warn("Brak EXIF lub błąd odczytu:", e);
    return null;
  }
}

function insertExifIntoJpeg(dataURL, exifObj) {
  try {
    const exifBytes = piexif.dump(exifObj);
    const newDataURL = piexif.insert(exifBytes, dataURL);
    return newDataURL;
  } catch (e) {
    console.warn("Błąd zapisu EXIF:", e);
    return dataURL;
  }
}

function setExifArtist(exifObj, artistName) {
  try {
    exifObj["0th"][piexif.ImageIFD.Artist] = artistName;
    return exifObj;
  } catch (e) {
    console.warn("Błąd ustawiania Artist:", e);
    return exifObj;
  }
}
