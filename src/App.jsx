import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FlowerGarden from "./pages/FlowerGarden";
import FlowerTrail from "./pages/FlowerTrail";
import ShootingGame from "./pages/ShootingGame";
import FlowerCrush from "./pages/FlowerCrush";
import { useState } from "react";

function App() {
  const location = useLocation();
  const gamePaths = ["/game", "/crush"];
  const isGamePage = gamePaths.includes(location.pathname);
  const [gamePhase, setGamePhase] = useState(null); // null | name | playing | over

  // Hide navbar only during gameplay phase
  const hideNavbar = isGamePage && gamePhase === "playing";
  return (
    <>
      {!hideNavbar && <Navbar />}
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
          <Route
            path="/game"
            element={<ShootingGame onPhaseChange={setGamePhase} />}
          />
          <Route path="/crush" element={<FlowerCrush />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
