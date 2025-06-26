from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from utils.image_processing import unzip_and_prepare
from model.train import train_model
from fastapi import UploadFile, File
from model.predict import predict_image
import os
import shutil

app = FastAPI()

# (CORS middleware already added)

@app.post("/upload/")
async def upload(file: UploadFile = File(...)):
    folder_path = await unzip_and_prepare(file)
    return {"message": "Upload successful", "extracted_to": folder_path}

@app.post("/train/")
def train():
    result = train_model()
    return result

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    try:
        prediction = predict_image(file.file)
        return {"prediction": prediction}
    except Exception as e:
        return {"error": str(e)}

@app.post("/reset/")
def reset():
    # Delete uploads folder
    shutil.rmtree("uploads", ignore_errors=True)

    # Delete model file
    model_path = "model.pkl"
    if os.path.exists(model_path):
        os.remove(model_path)

    return {"message": "System reset successfully. All uploaded data and models deleted."}

