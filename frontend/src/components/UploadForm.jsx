import React, { useState } from "react";
import axios from "axios";

function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file || file.type !== "application/zip") {
      setMessage("Please select a valid .zip file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post("http://127.0.0.1:8000/upload", formData);
      setMessage("✅ Upload successful!");
      if (onUploadSuccess) onUploadSuccess(); // trigger training availability
    } catch (error) {
      console.error(error);
      setMessage("❌ Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-form">
      <h2>Step 1: Upload Training Data (.zip)</h2>
      <input type="file" accept=".zip" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      <p>{message}</p>
    </div>
  );
}

export default UploadForm;
