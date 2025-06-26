from PIL import Image
import numpy as np
import joblib

def predict_image(file, image_size=(64, 64)):
    # Load model
    model = joblib.load("model.pkl")

    # Read image & preprocess
    image = Image.open(file).convert("RGB").resize(image_size)
    image_array = np.array(image).flatten().reshape(1, -1)

    # Predict
    prediction = model.predict(image_array)[0]
    return prediction
