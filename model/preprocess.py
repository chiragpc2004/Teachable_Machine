from PIL import Image
import numpy as np
import os
from skimage.feature import hog  
from skimage import exposure    

def preprocess_image(path):
    # Load image in grayscale and resize
    img = Image.open(path).convert("L").resize((128, 128))  # 🚀 Upgraded size

    # Convert to NumPy array
    img_array = np.array(img)

    # Extract HOG features
    features, _ = hog(
        img_array,
        pixels_per_cell=(16, 16),
        cells_per_block=(2, 2),
        visualize=True,   
        block_norm='L2-Hys'
    )

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
