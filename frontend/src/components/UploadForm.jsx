import React, { useState } from "react";
import axios from "axios";

function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error" | ""

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setMessageType("");
  };

  const handleUpload = async () => {
    if (!file || !file.name.endsWith(".zip")) {
      setMessage("Please select a valid .zip file.");
      setMessageType("error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post("http://127.0.0.1:8000/upload", formData);
      setMessage("✅ Upload successful!");
      setMessageType("success");
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error(error);
      setMessage("❌ Upload failed. Try again.");
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-form">
      <h2>📂 Step 1: Upload Training Data (.zip)</h2>

      <label className="file-label">
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>

      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p className={`upload-message ${messageType}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default UploadForm;
