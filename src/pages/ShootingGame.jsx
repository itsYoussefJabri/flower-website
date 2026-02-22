import React, { useState, useEffect, useRef, useCallback } from "react";

const FACES = ["/face1.jpeg", "/face2.jpeg", "/face3.jpeg", "/face4.jpeg"];
const MAX_HEARTS = 2;
const TIME_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
];

// Blood splatter SVG shapes for hit effects
const SPLATTER_SHAPES = [
  "M0,-8 C3,-12 8,-10 10,-5 C13,-1 10,4 7,7 C4,10 -2,12 -6,8 C-10,5 -12,-1 -8,-5 C-5,-9 -3,-6 0,-8Z",
  "M0,-10 C5,-13 12,-8 10,-2 C9,3 5,8 0,10 C-5,8 -9,3 -10,-2 C-12,-8 -5,-13 0,-10Z",
  "M-2,-9 C2,-14 9,-11 11,-6 C13,0 9,6 4,9 C-1,12 -7,10 -10,5 C-13,0 -7,-5 -2,-9Z",
];

// Difficulty settings that scale over time
function getDifficulty(elapsed, duration) {
  const t = elapsed / duration; // 0→1
  // After 10s, ramp up difficulty much faster
  const hard = elapsed >= 10;
  return {
    // Faster spawn, more targets after 10s
    spawnInterval: hard
      ? Math.max(180, 700 - (elapsed - 10) * 18)
      : Math.max(350, 1200 - elapsed * 15),
    maxTargets: hard
      ? Math.min(10, 3 + Math.floor((elapsed - 10) / 3))
      : Math.min(3, 1 + Math.floor(elapsed / 7)),
    // Targets live shorter over time
    minLifetime: hard
      ? Math.max(300, 1200 - (elapsed - 10) * 18)
      : Math.max(500, 1800 - elapsed * 12),
    maxLifetime: hard
      ? Math.max(600, 2200 - (elapsed - 10) * 22)
      : Math.max(900, 3000 - elapsed * 15),
    // Shrink over time
    minSize: hard
      ? Math.max(30, 70 - (elapsed - 10) * 0.7)
      : Math.max(50, 100 - elapsed * 0.5),
    maxSize: hard
      ? Math.max(45, 110 - (elapsed - 10) * 0.8)
      : Math.max(70, 140 - elapsed * 0.6),
    // Start mostly static, end mostly moving
    moveChance: hard
      ? Math.min(1, 0.5 + (t - 0.1) * 1.2)
      : Math.min(0.8, 0.1 + t * 0.7),
    // Movement speed increases
    speedMin: hard
      ? 80 + (elapsed - 10) * 2.5
      : 40 + elapsed * 2,
    speedMax: hard
      ? 160 + (elapsed - 10) * 3.5
      : 90 + elapsed * 2.5,
  };
}

let targetIdCounter = 0;

