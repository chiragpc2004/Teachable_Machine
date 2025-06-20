import os
import shutil
import joblib
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

from model.train import train_model

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path("D:/SageScan/model/sample_data")

@app.post("/upload")
def upload_image(label: str = Form(...), file: UploadFile = File(...)):
    label_dir = UPLOAD_DIR / label
    label_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = label_dir / file.filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"status": "saved", "label": label, "filename": file.filename}


@app.post("/train")
def train():
    return train_model()


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    model_path = Path("model/classifier.pkl")
    if not model_path.exists():
        return {"error": "No trained model found. Please train first."}

    try:
        image_bytes = file.file.read()
        img = Image.open(io.BytesIO(image_bytes)).resize((64, 64))
        img_array = np.array(img).flatten() / 255.0

        model = joblib.load(model_path)
        pred = model.predict([img_array])[0]
        probs = model.predict_proba([img_array])[0]
        confidence = float(np.max(probs))

        img.save("last_predicted_image.png")
        print(f"Predicted: {pred}, Confidence: {confidence}")

        return {
            "prediction": pred,
            "confidence": round(confidence, 3)
        }
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}
