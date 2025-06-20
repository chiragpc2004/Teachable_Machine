from PIL import Image
import numpy as np
import os

def preprocess_image(path):
    img = Image.open(path).convert("L").resize((64, 64))
    return np.array(img).flatten()

def load_images(folder):
    X, y = [], []
    for label in os.listdir(folder):
        label_path = os.path.join(folder, label)
        if not os.path.isdir(label_path): continue
        for file in os.listdir(label_path):
            img_path = os.path.join(label_path, file)
            try:
                X.append(preprocess_image(img_path))
                y.append(label)
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
    return np.array(X), np.array(y)
