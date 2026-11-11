# 🧠 Teachable Machine

A small web app, inspired by Google's Teachable Machine, for training your own image classifier. You upload labelled images, train a model with one click, and test it on new pictures.

---

## 🚀 Features

- 📂 Upload training data as a `.zip` with one folder per class
- 🏋️ Train a Random Forest classifier on your images with one click
- 🔮 Upload a new image and get a predicted class back
- 🔁 Reset and retrain from scratch

---

## 🧪 How It Works

1. **Upload:** the frontend sends your `.zip` to the backend, which extracts it. Each folder name becomes a class label.
2. **Train:** the backend loads the images with Pillow, converts them to feature arrays and trains a scikit-learn `RandomForestClassifier`. It holds out a test split to report accuracy, then saves the model with `joblib`.
3. **Predict:** you upload a test image, and the backend preprocesses it the same way and returns the predicted class.

---

## 🧰 Tech Stack

- **Frontend:** React 19, Vite, Axios, AOS (scroll animations), React Icons
- **Backend:** FastAPI, scikit-learn, Pillow, NumPy, joblib

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI app: /upload, /train, /predict, /reset
│   ├── model/
│   │   ├── train.py            # Random Forest training + accuracy
│   │   └── predict.py          # Single-image prediction
│   └── utils/
│       └── image_processing.py # Unzipping and image loading
└── frontend/
    ├── src/
    │   ├── components/         # UploadForm, TrainButton, PredictForm, ResetButton, Navbar
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## 📦 Run Locally

```bash
git clone https://github.com/chiragpc2004/Teachable_Machine.git
cd Teachable_Machine
```

**Backend** (runs on port 8000):

```bash
cd backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install fastapi uvicorn python-multipart scikit-learn pillow numpy joblib
uvicorn main:app --reload
```

**Frontend** (in a second terminal, runs on port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 📄 License

[MIT](./LICENSE)

## 🙌 Credits

Inspired by [Teachable Machine by Google](https://teachablemachine.withgoogle.com/).
