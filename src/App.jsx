import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FlowerGarden from "./pages/FlowerGarden";
import FlowerTrail from "./pages/FlowerTrail";
import ShootingGame from "./pages/ShootingGame";

function App() {
  return (
    <>
      <Navbar />
      <div className="rotate-overlay">
        <div className="rotate-icon">📱</div>
        <p>Please rotate your device to landscape</p>
      </div>
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/garden" element={<FlowerGarden />} />
          <Route path="/trail" element={<FlowerTrail />} />
          <Route path="/game" element={<ShootingGame />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
