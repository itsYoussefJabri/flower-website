import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FlowerGarden from "./pages/FlowerGarden";
import FlowerTrail from "./pages/FlowerTrail";
import ShootingGame from "./pages/ShootingGame";

function App() {
  const location = useLocation();
  const isGamePage = location.pathname === "/game";

  return (
    <>
      <Navbar />
      {!isGamePage && (
        <div className="rotate-overlay">
          <div className="rotate-icon">📱</div>
          <p>Please rotate your device to landscape</p>
        </div>
      )}
      <div className={`page-wrapper${isGamePage ? " game-active" : ""}`}>
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
