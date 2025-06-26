import os
import io
import json
import shutil
import joblib
import zipfile
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from PIL import Image
from supabase_client import supabase

from model.train import train_model

app = FastAPI()

# --------------------- CORS CONFIG ---------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------- CONSTANTS ---------------------
UPLOAD_DIR = Path("model/sample_data")
MODEL_PATH = Path("model/classifier.pkl")
META_PATH = Path("model/meta.json")
BUCKET_NAME = "Images"

# --------------------- ROUTES ---------------------

@app.post("/upload-folder")
def upload_folder(file: UploadFile = File(...)):
    """
    Uploads a zip file containing class folders with images and uploads to Supabase Storage.
    """
    if file.filename.endswith(".zip"):
        temp_path = Path("temp_upload.zip")
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        with zipfile.ZipFile(temp_path, 'r') as zip_ref:
            zip_ref.extractall(UPLOAD_DIR)

        temp_path.unlink()  # Delete temp zip

        # Upload extracted files to Supabase
        for root, _, files in os.walk(UPLOAD_DIR):
            for name in files:
                file_path = Path(root) / name
                relative_path = file_path.relative_to(UPLOAD_DIR)
                with open(file_path, "rb") as f:
                    supabase.storage.from_(BUCKET_NAME).upload(str(relative_path), f.read(), {"upsert": True})

        return {"status": "uploaded", "message": "Zip file extracted and uploaded to Supabase."}

    return {"error": "Please upload a .zip file containing your dataset."}


@app.post("/train")
def train():
    """
    Trains a model on current sample_data. Returns accuracy and class names.
    """
    return train_model()


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    """
    Predicts the class of a new image using the trained model.
    """
    if not MODEL_PATH.exists():
        return {"error": "No trained model found. Please train first."}

    try:
        image_bytes = file.file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((64, 64))
        img_array = np.array(img).astype(np.float32).flatten() / 255.0

        model = joblib.load(MODEL_PATH)
        pred = model.predict([img_array])[0]
        probs = model.predict_proba([img_array])[0]
        confidence = float(np.max(probs))

        return {
            "prediction": pred,
            "confidence": round(confidence, 3)
        }

    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}


@app.get("/status")
def model_status():
    """
    Returns current model training status and metadata.
    """
    if not MODEL_PATH.exists():
        return {
            "trained": False,
            "message": "No model trained yet."
        }

    if META_PATH.exists():
        with open(META_PATH, "r") as f:
            meta = json.load(f)
        return {
            "trained": True,
            "model": "RandomForestClassifier",
            "classes": meta.get("classes", []),
            "accuracy": meta.get("accuracy", None),
            "samples": meta.get("samples", None)
        }

    return {
        "trained": True,
        "model": "RandomForestClassifier",
        "message": "Model trained, but no metadata found."
    }


@app.delete("/reset")
def reset_project():
    """
    Resets the project by deleting all data, model and metadata.
    """
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    for path in [MODEL_PATH, META_PATH]:
        if path.exists():
            path.unlink()

    return {"status": "reset", "message": "All files and models deleted."}
