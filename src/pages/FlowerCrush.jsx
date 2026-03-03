import React, { useState, useEffect, useCallback, useRef } from "react";

/* ─── constants ─── */
const ROWS = 8;
const COLS = 8;
const FLOWERS = [
  { emoji: "🌹", name: "rose" }, // red
  { emoji: "🌻", name: "sun" }, // yellow
  { emoji: "💜", name: "purple" }, // purple
  { emoji: "🌿", name: "herb" }, // green
  { emoji: "🌸", name: "cherry" }, // pink
  { emoji: "💙", name: "blue" }, // blue
];

const SPECIAL_4 = "⭐";
const SPECIAL_5 = "💎";
const MOVE_LIMIT = 30;

/* ─── helpers ─── */
const randFlower = () => Math.floor(Math.random() * FLOWERS.length);

function createBoard() {
  const b = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      type: randFlower(),
      key: Math.random(),
      special: null,
    })),
  );
  // Remove initial matches
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      while (hasMatchAt(b, r, c)) {
        b[r][c] = { type: randFlower(), key: Math.random(), special: null };
      }
    }
  }
  return b;
}

function hasMatchAt(board, r, c) {
  const t = board[r][c].type;
  // Horizontal
  if (c >= 2 && board[r][c - 1].type === t && board[r][c - 2].type === t)
    return true;
  // Vertical
  if (r >= 2 && board[r - 1][c].type === t && board[r - 2][c].type === t)
    return true;
  return false;
}

function findAllMatches(board) {
  const matched = new Set();
  const specials = []; // { r, c, kind }

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && board[r][c].type === board[r][start].type) continue;
      const len = c - start;
      if (len >= 3) {
        for (let i = start; i < c; i++) matched.add(`${r},${i}`);
        if (len === 4) specials.push({ r, c: start + 1, kind: "star" });
        if (len >= 5) specials.push({ r, c: start + 2, kind: "diamond" });
      }
      start = c;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && board[r][c].type === board[start][c].type) continue;
      const len = r - start;
      if (len >= 3) {
        for (let i = start; i < r; i++) matched.add(`${i},${c}`);
        if (len === 4) specials.push({ r: start + 1, c, kind: "star" });
        if (len >= 5) specials.push({ r: start + 2, c, kind: "diamond" });
      }
      start = r;
    }
  }
  return { matched, specials };
}

function isAdjacent(a, b) {
  return (
    (Math.abs(a.r - b.r) === 1 && a.c === b.c) ||
    (Math.abs(a.c - b.c) === 1 && a.r === b.r)
  );
}

function copyBoard(b) {
  return b.map((row) => row.map((cell) => ({ ...cell })));
}

function hasAnyValidMove(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Try swap right
      if (c < COLS - 1) {
        const nb = copyBoard(board);
        [nb[r][c], nb[r][c + 1]] = [nb[r][c + 1], nb[r][c]];
        if (findAllMatches(nb).matched.size > 0) return true;
      }
      // Try swap down
      if (r < ROWS - 1) {
        const nb = copyBoard(board);
        [nb[r][c], nb[r + 1][c]] = [nb[r + 1][c], nb[r][c]];
        if (findAllMatches(nb).matched.size > 0) return true;
      }
    }
  }
  return false;
}

