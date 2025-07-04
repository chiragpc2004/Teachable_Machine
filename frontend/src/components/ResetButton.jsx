import React, { useState } from "react";
import axios from "axios";

function ResetButton({ onReset }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"

  const handleReset = async () => {
    const confirmed = window.confirm("⚠️ Are you sure you want to reset everything?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      await axios.post("http://127.0.0.1:8000/reset");
      setMessage("✅ Reset successful.");
      setMessageType("success");
      if (onReset) onReset();
    } catch (err) {
      console.error(err);
      setMessage("❌ Reset failed.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-section">
      <h2>🗑️ Reset System</h2>
      <button onClick={handleReset} disabled={loading}>
        {loading ? "Resetting..." : "Reset"}
      </button>
      {message && (
        <p className={`reset-message ${messageType}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default ResetButton;
