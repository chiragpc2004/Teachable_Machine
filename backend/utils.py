import os
from pathlib import Path

def ensure_dir(path: str | Path):
    Path(path).mkdir(parents=True, exist_ok=True)

def allowed_image(filename: str) -> bool:
    return filename.lower().endswith((".png", ".jpg", ".jpeg"))
