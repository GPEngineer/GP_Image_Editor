from flask import Flask, render_template, request, send_file
from PIL import Image, ImageEnhance, ImageOps
import io

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process():
    file = request.files["image"]
    img = Image.open(file.stream)

    # Konwersja RGBA → RGB
    if img.mode == "RGBA":
        img = img.convert("RGB")

    # Pobranie parametrów z suwaków
    brightness = float(request.form["brightness"])
    contrast = float(request.form["contrast"])
    sharpness = float(request.form["sharpness"])
    saturation = float(request.form["saturation"])
    whiten = float(request.form["whiten"])

    # Jasność
    img = ImageEnhance.Brightness(img).enhance(brightness)

    # Kontrast
    img = ImageEnhance.Contrast(img).enhance(contrast)

    # Ostrość
    img = ImageEnhance.Sharpness(img).enhance(sharpness)

    # Saturacja
    img = ImageEnhance.Color(img).enhance(saturation)

    # Whitening (rozjaśnianie bieli)
    img = ImageOps.autocontrast(img, cutoff=int(whiten))

    # Zwracanie obrazu do podglądu
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    return send_file(buf, mimetype="image/jpeg")

@app.route("/save", methods=["POST"])
def save():
    file = request.files["image"]
    filename = request.form["filename"]

    img = Image.open(file.stream)
    if img.mode == "RGBA":
        img = img.convert("RGB")

    output_path = f"{filename}.jpg"
    img.save(output_path)

    return f"Zapisano jako {output_path}"

if __name__ == "__main__":
    app.run(debug=True)
