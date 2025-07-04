import React, { useState } from "react";
import axios from "axios";

function TrainButton({ onTrainingComplete }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

  const handleTrain = async () => {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      await axios.post("http://127.0.0.1:8000/train");
      setMessage("✅ Training complete!");
      setMessageType("success");
      if (onTrainingComplete) onTrainingComplete();
    } catch (err) {
      console.error(err);
      setMessage("❌ Training failed. Try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="train-section">
      <h2>🧠 Step 2: Train the Model</h2>
      <button onClick={handleTrain} disabled={loading}>
        {loading ? "Training..." : "Train Model"}
      </button>
      {message && (
        <p className={`train-message ${messageType}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default TrainButton;
