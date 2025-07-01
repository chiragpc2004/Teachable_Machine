import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import TrainButton from "./components/TrainButton";
import PredictForm from "./components/PredictForm";
import ResetButton from "./components/ResetButton";
import "./App.css";

function App() {
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleTrainingComplete = () => {
    // you can show toast or log success here if needed
  };

  return (
    <div className="app-container">
      <h1>🧠 Teachable Image Classifier</h1>

      <UploadForm />
      <TrainButton
        onTrainingComplete={handleTrainingComplete}
        setLoadingMessage={setLoadingMessage}
      />
      <PredictForm />
      <ResetButton
        onReset={handleTrainingComplete}
        setLoadingMessage={setLoadingMessage}
      />
    </div>
  );
}

export default App;
