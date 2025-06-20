from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from .preprocess import load_images
import joblib

model = None

def train_model():
    global model
    X, y = load_images("model/sample_data")
    X = X / 255.0

    if len(set(y)) < 2:
        return {"error": "Need at least two different labels"}

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    acc = accuracy_score(y_test, model.predict(X_test))
    joblib.dump(model, "model/classifier.pkl")

    return {"accuracy": acc, "classes": list(set(y))}
