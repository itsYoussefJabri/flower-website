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

/* ─── level config ─── wall patterns: array of [r,c] pairs */
const LEVELS = [
  { level: 1, label: "Garden Sprout", moves: 30, target: 300, walls: [] },
  {
    level: 2,
    label: "Petal Path",
    moves: 28,
    target: 500,
    walls: [
      [3, 3],
      [3, 4],
      [4, 3],
      [4, 4],
    ],
  },
  {
    level: 3,
    label: "Blossom Field",
    moves: 26,
    target: 700,
    walls: [
      [0, 0],
      [0, 7],
      [7, 0],
      [7, 7],
      [3, 3],
      [4, 4],
    ],
  },
  {
    level: 4,
    label: "Rose Maze",
    moves: 25,
    target: 900,
    walls: [
      [1, 1],
      [1, 6],
      [6, 1],
      [6, 6],
      [3, 0],
      [3, 7],
      [4, 0],
      [4, 7],
    ],
  },
  {
    level: 5,
    label: "Sunflower Valley",
    moves: 24,
    target: 1100,
    walls: [
      [0, 3],
      [0, 4],
      [7, 3],
      [7, 4],
      [3, 0],
      [4, 0],
      [3, 7],
      [4, 7],
      [3, 3],
      [4, 4],
    ],
  },
  {
    level: 6,
    label: "Wildflower Storm",
    moves: 23,
    target: 1300,
    walls: [
      [0, 0],
      [0, 1],
      [0, 6],
      [0, 7],
      [7, 0],
      [7, 1],
      [7, 6],
      [7, 7],
      [3, 3],
      [3, 4],
      [4, 3],
      [4, 4],
    ],
  },
  {
    level: 7,
    label: "Enchanted Grove",
    moves: 22,
    target: 1500,
    walls: [
      [1, 0],
      [2, 0],
      [5, 0],
      [6, 0],
      [1, 7],
      [2, 7],
      [5, 7],
      [6, 7],
      [0, 3],
      [0, 4],
      [7, 3],
      [7, 4],
      [3, 3],
      [4, 4],
    ],
  },
  {
    level: 8,
    label: "Mystic Bloom",
    moves: 20,
    target: 1800,
    walls: [
      [0, 0],
      [0, 1],
      [0, 6],
      [0, 7],
      [1, 0],
      [1, 7],
      [6, 0],
      [6, 7],
      [7, 0],
      [7, 1],
      [7, 6],
      [7, 7],
      [2, 2],
      [2, 5],
      [5, 2],
      [5, 5],
    ],
  },
  {
    level: 9,
    label: "Flower Tempest",
    moves: 18,
    target: 2200,
    walls: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 5],
      [0, 6],
      [0, 7],
      [1, 0],
      [1, 7],
      [2, 0],
      [2, 7],
      [5, 0],
      [5, 7],
      [6, 0],
      [6, 7],
      [7, 0],
      [7, 1],
      [7, 2],
      [7, 5],
      [7, 6],
      [7, 7],
    ],
  },
  {
    level: 10,
    label: "Eternal Garden",
    moves: 16,
    target: 2500,
    walls: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 5],
      [0, 6],
      [0, 7],
      [1, 0],
      [1, 1],
      [1, 6],
      [1, 7],
      [2, 0],
      [2, 7],
      [5, 0],
      [5, 7],
      [6, 0],
      [6, 1],
      [6, 6],
      [6, 7],
      [7, 0],
      [7, 1],
      [7, 2],
      [7, 5],
      [7, 6],
      [7, 7],
    ],
  },
];

function getWallSet(levelNum) {
  const cfg = LEVELS[levelNum - 1] || LEVELS[0];
  const s = new Set();
  for (const [r, c] of cfg.walls) s.add(`${r},${c}`);
  return s;
}

/* ─── helpers ─── */
const WALL_CELL = { type: -1, key: "wall", special: "wall" };
const randFlower = (count = FLOWERS.length) =>
  Math.floor(Math.random() * count);

function createBoard(flowerCount = FLOWERS.length, wallSet = new Set()) {
  const b = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      if (wallSet.has(`${r},${c}`))
        return { ...WALL_CELL, key: `wall-${r}-${c}` };
      return {
        type: randFlower(flowerCount),
        key: Math.random(),
        special: null,
      };
    }),
  );
  // Remove initial matches (skip walls)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c].special === "wall") continue;
      while (hasMatchAt(b, r, c)) {
        b[r][c] = {
          type: randFlower(flowerCount),
          key: Math.random(),
          special: null,
        };
      }
    }
  }
  return b;
}

