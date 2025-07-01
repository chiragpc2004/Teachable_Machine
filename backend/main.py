from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from utils.image_processing import unzip_and_prepare
from model.train import train_model
from model.predict import predict_image
import os
import shutil

app = FastAPI()

# ✅ Add CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # change if using Vite or another port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Upload ZIP and extract
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        folder_path = await unzip_and_prepare(file)
        return {"message": "Upload successful", "extracted_to": folder_path}
    except Exception as e:
        return {"error": f"Upload failed: {str(e)}"}

# ✅ Train model on uploaded data
@app.post("/train")
def train():
    try:
        result = train_model()
        return result
    except Exception as e:
        return {"error": f"Training failed: {str(e)}"}

# ✅ Predict a single image
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        prediction = predict_image(file.file)
        return {"label": prediction}
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}

# ✅ Reset system: remove model + uploads
@app.post("/reset")
def reset():
    try:
        shutil.rmtree("uploads", ignore_errors=True)
        model_path = "model.pkl"
        if os.path.exists(model_path):
            os.remove(model_path)
        return {"message": "System reset successfully."}
    except Exception as e:
        return {"error": f"Reset failed: {str(e)}"}

