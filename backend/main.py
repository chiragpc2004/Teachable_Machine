import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("D:\SageScan\model\sample_data")

@app.post("/upload")
def upload_image(label: str = Form(...), file: UploadFile = File(...)):
    # Create label folder if not exists
    label_dir = UPLOAD_DIR / label
    label_dir.mkdir(parents=True, exist_ok=True)

    # Save the uploaded file
    file_path = label_dir / file.filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"status": "saved", "label": label, "filename": file.filename}
