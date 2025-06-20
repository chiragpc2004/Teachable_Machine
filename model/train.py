from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from .preprocess import load_images
import joblib

model = None

def train_model():
    global model
    X, y = load_images("model/sample_data")
    
    if len(set(y)) < 2:
        return {"error": "Need at least two different labels"}

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    acc = accuracy_score(y_test, model.predict(X_test))
    joblib.dump(model, "model/classifier.pkl")

    return {"accuracy": acc, "classes": list(set(y))}
