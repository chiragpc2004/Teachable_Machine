import React, { useState } from "react";
import axios from "axios";

function PredictForm() {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
    setPrediction("");
  };

  const handlePredict = async () => {
    if (!image) return alert("Please select an image to predict.");

    const formData = new FormData();
    formData.append("file", image);

    try {
      setLoading(true);
      const res = await axios.post("http://127.0.0.1:8000/predict", formData);
      setPrediction(res.data.label || "No label returned.");
    } catch (err) {
      console.error(err);
      setPrediction("❌ Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="predict-form">
      <h2>Step 3: Predict from Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handlePredict} disabled={loading}>
        {loading ? "Predicting..." : "Predict"}
      </button>

      {image && (
        <div className="preview">
          <img src={URL.createObjectURL(image)} alt="Preview" width="150" />
        </div>
      )}

      {prediction && <p className="prediction-result">🧠 Prediction: <strong>{prediction}</strong></p>}
    </div>
  );
}

export default PredictForm;
