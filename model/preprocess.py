from PIL import Image
import numpy as np
import os

def preprocess_image(path):
    # Convert image to RGB and resize to 64x64
    img = Image.open(path).convert("RGB").resize((64, 64))
    # Convert to NumPy array and normalize
    img_array = np.array(img).astype(np.float32) / 255.0
    # Flatten into feature vector
    features = img_array.flatten()
    return features

def load_images(folder):
    X, y = [], []
    for label in os.listdir(folder):
        label_path = os.path.join(folder, label)
        if not os.path.isdir(label_path):
            continue
        for file in os.listdir(label_path):
            img_path = os.path.join(label_path, file)
            try:
                X.append(preprocess_image(img_path))
                y.append(label)
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
    return np.array(X), np.array(y)
