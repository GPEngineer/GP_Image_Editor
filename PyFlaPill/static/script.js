function updateImage() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);
  formData.append("brightness", brightness.value);
  formData.append("contrast", contrast.value);
  formData.append("sharpness", sharpness.value);
  formData.append("saturation", saturation.value);
  formData.append("whiten", whiten.value);

  fetch("/process", {
    method: "POST",
    body: formData,
  })
    .then((r) => r.blob())
    .then((blob) => {
      document.getElementById("preview").src = URL.createObjectURL(blob);
    });
}

document.querySelectorAll("input[type=range]").forEach((slider) => {
  slider.addEventListener("input", updateImage);
});

document.getElementById("fileInput").addEventListener("change", updateImage);
