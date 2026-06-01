/* ==========================================================
   GP Image Editor
   Copyright © Grzegorz Pieniak
   Part 1
   ========================================================== */
/*
let originalImage = null;
let imageLoaded = false;
let currentZoom = 100;
*/

let originalImage = null;
let imageLoaded = false;
let currentZoom = 100;
let cropper = null;

let rotation = 0;
let flipX = 1;
let flipY = 1;

let history = [];
let historyIndex = -1;

const imageLoader = document.getElementById("imageLoader");
const previewImage = document.getElementById("previewImage");

const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const saturationSlider = document.getElementById("saturation");
const blurSlider = document.getElementById("blur");
const grayscaleSlider = document.getElementById("grayscale");
const sharpnessSlider = document.getElementById("sharpness");
const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const saturationValue = document.getElementById("saturationValue");
const blurValue = document.getElementById("blurValue");
const grayscaleValue = document.getElementById("grayscaleValue");
const sharpnessValue = document.getElementById("sharpnessValue");
const zoomValue = document.getElementById("zoomValue");

/* ==========================================================
   IMAGE LOAD
   ========================================================== */

imageLoader.addEventListener("change", (event) => {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {

        originalImage = e.target.result;

        previewImage.src = originalImage;
        previewImage.style.display = "block";

        /*
        imageLoaded = true;

        applyFilters();
        */
        imageLoaded = true;
        applyFilters();
        saveHistory();
    };

    reader.readAsDataURL(file);

});

/* ==========================================================
   FILTERS
   ========================================================== */

function applyFilters() {

    if (!imageLoaded) return;

    brightnessValue.textContent = brightnessSlider.value;
    contrastValue.textContent = contrastSlider.value;
    saturationValue.textContent = saturationSlider.value;
    blurValue.textContent = blurSlider.value;
    sharpnessValue.textContent = sharpnessSlider.value;
    grayscaleValue.textContent = grayscaleSlider.value;

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    const saturation = saturationSlider.value;
    const blur = blurSlider.value;
    const grayscale = grayscaleSlider.value;

    /*previewImage.style.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
        saturate(${saturation}%)
        blur(${blur}px)
    `;*/

previewImage.style.filter = `
    brightness(${brightness}%)
    contrast(${contrast}%)
    saturate(${saturation}%)
    blur(${blur}px)
    grayscale(${grayscale}%)
`;

previewImage.style.transform =
`
scale(${currentZoom / 100})
rotate(${rotation}deg)
scaleX(${flipX})
scaleY(${flipY})
`;

}

/* ==========================================================
   SLIDERS
   ========================================================== */
/*
brightnessSlider.addEventListener("input", applyFilters);
contrastSlider.addEventListener("input", applyFilters);
saturationSlider.addEventListener("input", applyFilters);
blurSlider.addEventListener("input", applyFilters);
*/

[
    brightnessSlider,
    contrastSlider,
    saturationSlider,
    blurSlider,
    grayscaleSlider,
    sharpnessSlider
]
.forEach(slider => {

    slider.addEventListener(
        "input",
        () => {

            applyFilters();
            saveHistory();

        }
    );

});

/* ==========================================================
   RESET SINGLE
   ========================================================== */

document.querySelectorAll(".reset-btn").forEach(button => {

    button.addEventListener("click", () => {

        const target = button.dataset.target;

        const slider = document.getElementById(target);

        if (!slider) return;

        switch(target) {

            case "brightness":
                slider.value = 100;
                break;

            case "contrast":
                slider.value = 100;
                break;

            case "saturation":
                slider.value = 100;
                break;

            case "blur":
                slider.value = 0;
                break;

            case "sharpness":
                slider.value = 0;
                break;

            case "grayscale":
                slider.value = 0;
                break;
        }

        applyFilters();

    });

});

/* ==========================================================
   RESET ALL
   ========================================================== */

document
.getElementById("resetAllBtn")
.addEventListener("click", () => {

    brightnessSlider.value = 100;
    contrastSlider.value = 100;
    saturationSlider.value = 100;
    blurSlider.value = 0;
    grayscaleSlider.value = 0;
    
    currentZoom = 100;

    previewImage.style.transform = "scale(1)";

    zoomValue.textContent = "100%";

    applyFilters();

});

/* ==========================================================
   ZOOM
   ========================================================== */

document
.getElementById("zoomInBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    currentZoom += 10;

    updateZoom();

});

document
.getElementById("zoomOutBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    currentZoom -= 10;

    if (currentZoom < 10)
        currentZoom = 10;

    updateZoom();

});
/*
function updateZoom() {

    previewImage.style.transform =
        `scale(${currentZoom / 100})`;

    zoomValue.textContent =
        `${currentZoom}%`;

}*/

function updateZoom() {

    applyFilters();

    zoomValue.textContent =
        `${currentZoom}%`;

}


/* ==========================================================
   FIT SCREEN
   ========================================================== */

document
.getElementById("fitScreenBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    currentZoom = 100;

    updateZoom();

});

/* ==========================================================
   SAVE
   ========================================================== */

function saveImage(type, extension) {

    if (!imageLoaded) {

        alert("Please load image first.");
        return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();

    img.onload = function() {

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.filter = `
            brightness(${brightnessSlider.value}%)
            contrast(${contrastSlider.value}%)
            saturate(${saturationSlider.value}%)
            blur(${blurSlider.value}px)
        `;

        ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height
        );

        const link =
            document.createElement("a");

        const filename =
            prompt(
                "File name:",
                "edited_image"
            );

        if (!filename) return;

        link.download =
            `${filename}.${extension}`;

        link.href =
            canvas.toDataURL(type);

        link.click();

    };

    img.src = originalImage;

}