/* ─── Component ─── */
function FlowerCrush() {
  const [phase, setPhase] = useState("menu"); // menu | playing | over
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVE_LIMIT);
  const [combo, setCombo] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [matched, setMatched] = useState(new Set());
  const [swapping, setSwapping] = useState(null); // { from, to }
  const [particles, setParticles] = useState([]);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem("fc_best") || "0", 10);
    } catch {
      return 0;
    }
  });
  const [scorePopups, setScorePopups] = useState([]);
  const [hint, setHint] = useState(null); // { from, to }
  const [hintUsed, setHintUsed] = useState(0); // count hints used
  const [shufflesLeft, setShufflesLeft] = useState(4);
  const [extraMovesLeft, setExtraMovesLeft] = useState(3);
  const [continued, setContinued] = useState(false); // one-time continue

  const boardRef = useRef(null);
  const hintTimer = useRef(null);
  const idleTimer = useRef(null);

  const startGame = useCallback(() => {
    const b = createBoard();
    setBoard(b);
    setSelected(null);
    setScore(0);
    setMoves(MOVE_LIMIT);
    setCombo(0);
    setAnimating(false);
    setMatched(new Set());
    setSwapping(null);
    setParticles([]);
    setScorePopups([]);
    setHint(null);
    setHintUsed(0);
    setShufflesLeft(4);
    setExtraMovesLeft(3);
    setContinued(false);
    setPhase("playing");
  }, []);

  /* ── Process matches with cascade ── */
  const processMatches = useCallback((currentBoard, currentCombo = 0) => {
    const { matched: m, specials } = findAllMatches(currentBoard);
    if (m.size === 0) {
      setAnimating(false);
      setCombo(0);
      // Check for valid moves
      if (!hasAnyValidMove(currentBoard)) {
        // Shuffle board
        const newBoard = createBoard();
        setBoard(newBoard);
      }
      return;
    }

    const newCombo = currentCombo + 1;
    setCombo(newCombo);
    setMatched(m);

    // Calculate score
    const pts = m.size * 10 * newCombo;
    setScore((s) => {
      const next = s + pts;
      setBestScore((b) => {
        const nb = Math.max(b, next);
        try {
          localStorage.setItem("fc_best", String(nb));
        } catch {}
        return nb;
      });
      return next;
    });

    // Score popup
    const cells = [...m].map((k) => {
      const [r, c] = k.split(",").map(Number);
      return { r, c };
    });
    const avgR = cells.reduce((a, c) => a + c.r, 0) / cells.length;
    const avgC = cells.reduce((a, c) => a + c.c, 0) / cells.length;
    setScorePopups((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text: `+${pts}${newCombo > 1 ? ` x${newCombo}` : ""}`,
        r: avgR,
        c: avgC,
      },
    ]);
    setTimeout(
      () => setScorePopups((prev) => (prev.length > 0 ? prev.slice(1) : prev)),
      900,
    );

    // Spawn particles
    cells.forEach((cell) => {
      for (let i = 0; i < 3; i++) {
        setParticles((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: cell.c,
            y: cell.r,
            emoji: FLOWERS[currentBoard[cell.r][cell.c].type]?.emoji || "✨",
          },
        ]);
      }
    });
    setTimeout(
      () => setParticles((prev) => (prev.length > 6 ? prev.slice(3) : [])),
      700,
    );

    // After showing matched animation, collapse
    setTimeout(() => {
      const newBoard = copyBoard(currentBoard);

      // Apply specials
      for (const sp of specials) {
        if (!m.has(`${sp.r},${sp.c}`)) continue;
        newBoard[sp.r][sp.c] = {
          type: currentBoard[sp.r][sp.c].type,
          key: Math.random(),
          special: sp.kind,
        };
        m.delete(`${sp.r},${sp.c}`);
      }

      // Handle special tile explosions
      const toRemove = new Set(m);
      for (const key of m) {
        const [r, c] = key.split(",").map(Number);
        const cell = currentBoard[r][c];
        if (cell.special === "star") {
          // Clear row
          for (let cc = 0; cc < COLS; cc++) toRemove.add(`${r},${cc}`);
        } else if (cell.special === "diamond") {
          // Clear all of same type
          for (let rr = 0; rr < ROWS; rr++)
            for (let cc = 0; cc < COLS; cc++)
              if (newBoard[rr][cc].type === cell.type)
                toRemove.add(`${rr},${cc}`);
        }
      }

      // Remove matched cells
      for (const key of toRemove) {
        const [r, c] = key.split(",").map(Number);
        newBoard[r][c] = null;
      }

      // Gravity
      for (let c = 0; c < COLS; c++) {
        let writeRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (newBoard[r][c] !== null) {
            if (writeRow !== r) {
              newBoard[writeRow][c] = newBoard[r][c];
              newBoard[r][c] = null;
            }
            writeRow--;
          }
        }
        // Fill empty top
        for (let r = writeRow; r >= 0; r--) {
          newBoard[r][c] = {
            type: randFlower(),
            key: Math.random(),
            special: null,
            dropping: true,
          };
        }
      }

      setBoard(newBoard);
      setMatched(new Set());

      // Check for cascading matches
      setTimeout(() => {
        processMatches(newBoard, newCombo);
      }, 300);
    }, 400);
  }, []);

  /* ── Show hint on board (shared logic) ── */
  const showHintOnBoard = useCallback(
    (countAsUsed) => {
      if (animating || phase !== "playing") return;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (c < COLS - 1) {
            const nb = copyBoard(board);
            [nb[r][c], nb[r][c + 1]] = [nb[r][c + 1], nb[r][c]];
            if (findAllMatches(nb).matched.size > 0) {
              setHint({ from: { r, c }, to: { r, c: c + 1 } });
              if (countAsUsed) setHintUsed((h) => h + 1);
              clearTimeout(hintTimer.current);
              hintTimer.current = setTimeout(() => setHint(null), 2500);
              return;
            }
          }
          if (r < ROWS - 1) {
            const nb = copyBoard(board);
            [nb[r][c], nb[r + 1][c]] = [nb[r + 1][c], nb[r][c]];
            if (findAllMatches(nb).matched.size > 0) {
              setHint({ from: { r, c }, to: { r: r + 1, c } });
              if (countAsUsed) setHintUsed((h) => h + 1);
              clearTimeout(hintTimer.current);
              hintTimer.current = setTimeout(() => setHint(null), 2500);
              return;
            }
          }
        }
      }
    },
    [board, animating, phase],
  );

  /* ── Hint finder (manual — costs a use) ── */
  const findHint = useCallback(() => showHintOnBoard(true), [showHintOnBoard]);

  /* ── Auto-hint after 10s idle (free) ── */
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (phase === "playing" && !animating) {
      idleTimer.current = setTimeout(() => showHintOnBoard(false), 6000);
    }
  }, [phase, animating, showHintOnBoard]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [resetIdleTimer, board]);

  /* ── Handle swap ── */
  const trySwap = useCallback(
    (from, to) => {
      if (animating) return;
      if (!isAdjacent(from, to)) {
        setSelected(null);
        return;
      }

      setAnimating(true);
      setSwapping({ from, to });

      setTimeout(() => {
        const newBoard = copyBoard(board);
        const cellFrom = newBoard[from.r][from.c];
        const cellTo = newBoard[to.r][to.c];

        // Check if either cell is a special tile
        const fromSpecial = cellFrom?.special;
        const toSpecial = cellTo?.special;

        if (fromSpecial || toSpecial) {
          // Special swap — always valid, apply effects
          const toRemove = new Set();

          // Handle star special (clears row or column based on swap direction)
          const handleStar = (sr, sc) => {
            const isHorizontalSwap = from.r === to.r;
            if (isHorizontalSwap) {
              // Clear row
              for (let cc = 0; cc < COLS; cc++) toRemove.add(`${sr},${cc}`);
            } else {
              // Clear column
              for (let rr = 0; rr < ROWS; rr++) toRemove.add(`${rr},${sc}`);
            }
          };

          // Handle diamond special (clears all of the other tile's type)
          const handleDiamond = (otherCell) => {
            const targetType = otherCell?.type;
            if (targetType == null) return;
            for (let rr = 0; rr < ROWS; rr++)
              for (let cc = 0; cc < COLS; cc++)
                if (newBoard[rr][cc]?.type === targetType)
                  toRemove.add(`${rr},${cc}`);
          };

          if (fromSpecial === "star") handleStar(from.r, from.c);
          if (toSpecial === "star") handleStar(to.r, to.c);
          if (fromSpecial === "diamond") handleDiamond(cellTo);
          if (toSpecial === "diamond") handleDiamond(cellFrom);

          // Also remove the special tiles themselves
          toRemove.add(`${from.r},${from.c}`);
          toRemove.add(`${to.r},${to.c}`);

          // Calculate score
          const pts = toRemove.size * 15;
          setScore((s) => {
            const next = s + pts;
            setBestScore((b) => {
              const nb = Math.max(b, next);
              try { localStorage.setItem("fc_best", String(nb)); } catch {}
              return nb;
            });
            return next;
          });

          // Score popup
          setScorePopups((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), text: `+${pts} 💥`, r: from.r, c: from.c },
          ]);
          setTimeout(() => setScorePopups((prev) => prev.length > 0 ? prev.slice(1) : prev), 900);

          setMatched(toRemove);
          setSwapping(null);
          setSelected(null);
          setMoves((mv) => {
            const next = mv - 1;
            if (next <= 0) {
              setTimeout(() => {
                setContinued((c) => {
                  if (!c) setPhase("continue");
                  else setPhase("over");
                  return c;
                });
              }, 800);
            }
            return next;
          });

          // After animation, remove and refill
          setTimeout(() => {
            for (const key of toRemove) {
              const [r, c] = key.split(",").map(Number);
              newBoard[r][c] = null;
            }

            // Gravity
            for (let c = 0; c < COLS; c++) {
              let writeRow = ROWS - 1;
              for (let r = ROWS - 1; r >= 0; r--) {
                if (newBoard[r][c] !== null) {
                  if (writeRow !== r) {
                    newBoard[writeRow][c] = newBoard[r][c];
                    newBoard[r][c] = null;
                  }
                  writeRow--;
                }
              }
              for (let r = writeRow; r >= 0; r--) {
                newBoard[r][c] = { type: randFlower(), key: Math.random(), special: null, dropping: true };
              }
            }

            setBoard(newBoard);
            setMatched(new Set());
            setTimeout(() => processMatches(newBoard, 1), 300);
          }, 400);

          return;
        }

        // Normal swap
        [newBoard[from.r][from.c], newBoard[to.r][to.c]] = [
          newBoard[to.r][to.c],
          newBoard[from.r][from.c],
        ];

        const { matched: m } = findAllMatches(newBoard);
        if (m.size === 0) {
          // Invalid swap — swap back
          setSwapping(null);
          setAnimating(false);
          setSelected(null);
          return;
        }

        setBoard(newBoard);
        setSwapping(null);
        setSelected(null);
        setMoves((mv) => {
          const next = mv - 1;
          if (next <= 0) {
            setTimeout(() => {
              setContinued((c) => {
                if (!c) {
                  setPhase("continue");
                } else {
                  setPhase("over");
                }
                return c;
              });
            }, 800);
          }
          return next;
        });

        processMatches(newBoard, 0);
      }, 280);
    },
    [board, animating, processMatches],
  );

  /* ── Cell click ── */
  const handleCellClick = useCallback(
    (r, c) => {
      if (phase !== "playing" || animating) return;
      resetIdleTimer();
      setHint(null);

      if (selected) {
        if (selected.r === r && selected.c === c) {
          setSelected(null);
        } else {
          trySwap(selected, { r, c });
        }
      } else {
        setSelected({ r, c });
      }
    },
    [phase, animating, selected, trySwap, resetIdleTimer],
  );

  /* ── Touch/drag swap ── */
  const dragStart = useRef(null);
  const handleTouchStart = (r, c, e) => {
    if (phase !== "playing" || animating) return;
    const touch = e.touches?.[0] || e;
    dragStart.current = { r, c, x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!dragStart.current) return;
    const touch = e.changedTouches?.[0] || e;
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    const { r, c } = dragStart.current;
    dragStart.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;

    let tr = r,
      tc = c;
    if (absDx > absDy) {
      tc = dx > 0 ? c + 1 : c - 1;
    } else {
      tr = dy > 0 ? r + 1 : r - 1;
    }

    if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
      setSelected({ r, c });
      resetIdleTimer();
      setHint(null);
      setTimeout(() => trySwap({ r, c }, { r: tr, c: tc }), 50);
    }
  };

  /* ── Shuffle board ── */
  const shuffleBoard = useCallback(() => {
    if (animating || shufflesLeft <= 0 || phase !== "playing") return;
    const newBoard = createBoard();
    setBoard(newBoard);
    setShufflesLeft((s) => s - 1);
    setHint(null);
    setSelected(null);
  }, [animating, shufflesLeft, phase]);

  /* ── Add extra moves ── */
  const addExtraMoves = useCallback(() => {
    if (extraMovesLeft <= 0 || phase !== "playing") return;
    setMoves((m) => m + 5);
    setExtraMovesLeft(0);
  }, [extraMovesLeft, phase]);

  /* ── Continue game (from game over) ── */
  const handleContinue = useCallback(() => {
    setContinued(true);
    setMoves(5);
    setPhase("playing");
  }, []);

  /* ─── floating petals for menu ─── */
  const floatingPetals = "🌹🌷🌻🌺🌸💐🌼🌹🌷🌸";

  /* ─── MENU ─── */
  if (phase === "menu") {
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card">
            <div className="fc-deco">🌸</div>
            <h1 className="fc-title">Flower Crush</h1>
            <p className="fc-sub">
              Swap adjacent flowers to match 3 or more in a row. Create combos
              for bonus points!
            </p>
            <div className="fc-rules">
              <div className="fc-rule">
                <span>👆</span> Tap or swipe to swap flowers
              </div>
              <div className="fc-rule">
                <span>3️⃣</span> Match 3+ same flowers
              </div>
              <div className="fc-rule">
                <span>⭐</span> Match 4 = Star (clears row)
              </div>
              <div className="fc-rule">
                <span>💎</span> Match 5 = Diamond (clears color)
              </div>
              <div className="fc-rule">
                <span>🔥</span> Chain combos for multiplied score
              </div>
            </div>
            {bestScore > 0 && <p className="fc-best">🏆 Best: {bestScore}</p>}
            <button className="fc-start-btn" onClick={startGame}>
              <span className="fc-btn-icon">🌸</span>
              Start Crushing!
            </button>
          </div>
          <div className="fc-floating">
            {[...floatingPetals].map((f, i) => (
              <span
                key={i}
                className="fc-float-petal"
                style={{
                  left: `${5 + Math.random() * 90}%`,
                  animationDelay: `${Math.random() * 6}s`,
                  animationDuration: `${5 + Math.random() * 5}s`,
                  fontSize: `${1 + Math.random() * 1.5}rem`,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── GAME OVER ─── */
  if (phase === "over") {
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card">
            <div className="fc-deco">{score >= bestScore ? "🏆" : "🌸"}</div>
            <h1 className="fc-title">
              {score >= bestScore ? "New Best!" : "Game Over"}
            </h1>
            <div className="fc-stats">
              <div className="fc-stat">
                <span className="fc-stat-icon">⭐</span>
                <span className="fc-stat-val">{score}</span>
                <span className="fc-stat-label">Score</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-icon">🏆</span>
                <span className="fc-stat-val">{bestScore}</span>
                <span className="fc-stat-label">Best</span>
              </div>
            </div>
            <div className="fc-over-actions">
              <button className="fc-start-btn" onClick={startGame}>
                <span className="fc-btn-icon">🔄</span>
                Play Again
              </button>
              <button className="fc-back-btn" onClick={() => setPhase("menu")}>
                Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CONTINUE PROMPT ─── */
  if (phase === "continue") {
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card">
            <div className="fc-deco">💫</div>
            <h1 className="fc-title">Out of Moves!</h1>
            <p className="fc-sub">
              Your score so far:{" "}
              <strong style={{ color: "#fff" }}>{score}</strong>
            </p>
            <p className="fc-sub" style={{ marginBottom: 0 }}>
              Continue with 5 extra moves?
            </p>
            <div className="fc-over-actions">
              <button
                className="fc-start-btn fc-continue-btn"
                onClick={handleContinue}
              >
                <span className="fc-btn-icon">▶️</span>
                Continue (+5 moves)
              </button>
              <button className="fc-back-btn" onClick={() => setPhase("over")}>
                End Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── PLAYING ─── */
  const isHintFrom = hint && hint.from;
  const isHintTo = hint && hint.to;

  return (
    <div className="fc-page">
      <div className="fc-game">
        {/* HUD */}
        <div className="fc-hud">
          <div className="fc-hud-item">
            <span className="fc-hud-label">Score</span>
            <span className="fc-hud-val">{score}</span>
          </div>
          <div className="fc-hud-item">
            <span className="fc-hud-label">Moves</span>
            <span className="fc-hud-val fc-moves">{moves}</span>
          </div>
          <div className="fc-hud-item">
            <span className="fc-hud-label">Best</span>
            <span className="fc-hud-val">{bestScore}</span>
          </div>
        </div>

        {/* Fixed combo area */}
        <div className="fc-combo-zone">
          {combo > 1 && <div className="fc-combo-bar">🔥 Combo x{combo}!</div>}
        </div>

        {/* Helper buttons */}
        <div className="fc-helpers">
          <button
            className={`fc-helper-btn${hintUsed >= 5 ? " fc-helper-disabled" : ""}`}
            onClick={findHint}
            disabled={hintUsed >= 5 || animating}
            title="Show a hint"
          >
            <span>💡</span>
            <span className="fc-helper-label">Hint</span>
            <span className="fc-helper-count">{Math.max(0, 5 - hintUsed)}</span>
          </button>
          <button
            className={`fc-helper-btn${shufflesLeft <= 0 ? " fc-helper-disabled" : ""}`}
            onClick={shuffleBoard}
            disabled={shufflesLeft <= 0 || animating}
            title="Shuffle the board"
          >
            <span>🔀</span>
            <span className="fc-helper-label">Shuffle</span>
            <span className="fc-helper-count">{shufflesLeft}</span>
          </button>
          <button
            className={`fc-helper-btn${extraMovesLeft <= 0 ? " fc-helper-disabled" : ""}`}
            onClick={addExtraMoves}
            disabled={extraMovesLeft <= 0 || animating}
            title="+5 extra moves"
          >
            <span>➕</span>
            <span className="fc-helper-label">+5 Moves</span>
            <span className="fc-helper-count">{extraMovesLeft}</span>
          </button>
        </div>

        {/* Board */}
        <div
          className="fc-board"
          ref={boardRef}
          onTouchEnd={handleTouchEnd}
          onMouseUp={handleTouchEnd}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              const isSelected =
                selected && selected.r === r && selected.c === c;
              const isMatched = matched.has(`${r},${c}`);
              const isSwapFrom =
                swapping && swapping.from.r === r && swapping.from.c === c;
              const isSwapTo =
                swapping && swapping.to.r === r && swapping.to.c === c;
              const isHinted =
                (isHintFrom && isHintFrom.r === r && isHintFrom.c === c) ||
                (isHintTo && isHintTo.r === r && isHintTo.c === c);

              let swapStyle = {};
              if (isSwapFrom && swapping) {
                const dr = swapping.to.r - swapping.from.r;
                const dc = swapping.to.c - swapping.from.c;
                swapStyle = {
                  transform: `translate(${dc * 100}%, ${dr * 100}%)`,
                  transition: "transform 0.25s ease",
                  zIndex: 5,
                };
              } else if (isSwapTo && swapping) {
                const dr = swapping.from.r - swapping.to.r;
                const dc = swapping.from.c - swapping.to.c;
                swapStyle = {
                  transform: `translate(${dc * 100}%, ${dr * 100}%)`,
                  transition: "transform 0.25s ease",
                  zIndex: 5,
                };
              }

              return (
                <div
                  key={cell.key}
                  className={`fc-cell${isSelected ? " fc-selected" : ""}${isMatched ? " fc-matched" : ""}${cell.special === "star" ? " fc-star" : ""}${cell.special === "diamond" ? " fc-diamond" : ""}${cell.dropping ? " fc-dropping" : ""}${isHinted ? " fc-hinted" : ""}`}
                  style={{
                    gridRow: r + 1,
                    gridColumn: c + 1,
                    ...swapStyle,
                  }}
                  onClick={() => handleCellClick(r, c)}
                  onTouchStart={(e) => handleTouchStart(r, c, e)}
                  onMouseDown={(e) => handleTouchStart(r, c, e)}
                >
                  <span className="fc-emoji">
                    {cell.special === "star"
                      ? SPECIAL_4
                      : cell.special === "diamond"
                        ? SPECIAL_5
                        : FLOWERS[cell.type]?.emoji}
                  </span>
                </div>
              );
            }),
          )}

          {/* Score popups */}
          {scorePopups.map((p) => (
            <div
              key={p.id}
              className="fc-score-popup"
              style={{
                gridRow: Math.round(p.r) + 1,
                gridColumn: Math.round(p.c) + 1,
              }}
            >
              {p.text}
            </div>
          ))}

          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="fc-particle"
              style={{
                gridRow: Math.round(p.y) + 1,
                gridColumn: Math.round(p.x) + 1,
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FlowerCrush;