function ShootingGame({ onPhaseChange }) {
  const [phase, setPhase] = useState("name"); // name | playing | over
    // Notify parent of phase changes
    useEffect(() => {
      if (onPhaseChange) onPhaseChange(phase);
    }, [phase, onPhaseChange]);
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeLeft, setTimeLeft] = useState(90);
  const [targets, setTargets] = useState([]);
  const [hits, setHits] = useState([]); // hit animations
  const [misses, setMisses] = useState([]); // miss animations
  const [isChaimae, setIsChaimae] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [chosenTime, setChosenTime] = useState(90);
  const [splatters, setSplatters] = useState([]); // blood splatter effects

  const gameAreaRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const gameTimerRef = useRef(null);
  const elapsedRef = useRef(0);
  const heartsRef = useRef(MAX_HEARTS);
  const targetsRef = useRef([]);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(null);
  const chosenTimeRef = useRef(90);

  // Allow scrolling on this page, but disable during gameplay
  useEffect(() => {
    if (phase === "playing") {
      document.documentElement.classList.remove("game-scroll");
    } else {
      document.documentElement.classList.add("game-scroll");
    }
    return () => document.documentElement.classList.remove("game-scroll");
  }, [phase]);

  // Keep refs in sync
  useEffect(() => {
    heartsRef.current = hearts;
  }, [hearts]);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  const endGame = useCallback(() => {
    setPhase("over");
    clearTimeout(spawnTimerRef.current);
    clearInterval(gameTimerRef.current);
    setTargets([]);
  }, []);

  const loseHeart = useCallback(() => {
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 400);
    if (isChaimae) return; // unlimited hearts
    setHearts((h) => {
      const next = h - 1;
      if (next <= 0) {
        setTimeout(() => endGame(), 100);
        return 0;
      }
      return next;
    });
  }, [isChaimae, endGame]);

  const spawnTarget = useCallback(() => {
    const area = gameAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const diff = getDifficulty(elapsedRef.current, chosenTimeRef.current);

    if (targetsRef.current.length >= diff.maxTargets) return;

    const size = diff.minSize + Math.random() * (diff.maxSize - diff.minSize);
    const x = Math.random() * (rect.width - size - 20) + 10;
    const y = Math.random() * (rect.height - size - 100) + 60;
    const lifetime =
      diff.minLifetime + Math.random() * (diff.maxLifetime - diff.minLifetime);
    const moving = Math.random() < diff.moveChance;

    const id = ++targetIdCounter;
    const face = FACES[Math.floor(Math.random() * FACES.length)];

    // Random movement direction
    const angle = Math.random() * Math.PI * 2;
    const speed = moving
      ? diff.speedMin + Math.random() * (diff.speedMax - diff.speedMin)
      : 0;

    const newTarget = {
      id,
      face,
      x,
      y,
      size,
      lifetime,
      moving,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      spawnTime: Date.now(),
      opacity: 1,
    };

    setTargets((prev) => [...prev, newTarget]);

    // Auto-remove after lifetime
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, lifetime);
  }, []);

  const startGame = useCallback(() => {
    // Clear any previous game timers
    clearInterval(gameTimerRef.current);
    clearTimeout(spawnTimerRef.current);

    const chaimaeMode = playerName.trim().toLowerCase() === "chaimae";
    setIsChaimae(chaimaeMode);
    setScore(0);
    setHearts(chaimaeMode ? 999 : MAX_HEARTS);
    heartsRef.current = chaimaeMode ? 999 : MAX_HEARTS;
    chosenTimeRef.current = chosenTime;
    setTimeLeft(chosenTime);
    setTargets([]);
    setHits([]);
    setMisses([]);
    setSplatters([]);
    setComboCount(0);
    comboRef.current = 0;
    elapsedRef.current = 0;
    setPhase("playing");

    // Game clock
    gameTimerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(gameTimerRef.current);
          clearTimeout(spawnTimerRef.current);
          setTimeout(() => setPhase("over"), 200);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Adaptive spawn loop
    const spawnLoop = () => {
      spawnTarget();
      const diff = getDifficulty(elapsedRef.current, chosenTimeRef.current);
      spawnTimerRef.current = setTimeout(spawnLoop, diff.spawnInterval);
    };
    spawnTimerRef.current = setTimeout(spawnLoop, 800);
  }, [playerName, chosenTime, spawnTarget]);

  // Move targets
  useEffect(() => {
    if (phase !== "playing") return;
    let raf;
    let last = Date.now();

    const update = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      setTargets((prev) => {
        const area = gameAreaRef.current;
        if (!area) return prev;
        const rect = area.getBoundingClientRect();

        return prev.map((t) => {
          if (!t.moving) return t;
          let nx = t.x + t.dx * dt;
          let ny = t.y + t.dy * dt;
          let ndx = t.dx;
          let ndy = t.dy;

          // Bounce off walls
          if (nx < 0 || nx > rect.width - t.size) ndx = -ndx;
          if (ny < 50 || ny > rect.height - t.size - 10) ndy = -ndy;
          nx = Math.max(0, Math.min(rect.width - t.size, nx));
          ny = Math.max(50, Math.min(rect.height - t.size - 10, ny));

          return { ...t, x: nx, y: ny, dx: ndx, dy: ndy };
        });
      });

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(gameTimerRef.current);
      clearTimeout(spawnTimerRef.current);
    };
  }, []);

  const handleTargetClick = (e, targetId) => {
    e.stopPropagation();
    const target = targets.find((t) => t.id === targetId);
    if (!target) return;

    // Score - more points for smaller/faster targets
    const basePoints = 10;
    const sizeBonus = Math.round((130 - target.size) / 10);
    const moveBonus = target.moving ? 5 : 0;

    // Combo
    comboRef.current += 1;
    setComboCount(comboRef.current);
    clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      comboRef.current = 0;
      setComboCount(0);
      setShowCombo(false);
    }, 2000);

    const comboMultiplier = Math.min(3, 1 + (comboRef.current - 1) * 0.25);
    const points = Math.round(
      (basePoints + sizeBonus + moveBonus) * comboMultiplier,
    );

    if (comboRef.current >= 3) {
      setShowCombo(true);
    }

    setScore((s) => s + points);

    // Hit animation
    const hitId = Date.now() + Math.random();
    const cx = target.x + target.size / 2;
    const cy = target.y + target.size / 2;
    setHits((prev) => [...prev, { id: hitId, x: cx, y: cy, points }]);
    setTimeout(
      () => setHits((prev) => prev.filter((h) => h.id !== hitId)),
      700,
    );

    // Blood splatter effect — spawn multiple droplets
    const newSplatters = [];
    const splatterCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < splatterCount; i++) {
      const sId = hitId + i + Math.random();
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 50;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const sSize = 8 + Math.random() * 18;
      const rot = Math.random() * 360;
      const shape =
        SPLATTER_SHAPES[Math.floor(Math.random() * SPLATTER_SHAPES.length)];
      newSplatters.push({
        id: sId,
        x: sx,
        y: sy,
        size: sSize,
        rot,
        shape,
        delay: i * 20,
      });
    }
    setSplatters((prev) => [...prev, ...newSplatters]);
    setTimeout(() => {
      const ids = newSplatters.map((s) => s.id);
      setSplatters((prev) => prev.filter((s) => !ids.includes(s.id)));
    }, 900);

    // Remove target
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
  };

  const handleMissClick = (e) => {
    if (phase !== "playing") return;
    // Check we didn't click on a target
    if (e.target.closest(".game-target")) return;

    loseHeart();

    // Miss animation
    const rect = gameAreaRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const missId = Date.now() + Math.random();
    setMisses((prev) => [...prev, { id: missId, x: mx, y: my }]);
    setTimeout(
      () => setMisses((prev) => prev.filter((m) => m.id !== missId)),
      600,
    );

    // Reset combo
    comboRef.current = 0;
    setComboCount(0);
    setShowCombo(false);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── NAME ENTRY SCREEN ───
  if (phase === "name") {
    return (
      <div className="sg-page">
        <div className="sg-name-screen">
          <div className="sg-name-card">
            <div className="sg-name-deco">🎯</div>
            <h1 className="sg-name-title">Flower Shooter</h1>
            <p className="sg-name-sub">Test your speed &amp; reflexes!</p>
            <div className="sg-name-rules">
              <div className="sg-rule">
                <span>🎯</span> Shoot the faces as they appear
              </div>
              <div className="sg-rule">
                <span>💨</span> They move faster over time
              </div>
              <div className="sg-rule">
                <span>❌</span> Miss a click = lose a heart
              </div>
              <div className="sg-rule">
                <span>⏱️</span> Choose your time below
              </div>
            </div>
            <div className="sg-time-picker">
              <span className="sg-time-label">Game Duration</span>
              <div className="sg-time-options">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`sg-time-opt${chosenTime === opt.value ? " sg-time-active" : ""}`}
                    onClick={() => setChosenTime(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="sg-name-input"
              type="text"
              placeholder="Enter your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && playerName.trim() && startGame()
              }
              autoFocus
            />
            <button
              className="sg-start-btn"
              disabled={!playerName.trim()}
              onClick={startGame}
            >
              <span className="sg-btn-icon">🌸</span>
              Start Game
            </button>
          </div>
          {/* Floating decorative petals */}
          <div className="sg-floating-petals">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="sg-petal"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 6}s`,
                  animationDuration: `${4 + Math.random() * 4}s`,
                  fontSize: `${0.8 + Math.random() * 1.2}rem`,
                }}
              >
                {["🌸", "🌺", "✿", "❀", "🌷"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── GAME OVER SCREEN ───
  if (phase === "over") {
    return (
      <div className="sg-page">
        <div className="sg-over-screen">
          <div className="sg-over-card">
            <div className="sg-over-deco">
              {score >= 200 ? "🏆" : score >= 100 ? "⭐" : "🌸"}
            </div>
            <h1 className="sg-over-title">
              {timeLeft <= 0 ? "Time's Up!" : "Game Over!"}
            </h1>
            <div className="sg-over-player">{playerName}</div>
            <div className="sg-over-score">
              <span className="sg-over-score-num">{score}</span>
              <span className="sg-over-score-label">points</span>
            </div>
            <div className="sg-over-stats">
              <div className="sg-stat">
                <span className="sg-stat-icon">⏱️</span>
                <span>{formatTime(chosenTimeRef.current - timeLeft)}</span>
              </div>
              <div className="sg-stat">
                <span className="sg-stat-icon">{isChaimae ? "♾️" : "❤️"}</span>
                <span>{isChaimae ? "∞" : `${hearts} left`}</span>
              </div>
            </div>
            <div className="sg-over-actions">
              <button className="sg-start-btn" onClick={startGame}>
                <span className="sg-btn-icon">🔄</span>
                Play Again
              </button>
              <button
                className="sg-back-btn"
                onClick={() => {
                  setPhase("name");
                  setPlayerName("");
                }}
              >
                Change Name
              </button>
            </div>
          </div>
          <div className="sg-floating-petals">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="sg-petal"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 6}s`,
                  animationDuration: `${4 + Math.random() * 4}s`,
                }}
              >
                {["🌸", "✿", "❀"][Math.floor(Math.random() * 3)]}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING SCREEN ───
  return (
    <div className="sg-page">
      <div
        className={`sg-game-area${shakeScreen ? " sg-shake" : ""}`}
        ref={gameAreaRef}
        onClick={handleMissClick}
      >
        {/* HUD */}
        <div className="sg-hud">
          <div className="sg-hud-left">
            <div className="sg-hud-hearts">
              {isChaimae ? (
                <span className="sg-heart-infinite">💖 ∞</span>
              ) : (
                [...Array(MAX_HEARTS)].map((_, i) => (
                  <span
                    key={i}
                    className={`sg-heart${i < hearts ? " sg-heart-alive" : " sg-heart-dead"}`}
                  >
                    {i < hearts ? "❤️" : "🖤"}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="sg-hud-center">
            <div
              className={`sg-hud-timer${timeLeft <= 10 ? " sg-timer-danger" : timeLeft <= 30 ? " sg-timer-warn" : ""}`}
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>
          <div className="sg-hud-right">
            <div className="sg-hud-score">
              <span className="sg-score-label">Score</span>
              <span className="sg-score-value">{score}</span>
            </div>
          </div>
        </div>

        {/* Combo indicator */}
        {showCombo && (
          <div className="sg-combo" key={comboCount}>
            🔥 x{comboCount} Combo!
          </div>
        )}

        {/* Chaimae mode indicator */}
        {isChaimae && <div className="sg-chaimae-mode">✨ CHAIMAE MODE ✨</div>}

        {/* Targets */}
        {targets.map((t) => (
          <div
            key={t.id}
            className="game-target"
            style={{
              left: t.x,
              top: t.y,
              width: t.size,
              height: t.size,
            }}
            onClick={(e) => handleTargetClick(e, t.id)}
          >
            <div className="game-target-inner">
              <img src={t.face} alt="target" draggable={false} />
              <div className="game-target-ring" />
            </div>
          </div>
        ))}

        {/* Blood splatter effects */}
        {splatters.map((s) => (
          <svg
            key={s.id}
            className="sg-splatter"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}ms`,
              transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
            }}
            viewBox="-14 -14 28 28"
          >
            <path d={s.shape} fill="currentColor" />
          </svg>
        ))}

        {/* Hit animations */}
        {hits.map((h) => (
          <div
            key={h.id}
            className="sg-hit-anim"
            style={{ left: h.x, top: h.y }}
          >
            <span className="sg-hit-punch">👊</span>
            <span className="sg-hit-points">+{h.points}</span>
          </div>
        ))}

        {/* Miss animations */}
        {misses.map((m) => (
          <div
            key={m.id}
            className="sg-miss-anim"
            style={{ left: m.x, top: m.y }}
          >
            ✕
          </div>
        ))}

        {/* End game button */}
        <button
          className="sg-end-btn"
          onClick={(e) => {
            e.stopPropagation();
            endGame();
          }}
        >
          ✕ End
        </button>

        {/* Progress bar */}
        <div className="sg-progress-bar">
          <div
            className="sg-progress-fill"
            style={{ width: `${(timeLeft / chosenTimeRef.current) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default ShootingGame;
