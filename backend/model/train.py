from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
from utils.image_processing import load_dataset

def train_model():
    X, y = load_dataset("uploads")
    if len(X) == 0:
        return {"error": "No valid images found."}

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = RandomForestClassifier()
    clf.fit(X_train, y_train)

    acc = accuracy_score(y_test, clf.predict(X_test))
    joblib.dump(clf, "model.pkl")

    return {
        "message": "Model trained successfully",
        "accuracy": round(acc * 100, 2),
        "model_path": "model.pkl"
    }
