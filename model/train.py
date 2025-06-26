from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from .preprocess import load_images
import joblib
import json

def train_model():
    X, y = load_images("model/sample_data")

    # Require at least two classes
    if len(set(y)) < 2:
        return {"error": "Need at least two different labels"}

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    acc = accuracy_score(y_test, model.predict(X_test))

    # Save model
    joblib.dump(model, "model/classifier.pkl")

    # Save metadata for /status
    with open("model/meta.json", "w") as f:
        json.dump({
            "classes": sorted(list(set(y))),
            "accuracy": round(acc, 4),
            "samples": len(y)
        }, f)

    return {
        "accuracy": round(acc, 4),
        "classes": sorted(list(set(y)))
    }