/* ==========================================================
   SAVE BUTTONS
   ========================================================== */

document
.getElementById("saveJpgBtn")
.addEventListener("click", () => {

    saveImage(
        "image/jpeg",
        "jpg"
    );

});

document
.getElementById("savePngBtn")
.addEventListener("click", () => {

    saveImage(
        "image/png",
        "png"
    );

});

document
.getElementById("saveWebpBtn")
.addEventListener("click", () => {

    saveImage(
        "image/webp",
        "webp"
    );

});

/* ==========================================================
   INITIAL VALUES
   ========================================================== */

brightnessValue.textContent = "100";
contrastValue.textContent = "100";
saturationValue.textContent = "100";
blurValue.textContent = "0";

zoomValue.textContent = "100%";

/* ==========================================================
   HISTORY
   ========================================================== */

function saveHistory() {

    if (!imageLoaded) return;

    const state = {

        brightness: brightnessSlider.value,
        contrast: contrastSlider.value,
        saturation: saturationSlider.value,
        blur: blurSlider.value,

        rotation: rotation,
        flipX: flipX,
        flipY: flipY,

        zoom: currentZoom

    };

    history.splice(historyIndex + 1);

    history.push(
        JSON.parse(JSON.stringify(state))
    );

    historyIndex =
        history.length - 1;

}

function restoreState(state) {

    brightnessSlider.value =
        state.brightness;

    contrastSlider.value =
        state.contrast;

    saturationSlider.value =
        state.saturation;

    blurSlider.value =
        state.blur;

    rotation =
        state.rotation;

    flipX =
        state.flipX;

    flipY =
        state.flipY;

    currentZoom =
        state.zoom;

    applyFilters();

}


/* ==========================================================
   ROTATE LEFT
   ========================================================== */

document
.getElementById("rotateLeftBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    rotation -= 90;

    applyFilters();

    saveHistory();

});

/* ==========================================================
   ROTATE RIGHT
   ========================================================== */

document
.getElementById("rotateRightBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    rotation += 90;

    applyFilters();

    saveHistory();

});


/* ==========================================================
   FLIP HORIZONTAL
   ========================================================== */

document
.getElementById("flipHorizontalBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    flipX *= -1;

    applyFilters();

    saveHistory();

});


/* ==========================================================
   FLIP VERTICAL
   ========================================================== */

document
.getElementById("flipVerticalBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    flipY *= -1;

    applyFilters();

    saveHistory();

});


/* ==========================================================
   UNDO
   ========================================================== */

document
.getElementById("undoBtn")
.addEventListener("click", () => {

    if (historyIndex <= 0)
        return;

    historyIndex--;

    restoreState(
        history[historyIndex]
    );

});


/* ==========================================================
   REDO
   ========================================================== */

document
.getElementById("redoBtn")
.addEventListener("click", () => {

    if (
        historyIndex >=
        history.length - 1
    )
        return;

    historyIndex++;

    restoreState(
        history[historyIndex]
    );

});


/* ==========================================================
   START CROP
   ========================================================== */

document
.getElementById("startCropBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    if (cropper)
        cropper.destroy();

cropper = new Cropper(
    previewImage,
    {
        viewMode: 1,
        autoCropArea: 0.8,

        crop(event) {

            document
            .getElementById("cropX")
            .value =
                Math.round(event.detail.x);

            document
            .getElementById("cropY")
            .value =
                Math.round(event.detail.y);

            document
            .getElementById("cropWidth")
            .value =
                Math.round(event.detail.width);

            document
            .getElementById("cropHeight")
            .value =
                Math.round(event.detail.height);

        }
    }
    );

});

/* ==========================================================
   CANCEL CROP
   ========================================================== */

document
.getElementById("cancelCropBtn")
.addEventListener("click", () => {

    if (!cropper) return;

    cropper.destroy();

    cropper = null;

});

/* ==========================================================
   APPLY CROP
   ========================================================== */

document
.getElementById("applyCropBtn")
.addEventListener("click", () => {

    if (!cropper) return;

    const canvas =
        cropper.getCroppedCanvas();

    originalImage =
        canvas.toDataURL("image/png");

    previewImage.src =
        originalImage;

    cropper.destroy();

    cropper = null;

    previewImage.onload = () => {

        applyFilters();

        saveHistory();

    };

});

/* ==========================================================
   CROP BY VALUES
   ========================================================== */

document
.getElementById("applyManualCropBtn")
.addEventListener("click", () => {

    if (!imageLoaded) return;

    const x =
        parseInt(
            document
            .getElementById("cropX")
            .value
        );

    const y =
        parseInt(
            document
            .getElementById("cropY")
            .value
        );

    const width =
        parseInt(
            document
            .getElementById("cropWidth")
            .value
        );

    const height =
        parseInt(
            document
            .getElementById("cropHeight")
            .value
        );

    const img = new Image();

    img.onload = () => {

        const canvas =
            document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx =
            canvas.getContext("2d");

        ctx.drawImage(
            img,
            x,
            y,
            width,
            height,
            0,
            0,
            width,
            height
        );

        originalImage =
            canvas.toDataURL("image/png");

        previewImage.src =
            originalImage;

        previewImage.onload = () => {

            applyFilters();

            saveHistory();

        };

    };

    img.src = originalImage;

});