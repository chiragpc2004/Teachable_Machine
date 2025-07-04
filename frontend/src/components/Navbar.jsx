import React from "react";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">🧠 Teachable</div>
      <div className="nav-links">
        <a href="#upload">Upload</a>
        <a href="#train">Train</a>
        <a href="#predict">Predict</a>
        <a href="#reset">Reset</a>
      </div>
    </nav>
  );
}

export default Navbar;
