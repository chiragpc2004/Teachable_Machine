import React, { useState } from "react";
import axios from "axios";

function TrainButton({ onTrainingComplete }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleTrain = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("http://127.0.0.1:8000/train");
      setMessage("✅ Training complete!");
      if (onTrainingComplete) onTrainingComplete();
    } catch (err) {
      console.error(err);
      setMessage("❌ Training failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="train-section">
      <h2>Step 2: Train the Model</h2>
      <button onClick={handleTrain} disabled={loading}>
        {loading ? "Training..." : "Train Model"}
      </button>
      <p>{message}</p>
    </div>
  );
}

export default TrainButton;
