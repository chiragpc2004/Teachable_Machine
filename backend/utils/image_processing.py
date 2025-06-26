import zipfile
import os
from pathlib import Path
from fastapi import UploadFile
import shutil
from PIL import Image
import numpy as np

async def unzip_and_prepare(file: UploadFile):
    upload_dir = Path("uploads")

    # Clean up old uploads
    if upload_dir.exists():
        shutil.rmtree(upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded file temporarily
    zip_path = upload_dir / file.filename
    with open(zip_path, "wb") as buffer:
        buffer.write(await file.read())

    # Validate ZIP
    if not zipfile.is_zipfile(zip_path):
        os.remove(zip_path)
        raise ValueError("Uploaded file is not a valid ZIP archive.")

    # Extract contents
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(upload_dir)
    except zipfile.BadZipFile:
        os.remove(zip_path)
        raise ValueError("ZIP file could not be extracted.")

    os.remove(zip_path)  # Cleanup

    # Remove junk folders like __MACOSX or hidden folders
    for sub in upload_dir.iterdir():
        if sub.name.startswith("__MACOSX") or sub.name.startswith("."):
            shutil.rmtree(sub, ignore_errors=True)

    return str(upload_dir)


def load_dataset(root_dir: str):
    X, y = [], []
    image_size = (64, 64)  # Resize to uniform dimensions

    for label_dir in Path(root_dir).iterdir():
        if label_dir.is_dir():
            label = label_dir.name
            for image_path in label_dir.glob("*"):
                try:
                    img = Image.open(image_path).convert("RGB").resize(image_size)
                    X.append(np.array(img).flatten())
                    y.append(label)
                except Exception as e:
                    print(f"Skipping {image_path}: {e}")

    return np.array(X), np.array(y)