function hasMatchAt(board, r, c) {
  if (board[r][c].special === "wall" || board[r][c].type < 0) return false;
  const t = board[r][c].type;
  // Horizontal
  if (
    c >= 2 &&
    board[r][c - 1].type === t &&
    board[r][c - 1].special !== "wall" &&
    board[r][c - 2].type === t &&
    board[r][c - 2].special !== "wall"
  )
    return true;
  // Vertical
  if (
    r >= 2 &&
    board[r - 1][c].type === t &&
    board[r - 1][c].special !== "wall" &&
    board[r - 2][c].type === t &&
    board[r - 2][c].special !== "wall"
  )
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
      const startIsWall = board[r][start]?.special === "wall";
      const curIsWall = c < COLS && board[r][c]?.special === "wall";
      if (
        c < COLS &&
        !startIsWall &&
        !curIsWall &&
        board[r][c].type === board[r][start].type &&
        board[r][c].type >= 0
      )
        continue;
      if (!startIsWall) {
        const len = c - start;
        if (len >= 3) {
          for (let i = start; i < c; i++) matched.add(`${r},${i}`);
          if (len === 4) specials.push({ r, c: start + 1, kind: "star" });
          if (len >= 5) specials.push({ r, c: start + 2, kind: "diamond" });
        }
      }
      start = c;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      const startIsWall = board[start][c]?.special === "wall";
      const curIsWall = r < ROWS && board[r][c]?.special === "wall";
      if (
        r < ROWS &&
        !startIsWall &&
        !curIsWall &&
        board[r][c].type === board[start][c].type &&
        board[r][c].type >= 0
      )
        continue;
      if (!startIsWall) {
        const len = r - start;
        if (len >= 3) {
          for (let i = start; i < r; i++) matched.add(`${i},${c}`);
          if (len === 4) specials.push({ r: start + 1, c, kind: "star" });
          if (len >= 5) specials.push({ r: start + 2, c, kind: "diamond" });
        }
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
      if (board[r][c]?.special === "wall") continue;
      // Try swap right
      if (c < COLS - 1 && board[r][c + 1]?.special !== "wall") {
        const nb = copyBoard(board);
        [nb[r][c], nb[r][c + 1]] = [nb[r][c + 1], nb[r][c]];
        if (findAllMatches(nb).matched.size > 0) return true;
      }
      // Try swap down
      if (r < ROWS - 1 && board[r + 1][c]?.special !== "wall") {
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
  const [phase, setPhase] = useState("menu"); // menu | levels | playing | levelComplete | continue | over
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    try {
      return parseInt(localStorage.getItem("fc_unlocked") || "1", 10);
    } catch {
      return 1;
    }
  });
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(35);
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

  const lvl = LEVELS[currentLevel - 1] || LEVELS[0];

  const startLevel = useCallback((lvlNum) => {
    const cfg = LEVELS[lvlNum - 1] || LEVELS[0];
    setCurrentLevel(lvlNum);
    const b = createBoard(FLOWERS.length, getWallSet(lvlNum));
    setBoard(b);
    setSelected(null);
    setScore(0);
    setMoves(cfg.moves);
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
  const processMatches = useCallback(
    (currentBoard, currentCombo = 0) => {
      const { matched: m, specials } = findAllMatches(currentBoard);
      if (m.size === 0) {
        setAnimating(false);
        setCombo(0);
        // Check for valid moves
        if (!hasAnyValidMove(currentBoard)) {
          // Shuffle board
          const newBoard = createBoard(
            FLOWERS.length,
            getWallSet(currentLevel),
          );
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
        // Check level target
        const cfg = LEVELS[currentLevel - 1] || LEVELS[0];
        if (next >= cfg.target) {
          setTimeout(() => {
            const newUnlocked = Math.min(currentLevel + 1, LEVELS.length);
            setUnlockedLevel((prev) => {
              const u = Math.max(prev, newUnlocked);
              try {
                localStorage.setItem("fc_unlocked", String(u));
              } catch {}
              return u;
            });
            setPhase("levelComplete");
          }, 600);
        }
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
        () =>
          setScorePopups((prev) => (prev.length > 0 ? prev.slice(1) : prev)),
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
            for (let cc = 0; cc < COLS; cc++) {
              if (newBoard[r][cc]?.special !== "wall")
                toRemove.add(`${r},${cc}`);
            }
          } else if (cell.special === "diamond") {
            // Clear all of same type
            for (let rr = 0; rr < ROWS; rr++)
              for (let cc = 0; cc < COLS; cc++)
                if (
                  newBoard[rr][cc].type === cell.type &&
                  newBoard[rr][cc].special !== "wall"
                )
                  toRemove.add(`${rr},${cc}`);
          }
        }

        // Remove matched cells (never remove walls)
        for (const key of toRemove) {
          const [r, c] = key.split(",").map(Number);
          if (newBoard[r][c]?.special === "wall") continue;
          newBoard[r][c] = null;
        }

        // Gravity (skip walls — they stay in place)
        const wallSet = getWallSet(currentLevel);
        for (let c = 0; c < COLS; c++) {
          // Collect non-wall, non-null cells from bottom up
          const pieces = [];
          for (let r = ROWS - 1; r >= 0; r--) {
            if (wallSet.has(`${r},${c}`)) continue;
            if (newBoard[r][c] !== null) pieces.push(newBoard[r][c]);
          }
          // Place them back, skipping wall positions, from bottom up
          let idx = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (wallSet.has(`${r},${c}`)) continue;
            if (idx < pieces.length) {
              newBoard[r][c] = pieces[idx++];
            } else {
              newBoard[r][c] = {
                type: randFlower(FLOWERS.length),
                key: Math.random(),
                special: null,
                dropping: true,
              };
            }
          }
        }

        setBoard(newBoard);
        setMatched(new Set());

        // Check for cascading matches
        setTimeout(() => {
          processMatches(newBoard, newCombo);
        }, 300);
      }, 400);
    },
    [currentLevel],
  );

  /* ── Show hint on board (shared logic) ── */
  const showHintOnBoard = useCallback(
    (countAsUsed) => {
      if (animating || phase !== "playing") return;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]?.special === "wall") continue;
          if (c < COLS - 1 && board[r][c + 1]?.special !== "wall") {
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
          if (r < ROWS - 1 && board[r + 1]?.[c]?.special !== "wall") {
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
              for (let cc = 0; cc < COLS; cc++) {
                if (newBoard[sr][cc]?.special !== "wall")
                  toRemove.add(`${sr},${cc}`);
              }
            } else {
              // Clear column
              for (let rr = 0; rr < ROWS; rr++) {
                if (newBoard[rr][sc]?.special !== "wall")
                  toRemove.add(`${rr},${sc}`);
              }
            }
          };

          // Handle diamond special (clears all of the other tile's type)
          const handleDiamond = (otherCell) => {
            const targetType = otherCell?.type;
            if (targetType == null) return;
            for (let rr = 0; rr < ROWS; rr++)
              for (let cc = 0; cc < COLS; cc++)
                if (
                  newBoard[rr][cc]?.type === targetType &&
                  newBoard[rr][cc]?.special !== "wall"
                )
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
              try {
                localStorage.setItem("fc_best", String(nb));
              } catch {}
              return nb;
            });
            return next;
          });

          // Score popup
          setScorePopups((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              text: `+${pts} 💥`,
              r: from.r,
              c: from.c,
            },
          ]);
          setTimeout(
            () =>
              setScorePopups((prev) =>
                prev.length > 0 ? prev.slice(1) : prev,
              ),
            900,
          );

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
              if (newBoard[r][c]?.special === "wall") continue;
              newBoard[r][c] = null;
            }

            // Gravity (skip walls)
            const wallSet = getWallSet(currentLevel);
            for (let c = 0; c < COLS; c++) {
              const pieces = [];
              for (let r = ROWS - 1; r >= 0; r--) {
                if (wallSet.has(`${r},${c}`)) continue;
                if (newBoard[r][c] !== null) pieces.push(newBoard[r][c]);
              }
              let idx = 0;
              for (let r = ROWS - 1; r >= 0; r--) {
                if (wallSet.has(`${r},${c}`)) continue;
                if (idx < pieces.length) {
                  newBoard[r][c] = pieces[idx++];
                } else {
                  newBoard[r][c] = {
                    type: randFlower(FLOWERS.length),
                    key: Math.random(),
                    special: null,
                    dropping: true,
                  };
                }
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
      if (board[r]?.[c]?.special === "wall") return;
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
    [phase, animating, selected, trySwap, resetIdleTimer, board],
  );

  /* ── Touch/drag swap ── */
  const dragStart = useRef(null);
  const handleTouchStart = (r, c, e) => {
    if (phase !== "playing" || animating) return;
    if (board[r]?.[c]?.special === "wall") return;
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
    const newBoard = createBoard(FLOWERS.length, getWallSet(currentLevel));
    setBoard(newBoard);
    setShufflesLeft((s) => s - 1);
    setHint(null);
    setSelected(null);
  }, [animating, shufflesLeft, phase, currentLevel]);

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
                <span>⭐</span> Match 4 = Star (clears row/col)
              </div>
              <div className="fc-rule">
                <span>💎</span> Match 5 = Diamond (clears color)
              </div>
              <div className="fc-rule">
                <span>🔥</span> Chain combos for multiplied score
              </div>
            </div>
            {bestScore > 0 && <p className="fc-best">🏆 Best: {bestScore}</p>}
            <button className="fc-start-btn" onClick={() => setPhase("levels")}>
              <span className="fc-btn-icon">🌸</span>
              Play Levels
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

  /* ─── LEVEL SELECT ─── */
  if (phase === "levels") {
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card fc-levels-card">
            <div className="fc-deco">🌺</div>
            <h1 className="fc-title">Select Level</h1>
            <div className="fc-level-grid">
              {LEVELS.map((lv) => {
                const locked = lv.level > unlockedLevel;
                return (
                  <button
                    key={lv.level}
                    className={`fc-level-btn${locked ? " fc-level-locked" : ""}${lv.level === unlockedLevel ? " fc-level-current" : ""}`}
                    onClick={() => !locked && startLevel(lv.level)}
                    disabled={locked}
                    title={
                      locked
                        ? "Locked"
                        : `${lv.label} — ${lv.walls.length} walls`
                    }
                  >
                    <span className="fc-level-num">
                      {locked ? "🔒" : lv.level}
                    </span>
                    <span className="fc-level-name">{lv.label}</span>
                    <span className="fc-level-info">
                      {locked
                        ? ""
                        : lv.walls.length > 0
                          ? `🧱 ${lv.walls.length}`
                          : "🌿 Free"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button className="fc-back-btn" onClick={() => setPhase("menu")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── GAME OVER (failed level) ─── */
  if (phase === "over") {
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card">
            <div className="fc-deco">🌸</div>
            <h1 className="fc-title">Level {currentLevel} Failed</h1>
            <p className="fc-sub">
              Target: <strong style={{ color: "#f5a6c0" }}>{lvl.target}</strong>{" "}
              — You scored: <strong style={{ color: "#fff" }}>{score}</strong>
            </p>
            <div className="fc-stats">
              <div className="fc-stat">
                <span className="fc-stat-icon">⭐</span>
                <span className="fc-stat-val">{score}</span>
                <span className="fc-stat-label">Score</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-icon">🎯</span>
                <span className="fc-stat-val">{lvl.target}</span>
                <span className="fc-stat-label">Target</span>
              </div>
            </div>
            <div className="fc-over-actions">
              <button
                className="fc-start-btn"
                onClick={() => startLevel(currentLevel)}
              >
                <span className="fc-btn-icon">🔄</span>
                Retry Level {currentLevel}
              </button>
              <button
                className="fc-back-btn"
                onClick={() => setPhase("levels")}
              >
                Levels
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── LEVEL COMPLETE ─── */
  if (phase === "levelComplete") {
    const isLastLevel = currentLevel >= LEVELS.length;
    return (
      <div className="fc-page">
        <div className="fc-menu-screen">
          <div className="fc-menu-card">
            <div className="fc-deco">🏆</div>
            <h1 className="fc-title">
              {isLastLevel
                ? "You Beat All Levels!"
                : `Level ${currentLevel} Complete!`}
            </h1>
            <p className="fc-sub">{lvl.label}</p>
            <div className="fc-stats">
              <div className="fc-stat">
                <span className="fc-stat-icon">⭐</span>
                <span className="fc-stat-val">{score}</span>
                <span className="fc-stat-label">Score</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-icon">🎯</span>
                <span className="fc-stat-val">{lvl.target}</span>
                <span className="fc-stat-label">Target</span>
              </div>
            </div>
            <div className="fc-over-actions">
              {!isLastLevel && (
                <button
                  className="fc-start-btn fc-continue-btn"
                  onClick={() => startLevel(currentLevel + 1)}
                >
                  <span className="fc-btn-icon">▶️</span>
                  Next Level
                </button>
              )}
              <button
                className="fc-start-btn"
                onClick={() => startLevel(currentLevel)}
              >
                <span className="fc-btn-icon">🔄</span>
                Replay
              </button>
              <button
                className="fc-back-btn"
                onClick={() => setPhase("levels")}
              >
                Levels
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
            <span className="fc-hud-label">Level {currentLevel}</span>
            <span className="fc-hud-val">
              {score}
              <span className="fc-hud-target">/{lvl.target}</span>
            </span>
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

              // Wall cell — empty inactive square
              if (cell.special === "wall") {
                return (
                  <div
                    key={cell.key}
                    className="fc-cell fc-wall"
                    style={{ gridRow: r + 1, gridColumn: c + 1 }}
                  />
                );
              }

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
