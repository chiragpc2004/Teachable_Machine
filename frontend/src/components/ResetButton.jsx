import React, { useState } from "react";
import axios from "axios";

function ResetButton({ onReset }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    const confirmed = window.confirm("Are you sure you want to reset everything?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      await axios.post("http://127.0.0.1:8000/reset");
      setMessage("✅ Reset successful.");
      if (onReset) onReset(); // Notify parent to refresh status etc.
    } catch (err) {
      console.error(err);
      setMessage("❌ Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-section">
      <h2>Reset App</h2>
      <button onClick={handleReset} disabled={loading}>
        {loading ? "Resetting..." : "Reset System"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default ResetButton;
