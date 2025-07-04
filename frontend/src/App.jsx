// App.jsx
import React, { useEffect, useState } from "react";
import UploadForm from "./components/UploadForm";
import TrainButton from "./components/TrainButton";
import PredictForm from "./components/PredictForm";
import ResetButton from "./components/ResetButton";
import "./App.css";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaUpload, FaRobot, FaPlayCircle, FaUndoAlt } from "react-icons/fa";

function App() {
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleTrainingComplete = () => {
    setLoadingMessage("");
    console.log("Training or Reset operation completed!");
  };

  useEffect(() => {
    AOS.init({ once: true, duration: 800 });
  }, []);

  return (
    <div className="page" data-aos="fade-in">
      {/* Navbar */}
      <nav className="navbar">
        {/* NEW: Use the .container class here */}
        <div className="container navbar-content">
          <a href="#" className="logo">
            <span className="logo-gradient">🧠 Teachable</span>
          </a>
          <div className="nav-links">
            <a href="#upload">Upload</a>
            <a href="#train">Train</a>
            <a href="#predict">Predict</a>
            <a href="#reset">Reset</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        {/* NEW: Use the .container class here for hero content */}
        <div className="container hero-inner" data-aos="fade-down">
          <h1 className="hero-title">Teachable Image Classifier</h1>
          <p className="hero-subtitle">
            Upload. Train. Predict. A no-code way to build custom image classification models with ease.
          </p>
          <a href="#upload" className="cta-button">
            🚀 Get Started
          </a>
        </div>
      </header>

      {/* Main Sections */}
      {/* The main-content already uses .layout which we'll repurpose into .container behavior */}
      <main className="container main-content"> {/* Changed layout to container */}
        <section id="upload" data-aos="zoom-in-up">
          <div className="section-wrapper upload-form">
            <h2 className="section-title">
              <FaUpload style={{ marginRight: "0.5rem" }} /> Upload Your Images
            </h2>
            <UploadForm />
          </div>
        </section>

        <section id="train" data-aos="zoom-in-up" data-aos-delay="100">
          <div className="section-wrapper train-section">
            <h2 className="section-title">
              <FaRobot style={{ marginRight: "0.5rem" }} /> Train Your Model
            </h2>
            <TrainButton
              onTrainingComplete={handleTrainingComplete}
              setLoadingMessage={setLoadingMessage}
            />
            {loadingMessage && <p className="status">{loadingMessage}</p>}
          </div>
        </section>

        <section id="predict" data-aos="zoom-in-up" data-aos-delay="200">
          <div className="section-wrapper predict-form">
            <h2 className="section-title">
              <FaPlayCircle style={{ marginRight: "0.5rem" }} /> Make a Prediction
            </h2>
            <PredictForm />
          </div>
        </section>

        <section id="reset" data-aos="zoom-in-up" data-aos-delay="300">
          <div className="section-wrapper reset-section">
            <h2 className="section-title">
              <FaUndoAlt style={{ marginRight: "0.5rem" }} /> Reset Model
            </h2>
            <ResetButton
              onReset={handleTrainingComplete}
              setLoadingMessage={setLoadingMessage}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      {/* NEW: Use the .container class here for footer content */}
      <footer className="footer">
         <div className="container"> {/* Added a new div for container inside footer */}
            <p>
              Made with ❤️ by <strong>Chirag Poojarikodi</strong> · MIT Manipal
            </p>
         </div>
      </footer>
    </div>
  );
}

export default App;