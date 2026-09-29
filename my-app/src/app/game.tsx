import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  PanResponder,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from "react-native";
import Svg, { Circle, Line, Polygon, G } from "react-native-svg";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useGame, formatDateKey } from "../context/GameContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DIRS = [
  { x: 0, y: -1 }, // Up
  { x: 1, y: 0 },  // Right
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
];

interface Point {
  x: number;
  y: number;
}

interface SnakeItem {
  id: number;
  cells: Point[];
  headDir: Point;
  isSlithering: boolean;
  slitherProgress: number;
  extendedPath: Point[];
  shakeTimer: number;
}

const getLevelConfig = (lvl: number) => {
  const cols = Math.min(14, 7 + Math.floor((lvl - 1) / 3));
  const rows = Math.min(18, 9 + Math.floor((lvl - 1) / 3));
  const baseMoves = Math.floor(cols * rows * 0.9);

  let difficulty = "Normal";
  if (lvl === 1) difficulty = "Challenging";
  else if (lvl <= 5) difficulty = "Medium";
  else if (lvl <= 15) difficulty = "Hard";
  else difficulty = "Ultra";

  const maxLen = Math.min(8, 4 + Math.floor(lvl / 4));
  const pool = Array.from({ length: maxLen - 1 }, (_, i) => i + 2);

  return { difficulty, cols, rows, baseMoves, pool };
};

// Center Radial Confetti Component
const CenterRadialConfetti = () => {
  const particles = useRef(
    Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const radius = 80 + Math.random() * 150;
      return {
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius - 20,
        color: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#FF7A00"][i % 7],
        size: 7 + Math.random() * 6,
        anim: new Animated.Value(0),
      };
    })
  ).current;

  useEffect(() => {
    Animated.stagger(
      8,
      particles.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        })
      )
    ).start();
  }, []);

  return (
    <View style={styles.confettiCenterAnchor}>
      {particles.map((p, idx) => {
        const translateX = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.dx],
        });
        const translateY = p.anim.interpolate({
          inputRange: [0, 0.65, 1],
          outputRange: [0, p.dy, p.dy + 40],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 0.9, 0],
        });
        const scale = p.anim.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0.3, 1.25, 0.4],
        });

        return (
          <Animated.View
            key={idx}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              borderRadius: 3,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
};

export default function GameScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const {
    level,
    userSeed,
    completeLevel,
    getGamesForDate,
    currentStreak,
    levelProgress,
    saveLevelProgress,
  } = useGame();

  const currentLevelRef = useRef(level);
  currentLevelRef.current = level;

  const { difficulty, cols, rows } = getLevelConfig(level);

  const [remainingArrows, setRemainingArrows] = useState(0);
  const [hearts, setHearts] = useState(3);
  const heartsRef = useRef(3); // Synchronous tracker for hearts persistence
  const [hintsAvailable, setHintsAvailable] = useState(3);
  const hintsRef = useRef(3); // Synchronous tracker for hints persistence
  const [hintedId, setHintedId] = useState<number | null>(null);

  const [flashRed, setFlashRed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStreakScreen, setShowStreakScreen] = useState(false);
  const [victory, setVictory] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [isPrevLevelGreen, setIsPrevLevelGreen] = useState(false);
  const [isNextLevelBlue, setIsNextLevelBlue] = useState(false);
  const [animatedStreakNum, setAnimatedStreakNum] = useState(currentStreak);

  const streakZoomAnim = useRef(new Animated.Value(0)).current;
  const streakOpacityAnim = useRef(new Animated.Value(1)).current;
  const streakNumBumpAnim = useRef(new Animated.Value(1)).current;

  // Board layout sizing
  const cellSize = Math.max(28, Math.min(36, Math.floor((SCREEN_WIDTH - 24) / cols)));
  const boardWidth = cols * cellSize;
  const boardHeight = rows * cellSize;

  // Camera State (Infinite Pan & Smooth Zoom)
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const containerLayoutRef = useRef({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, x: 0, y: 0 });

  // Web HTML5 Canvas ref
  const htmlCanvasRef = useRef<any>(null);

  const snakesRef = useRef<SnakeItem[]>([]);
  const gridMapRef = useRef<number[][]>([]);
  const activeIdsRef = useRef<Set<number>>(new Set());
  const hasTriggeredWinRef = useRef(false);

  // Fast Tap Lock (Prevents duplicate touch/mouse synthesized events)
  const lastTapTimeRef = useRef<number>(0);

  const [, setFrameTick] = useState(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const triggerHaptic = (type: "light" | "error" | "success") => {
    try {
      if (type === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const createSeededRNG = (seedNumber: number) => {
    let s = (seedNumber ^ 0x6d2b79f5) >>> 0;
    return () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // --- DRAWING ENGINE FOR HTML5 CANVAS (WEB) ---
  const renderWebCanvas = useCallback(() => {
    if (Platform.OS !== "web" || !htmlCanvasRef.current) return;
    const canvasEl = htmlCanvasRef.current;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const rect = canvasEl.getBoundingClientRect();
    const cw = rect.width || containerLayoutRef.current.width;
    const ch = rect.height || containerLayoutRef.current.height;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    if (canvasEl.width !== Math.round(cw * dpr) || canvasEl.height !== Math.round(ch * dpr)) {
      canvasEl.width = Math.round(cw * dpr);
      canvasEl.height = Math.round(ch * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    const cam = cameraRef.current;
    ctx.translate(cw / 2 + cam.x, ch / 2 + cam.y);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-boardWidth / 2, -boardHeight / 2);

    // 1. Grid Dots
    ctx.fillStyle = isDark ? "#2A3142" : "#CBD5E1";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * cellSize;
        const cy = (r + 0.5) * cellSize;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Static Snakes
    const snakes = snakesRef.current;
    const activeIds = activeIdsRef.current;

    for (let s of snakes) {
      if (s.isSlithering || !activeIds.has(s.id)) continue;
      const isHinted = hintedId === s.id;
      const color = isHinted ? "#FF2A5F" : isDark ? "#F8FAFC" : "#0F172A";

      let shakeX = 0, shakeY = 0;
      if (s.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 5;
        shakeY = (Math.random() - 0.5) * 5;
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(3.5, cellSize * 0.2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      for (let i = 0; i < s.cells.length; i++) {
        const px = (s.cells[i].x + 0.5) * cellSize + shakeX;
        const py = (s.cells[i].y + 0.5) * cellSize + shakeY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const head = s.cells[s.cells.length - 1];
      drawCanvasArrowHead(
        ctx,
        (head.x + 0.5) * cellSize + shakeX,
        (head.y + 0.5) * cellSize + shakeY,
        s.headDir,
        cellSize * 0.42
      );
    }

    // 3. Slithering Blue Snakes
    for (let s of snakes) {
      if (!s.isSlithering) continue;
      const bodyLen = s.cells.length - 1;
      const subPath = samplePolylineSegment(s.extendedPath, s.slitherProgress, bodyLen + s.slitherProgress);
      if (subPath.length < 2) continue;

      ctx.strokeStyle = "#3B82F6";
      ctx.fillStyle = "#3B82F6";
      ctx.lineWidth = Math.max(3.5, cellSize * 0.2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      for (let i = 0; i < subPath.length; i++) {
        const px = (subPath[i].x + 0.5) * cellSize;
        const py = (subPath[i].y + 0.5) * cellSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const headPt = subPath[subPath.length - 1];
      let prevPt = subPath[subPath.length - 2];
      let dir = { x: headPt.x - prevPt.x, y: headPt.y - prevPt.y };
      let mag = Math.hypot(dir.x, dir.y);

      let idx = subPath.length - 3;
      while (mag < 0.0001 && idx >= 0) {
        prevPt = subPath[idx];
        dir = { x: headPt.x - prevPt.x, y: headPt.y - prevPt.y };
        mag = Math.hypot(dir.x, dir.y);
        idx--;
      }
      if (mag < 0.0001) {
        dir = { x: s.headDir.x, y: s.headDir.y };
        mag = Math.hypot(dir.x, dir.y) || 1;
      }
      dir.x /= mag;
      dir.y /= mag;

      drawCanvasArrowHead(ctx, (headPt.x + 0.5) * cellSize, (headPt.y + 0.5) * cellSize, dir, cellSize * 0.42);
    }

    ctx.restore();
  }, [cellSize, cols, rows, boardWidth, boardHeight, isDark, hintedId]);

  function drawCanvasArrowHead(ctx: any, x: number, y: number, dir: Point, size: number) {
    ctx.save();
    ctx.translate(x, y);
    const angle = Math.atan2(dir.y, dir.x);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(size * 1.15, 0);
    ctx.lineTo(-size * 0.7, -size * 0.8);
    ctx.lineTo(-size * 0.2, 0);
    ctx.lineTo(-size * 0.7, size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- GUARANTEED SOLVABLE LEVEL GENERATOR ---
  const generateLevel = useCallback(
    (lvlToBuild: number) => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }

      currentLevelRef.current = lvlToBuild;
      const config = getLevelConfig(lvlToBuild);
      const c = config.cols;
      const r = config.rows;
      const lengthPool = config.pool;

      let success = false;
      let attempts = 0;
      let newSnakes: SnakeItem[] = [];
      let newGrid: number[][] = [];
      let newActiveIds = new Set<number>();

      const baseSeed = ((userSeed ^ (lvlToBuild * 2654435761)) + (lvlToBuild * 9301 + 49297)) >>> 0;

      while (!success && attempts < 150) {
        attempts++;
        const rng = createSeededRNG(baseSeed + attempts * 1013);

        newGrid = Array.from({ length: r }, () => Array(c).fill(-1));
        newSnakes = [];
        newActiveIds.clear();

        let visited = Array.from({ length: r }, () => Array(c).fill(false));
        let currentId = 1;

        for (let rowIdx = 0; rowIdx < r; rowIdx++) {
          for (let colIdx = 0; colIdx < c; colIdx++) {
            if (!visited[rowIdx][colIdx]) {
              let targetLength = lengthPool[Math.floor(rng() * lengthPool.length)];
              let path = carveContiguousSnake(colIdx, rowIdx, visited, targetLength, c, r, rng);

              if (path.length > 0) {
                path.forEach((pt) => {
                  visited[pt.y][pt.x] = true;
                  newGrid[pt.y][pt.x] = currentId;
                });

                newSnakes.push({
                  id: currentId,
                  cells: path,
                  headDir: { x: 0, y: -1 },
                  isSlithering: false,
                  slitherProgress: 0,
                  extendedPath: [],
                  shakeTimer: 0,
                });
                newActiveIds.add(currentId);
                currentId++;
              }
            }
          }
        }

        absorbOrphansStrict(newSnakes, newGrid, newActiveIds);

        if (orientSnakesWithDAG(newSnakes, newGrid, c, r)) {
          success = true;
        }
      }

      for (let s of newSnakes) {
        let track = [...s.cells];
        let curr = s.cells[s.cells.length - 1];
        for (let i = 1; i <= Math.max(c, r) + 8; i++) {
          track.push({
            x: curr.x + s.headDir.x * i,
            y: curr.y + s.headDir.y * i,
          });
        }
        s.extendedPath = track;
      }

      // Restore in-progress cleared arrows, remaining hearts, and hints
      const clearedSet = new Set<number>();
      let restoredHearts = 3;
      let restoredHints = 3;

      if (levelProgress && levelProgress.level === lvlToBuild) {
        if (typeof levelProgress.hearts === "number") {
          restoredHearts = Math.max(1, levelProgress.hearts);
        }
        if (typeof levelProgress.hints === "number") {
          restoredHints = Math.max(0, levelProgress.hints);
        }
        levelProgress.clearedSnakeIds.forEach((id) => {
          clearedSet.add(id);
          const snake = newSnakes.find((s) => s.id === id);
          if (snake) {
            snake.cells.forEach((pt) => {
              newGrid[pt.y][pt.x] = -1;
            });
          }
          newActiveIds.delete(id);
        });
      }

      snakesRef.current = newSnakes;
      gridMapRef.current = newGrid;
      activeIdsRef.current = newActiveIds;
      hasTriggeredWinRef.current = false;

      const remainingCount = newSnakes.length - clearedSet.size;
      setRemainingArrows(remainingCount);
      heartsRef.current = restoredHearts;
      setHearts(restoredHearts);
      hintsRef.current = restoredHints;
      setHintsAvailable(restoredHints);
      setHintedId(null);
      setShowConfetti(false);
      setShowStreakScreen(false);
      setVictory(false);
      setGameOver(false);
      setIsPrevLevelGreen(false);
      setIsNextLevelBlue(false);

      cameraRef.current = { x: 0, y: 0, scale: 1 };
      setCamera({ x: 0, y: 0, scale: 1 });
      renderWebCanvas();
    },
    [userSeed, levelProgress, renderWebCanvas]
  );

  useEffect(() => {
    generateLevel(level);
  }, [level]);

  useEffect(() => {
    renderWebCanvas();
  }, [camera, isDark, hintedId, renderWebCanvas]);

  const openVictoryModal = () => {
    setVictory(true);
    setTimeout(() => setIsPrevLevelGreen(true), 300);
    setTimeout(() => setIsNextLevelBlue(true), 700);
  };

  const handleWinSequence = () => {
    setShowConfetti(true);
    triggerHaptic("success");

    const todayKey = formatDateKey(new Date());
    const playedTodayBefore = getGamesForDate(todayKey);
    const isFirstToday = playedTodayBefore === 0;

    if (isFirstToday) {
      setTimeout(() => {
        setAnimatedStreakNum(currentStreak);
        streakZoomAnim.setValue(0);
        streakOpacityAnim.setValue(1);
        streakNumBumpAnim.setValue(1);
        setShowStreakScreen(true);

        Animated.spring(streakZoomAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          setTimeout(() => {
            setAnimatedStreakNum(currentStreak + 1);
            triggerHaptic("light");
            Animated.sequence([
              Animated.timing(streakNumBumpAnim, { toValue: 1.35, duration: 150, useNativeDriver: Platform.OS !== "web" }),
              Animated.spring(streakNumBumpAnim, { toValue: 1, friction: 3, tension: 50, useNativeDriver: Platform.OS !== "web" }),
            ]).start();

            setTimeout(() => {
              Animated.parallel([
                Animated.timing(streakZoomAnim, {
                  toValue: 2.2,
                  duration: 550,
                  useNativeDriver: Platform.OS !== "web",
                }),
                Animated.timing(streakOpacityAnim, {
                  toValue: 0,
                  duration: 550,
                  useNativeDriver: Platform.OS !== "web",
                }),
              ]).start(() => {
                setShowStreakScreen(false);
                openVictoryModal();
              });
            }, 750);
          }, 450);
        });
      }, 600);
    } else {
      setTimeout(() => {
        openVictoryModal();
      }, 850);
    }
  };

  // 60-120fps Hardware Delta-Time Animation Loop (Snappy 0.55 slither speed)
  const startAnimationLoop = useCallback(() => {
    if (animFrameIdRef.current !== null) return;
    lastFrameTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastFrameTimeRef.current) / 16.67, 2.5);
      lastFrameTimeRef.current = currentTime;

      let isMoving = false;
      const snakes = snakesRef.current;
      const activeIds = activeIdsRef.current;

      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        if (s.isSlithering) {
          s.slitherProgress += 0.55 * dt; // Fast, snappy response
          if (s.slitherProgress < s.extendedPath.length + 1) {
            isMoving = true;
          }
        }
        if (s.shakeTimer > 0) {
          s.shakeTimer -= dt;
          isMoving = true;
        }
      }

      if (
        activeIds.size === 0 &&
        snakes.length > 0 &&
        !snakes.some((s) => s.isSlithering && s.slitherProgress < s.extendedPath.length)
      ) {
        if (!hasTriggeredWinRef.current) {
          hasTriggeredWinRef.current = true;
          handleWinSequence();
        }
      }

      if (Platform.OS === "web") {
        renderWebCanvas();
      } else {
        setFrameTick((t) => (t + 1) % 1000);
      }

      if (isMoving) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      } else {
        animFrameIdRef.current = null;
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [currentStreak, renderWebCanvas]);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // --- PIXEL-PERFECT INVERSE CAMERA HIT TESTING (Fast 90ms Tap Lock) ---
  const handleTap = (canvasX: number, canvasY: number, containerW: number, containerH: number) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 90) return;
    lastTapTimeRef.current = now;

    const cam = cameraRef.current;
    const boardLocalX = (canvasX - (containerW / 2 + cam.x)) / cam.scale + boardWidth / 2;
    const boardLocalY = (canvasY - (containerH / 2 + cam.y)) / cam.scale + boardHeight / 2;

    const hitTolerance = cellSize * 0.48;
    let closestSnakeId: number | null = null;
    let minDistance = Infinity;

    for (let j = 0; j < snakesRef.current.length; j++) {
      const snake = snakesRef.current[j];
      if (snake.isSlithering || !activeIdsRef.current.has(snake.id)) continue;

      let snakeMinDist = Infinity;

      for (let i = 1; i < snake.cells.length; i++) {
        const p1 = snake.cells[i - 1];
        const p2 = snake.cells[i];
        const x1 = (p1.x + 0.5) * cellSize;
        const y1 = (p1.y + 0.5) * cellSize;
        const x2 = (p2.x + 0.5) * cellSize;
        const y2 = (p2.y + 0.5) * cellSize;

        const d = distToSegment(boardLocalX, boardLocalY, x1, y1, x2, y2);
        if (d < snakeMinDist) snakeMinDist = d;
      }

      const head = snake.cells[snake.cells.length - 1];
      const hx = (head.x + 0.5) * cellSize;
      const hy = (head.y + 0.5) * cellSize;
      const headDist = Math.hypot(boardLocalX - hx, boardLocalY - hy);
      if (headDist < snakeMinDist) snakeMinDist = headDist;

      if (snakeMinDist <= hitTolerance && snakeMinDist < minDistance) {
        minDistance = snakeMinDist;
        closestSnakeId = snake.id;
      }
    }

    if (closestSnakeId !== null) {
      tapSnake(closestSnakeId);
    }
  };

  const tapSnake = (id: number) => {
    const snake = snakesRef.current.find((s) => s.id === id);
    if (!snake || snake.isSlithering) return;

    const head = snake.cells[snake.cells.length - 1];
    if (isRayClear(head, snake.headDir, snake.id, gridMapRef.current, cols, rows)) {
      // (No vibration on valid release)
      snake.cells.forEach((pt) => {
        gridMapRef.current[pt.y][pt.x] = -1;
      });
      snake.isSlithering = true;
      snake.slitherProgress = 0;
      activeIdsRef.current.delete(snake.id);

      const totalArrows = snakesRef.current.length;
      const remainingCount = activeIdsRef.current.size;
      setRemainingArrows(remainingCount);

      // Save exact progress, hearts & hints synchronously
      const allClearedIds = snakesRef.current
        .filter((s) => !activeIdsRef.current.has(s.id))
        .map((s) => s.id);
      saveLevelProgress(
        currentLevelRef.current,
        totalArrows,
        allClearedIds,
        heartsRef.current,
        hintsRef.current
      );

      if (hintedId === snake.id) setHintedId(null);
      startAnimationLoop();
    } else {
      // Invalid blocked tap -> Deduct strictly 1 heart, error vibration, shake arrow & flash red
      triggerHaptic("error");
      snake.shakeTimer = 8;
      setFlashRed(true);
      setTimeout(() => setFlashRed(false), 240);

      const nextH = Math.max(0, heartsRef.current - 1);
      heartsRef.current = nextH;
      setHearts(nextH);

      const totalArrows = snakesRef.current.length;
      const allClearedIds = snakesRef.current
        .filter((s) => !activeIdsRef.current.has(s.id))
        .map((s) => s.id);
      saveLevelProgress(
        currentLevelRef.current,
        totalArrows,
        allClearedIds,
        nextH,
        hintsRef.current
      );

      if (nextH <= 0) {
        setGameOver(true);
      }
      startAnimationLoop();
    }
  };

  const giveHint = () => {
    if (hintsRef.current <= 0) return;
    for (let s of snakesRef.current) {
      if (activeIdsRef.current.has(s.id) && !s.isSlithering) {
        const head = s.cells[s.cells.length - 1];
        if (isRayClear(head, s.headDir, s.id, gridMapRef.current, cols, rows)) {
          triggerHaptic("light");
          const nextHints = Math.max(0, hintsRef.current - 1);
          hintsRef.current = nextHints;
          setHintsAvailable(nextHints);

          // Save remaining hints to storage immediately
          const totalArrows = snakesRef.current.length;
          const allClearedIds = snakesRef.current
            .filter((s) => !activeIdsRef.current.has(s.id))
            .map((s) => s.id);
          saveLevelProgress(
            currentLevelRef.current,
            totalArrows,
            allClearedIds,
            heartsRef.current,
            nextHints
          );

          setHintedId(s.id);
          if (Platform.OS === "web") renderWebCanvas();
          else setFrameTick((t) => (t + 1) % 1000);
          return;
        }
      }
    }
  };

  const resetZoom = () => {
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    setCamera({ x: 0, y: 0, scale: 1 });
    renderWebCanvas();
  };

  // --- MOBILE WEB TOUCH & PINCH-ZOOM CONTROLLER ---
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvasEl = htmlCanvasRef.current;
    if (!canvasEl) return;

    let isPointerDown = false;
    let startX = 0, startY = 0;
    let initialCamX = 0, initialCamY = 0;
    let initialPinch = 0;
    let initialScale = 1;
    let touchStartTime = 0;
    let isTouchActive = false;

    const onTouchStart = (e: TouchEvent) => {
      isTouchActive = true;
      if (e.touches.length === 1) {
        isPointerDown = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialCamX = cameraRef.current.x;
        initialCamY = cameraRef.current.y;
        touchStartTime = Date.now();
        initialPinch = 0;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinch = Math.hypot(dx, dy) || 1;
        initialScale = cameraRef.current.scale;
        initialCamX = cameraRef.current.x;
        initialCamY = cameraRef.current.y;
        isPointerDown = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPointerDown) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        cameraRef.current.x = initialCamX + dx;
        cameraRef.current.y = initialCamY + dy;
        renderWebCanvas();
      } else if (e.touches.length === 2 && initialPinch > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentPinch = Math.hypot(dx, dy);
        const newScale = Math.min(Math.max(0.4, initialScale * (currentPinch / initialPinch)), 3.5);
        cameraRef.current.scale = newScale;
        renderWebCanvas();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isPointerDown && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
        const elapsed = Date.now() - touchStartTime;

        if (dist < 8 && elapsed < 350) {
          const rect = canvasEl.getBoundingClientRect();
          const clickX = touch.clientX - rect.left;
          const clickY = touch.clientY - rect.top;
          handleTap(clickX, clickY, rect.width, rect.height);
        }
      }
      isPointerDown = false;
      initialPinch = 0;
      setCamera({ ...cameraRef.current });
      setTimeout(() => { isTouchActive = false; }, 400);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isTouchActive) return;
      isPointerDown = true;
      startX = e.clientX;
      startY = e.clientY;
      initialCamX = cameraRef.current.x;
      initialCamY = cameraRef.current.y;
      touchStartTime = Date.now();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerDown || isTouchActive) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      cameraRef.current.x = initialCamX + dx;
      cameraRef.current.y = initialCamY + dy;
      renderWebCanvas();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isTouchActive) return;
      if (isPointerDown) {
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        const elapsed = Date.now() - touchStartTime;
        if (dist < 6 && elapsed < 350) {
          const rect = canvasEl.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          handleTap(clickX, clickY, rect.width, rect.height);
        }
      }
      isPointerDown = false;
      setCamera({ ...cameraRef.current });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.min(Math.max(0.4, cameraRef.current.scale * zoomFactor), 3.5);
      cameraRef.current.scale = newScale;
      setCamera({ ...cameraRef.current });
      renderWebCanvas();
    };

    canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", onTouchEnd, { passive: false });
    canvasEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvasEl.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      canvasEl.removeEventListener("touchend", onTouchEnd);
      canvasEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvasEl.removeEventListener("wheel", onWheel);
    };
  }, [renderWebCanvas]);

  // Native PanResponder for standalone mobile apps
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const nativeTouchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const nativePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== "web",
      onMoveShouldSetPanResponder: () => Platform.OS !== "web",
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches || [evt.nativeEvent];
        if (touches.length === 1) {
          nativeTouchStartRef.current = {
            x: touches[0].pageX,
            y: touches[0].pageY,
            time: Date.now(),
          };
          panStartRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
          pinchStartDistRef.current = null;
        } else if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartDistRef.current = Math.hypot(dx, dy) || 1;
          pinchStartScaleRef.current = cameraRef.current.scale;
          panStartRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [evt.nativeEvent];
        if (touches.length === 1 && !pinchStartDistRef.current) {
          cameraRef.current.x = panStartRef.current.x + gestureState.dx;
          cameraRef.current.y = panStartRef.current.y + gestureState.dy;
          setCamera({ ...cameraRef.current });
        } else if (touches.length === 2 && pinchStartDistRef.current) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const currentDist = Math.hypot(dx, dy);
          const newScale = Math.min(
            Math.max(0.4, pinchStartScaleRef.current * (currentDist / pinchStartDistRef.current)),
            3.5
          );
          cameraRef.current.scale = newScale;
          setCamera({ ...cameraRef.current });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const distMoved = Math.hypot(gestureState.dx, gestureState.dy);
        const timeDiff = Date.now() - nativeTouchStartRef.current.time;
        if (distMoved < 8 && timeDiff < 320) {
          const pageX = evt.nativeEvent.pageX || nativeTouchStartRef.current.x;
          const pageY = evt.nativeEvent.pageY || nativeTouchStartRef.current.y;
          const layout = containerLayoutRef.current;
          handleTap(pageX - layout.x, pageY - layout.y, layout.width, layout.height);
        }
        pinchStartDistRef.current = null;
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {flashRed && <View style={[styles.redFlashOverlay, { pointerEvents: "none" }]} />}

      {/* FULL-SCREEN INFINITE CANVAS STAGE */}
      <View
        style={[styles.fullScreenBoard, { backgroundColor: colors.bg }]}
        {...(Platform.OS !== "web" ? nativePanResponder.panHandlers : {})}
        onLayout={(e) => {
          containerLayoutRef.current = e.nativeEvent.layout;
          renderWebCanvas();
        }}
      >
        {Platform.OS === "web" ? (
          <canvas
            ref={htmlCanvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              touchAction: "none",
              userSelect: "none",
              cursor: "pointer",
            }}
          />
        ) : (
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.svgContainer}>
            <G
              transform={`translate(${
                containerLayoutRef.current.width / 2 + camera.x
              }, ${
                containerLayoutRef.current.height / 2 + camera.y
              }) scale(${camera.scale}) translate(${-boardWidth / 2}, ${-boardHeight / 2})`}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => (
                  <Circle
                    key={`dot-${r}-${c}`}
                    cx={(c + 0.5) * cellSize}
                    cy={(r + 0.5) * cellSize}
                    r={2.6}
                    fill={isDark ? "#2A3142" : "#CBD5E1"}
                  />
                ))
              )}

              {snakesRef.current.map((s) => {
                if (s.isSlithering || !activeIdsRef.current.has(s.id)) return null;
                return renderStaticSnake(s, cellSize, hintedId === s.id, isDark);
              })}

              {snakesRef.current.map((s) => {
                if (!s.isSlithering) return null;
                return renderSlitheringSnake(s, cellSize);
              })}
            </G>
          </Svg>
        )}
      </View>

      {/* FLOATING TOP BAR */}
      <View style={[styles.floatingTopBar, { pointerEvents: "box-none" }]}>
        <TouchableOpacity
          style={[styles.floatingRoundBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.floatingLevelBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.levelTitleText, { color: colors.text }]}>Level {level}</Text>
        </View>

        <TouchableOpacity
          style={[styles.floatingRoundBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => generateLevel(level)}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* FLOATING STATUS PILL */}
      <View style={[styles.floatingStatusWrapper, { pointerEvents: "box-none" }]}>
        <View style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.movesTag}>
            <Ionicons name="navigate-outline" size={15} color="#3B82F6" />
            <Text style={[styles.movesText, { color: colors.text }]}>{remainingArrows}</Text>
          </View>

          <View style={styles.heartsRow}>
            {[1, 2, 3].map((h) => (
              <Ionicons
                key={h}
                name={h <= hearts ? "heart" : "heart-outline"}
                size={17}
                color={h <= hearts ? "#EF4444" : "#CBD5E1"}
              />
            ))}
          </View>

          <View
            style={[
              styles.modeTag,
              {
                backgroundColor:
                  difficulty === "Challenging" || difficulty === "Medium"
                    ? isDark ? "#3A2814" : "#FEF3C7"
                    : difficulty === "Hard"
                    ? isDark ? "#3B1B18" : "#FEE2E2"
                    : isDark ? "#32173F" : "#F3E8FF",
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  color:
                    difficulty === "Challenging" || difficulty === "Medium"
                      ? "#D97706"
                      : difficulty === "Hard"
                      ? "#DC2626"
                      : "#9333EA",
                },
              ]}
            >
              {difficulty}
            </Text>
          </View>
        </View>
      </View>

      {/* FLOATING BOTTOM BUTTONS */}
      <View style={[styles.floatingBottomControls, { pointerEvents: "box-none" }]}>
        <TouchableOpacity
          style={[styles.circleActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={giveHint}
        >
          <Ionicons name="bulb-outline" size={24} color="#3B82F6" />
          {hintsAvailable > 0 && (
            <View style={styles.hintBadge}>
              <Text style={styles.hintBadgeText}>{hintsAvailable}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circleActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={resetZoom}
        >
          <Feather name="maximize-2" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* CENTER CONFETTI BURST */}
      {showConfetti && <CenterRadialConfetti />}

      {/* DEDICATED STREAK CELEBRATION */}
      <Modal visible={showStreakScreen} transparent animationType="none">
        <View style={styles.streakOverlayContainer}>
          <Animated.View
            style={[
              styles.streakCenterBox,
              {
                opacity: streakOpacityAnim,
                transform: [{ scale: streakZoomAnim }],
              },
            ]}
          >
            <View style={styles.streakFireCircle}>
              <Ionicons name="flame" size={84} color="#FF7A00" />
            </View>
            <Animated.Text
              style={[
                styles.streakGiantNumber,
                { transform: [{ scale: streakNumBumpAnim }] },
              ]}
            >
              {animatedStreakNum}
            </Animated.Text>
            <Text style={styles.streakLabelText}>Day Streak</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* NEXT LEVEL MODAL */}
      <Modal visible={victory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="trophy" size={40} color="#EAB308" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Level Cleared</Text>

            <View style={styles.levelTransitionRow}>
              <View
                style={[
                  styles.levelStepBadge,
                  {
                    backgroundColor: isPrevLevelGreen ? "#10B981" : "#3B82F6",
                    borderColor: isPrevLevelGreen ? "#059669" : "#2563EB",
                  },
                ]}
              >
                <Ionicons
                  name={isPrevLevelGreen ? "checkmark" : "navigate"}
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.levelStepText}>Lvl {level}</Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={20}
                color={isNextLevelBlue ? "#3B82F6" : "#94A3B8"}
              />

              <View
                style={[
                  styles.levelStepBadge,
                  {
                    backgroundColor: isNextLevelBlue
                      ? "#3B82F6"
                      : isDark ? "#1E2433" : "#E2E8F0",
                    borderColor: isNextLevelBlue
                      ? "#2563EB"
                      : isDark ? "#2A3142" : "#CBD5E1",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.levelStepText,
                    { color: isNextLevelBlue ? "#FFFFFF" : isDark ? "#64748B" : "#94A3B8" },
                  ]}
                >
                  Lvl {level + 1}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={async () => {
                await completeLevel();
              }}
            >
              <Text style={styles.modalButtonText}>Next Level</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* GAME OVER MODAL */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="alert-circle" size={44} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: "#EF4444" }]}>Out of Lives</Text>
            <Text style={[styles.modalSubtext, { color: colors.subtext }]}>
              Watch out for intersecting arrow trajectories.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
              activeOpacity={0.8}
              onPress={() => generateLevel(level)}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Native Render Helpers (Mobile App)
function renderStaticSnake(s: SnakeItem, cellSize: number, isHinted: boolean, isDark: boolean) {
  const shakeX = s.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = s.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;

  const color = isHinted ? "#FF2A5F" : isDark ? "#F8FAFC" : "#0F172A";
  const strokeWidth = Math.max(3.5, cellSize * 0.2);

  const head = s.cells[s.cells.length - 1];
  const hx = (head.x + 0.5) * cellSize + shakeX;
  const hy = (head.y + 0.5) * cellSize + shakeY;

  return (
    <G key={`snake-${s.id}`}>
      {s.cells.map((pt, i) => {
        if (i === 0) return null;
        const prev = s.cells[i - 1];
        return (
          <Line
            key={`seg-${s.id}-${i}`}
            x1={(prev.x + 0.5) * cellSize + shakeX}
            y1={(prev.y + 0.5) * cellSize + shakeY}
            x2={(pt.x + 0.5) * cellSize + shakeX}
            y2={(pt.y + 0.5) * cellSize + shakeY}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {renderArrowHead(hx, hy, s.headDir, cellSize * 0.42, color)}
    </G>
  );
}

function renderSlitheringSnake(s: SnakeItem, cellSize: number) {
  const color = "#3B82F6";
  const strokeWidth = Math.max(3.5, cellSize * 0.2);

  const bodyLength = s.cells.length - 1;
  const headDist = bodyLength + s.slitherProgress;
  const tailDist = s.slitherProgress;

  const subPath = samplePolylineSegment(s.extendedPath, tailDist, headDist);
  if (subPath.length < 2) return null;

  const headPt = subPath[subPath.length - 1];
  let prevPt = subPath[subPath.length - 2];
  let dir = { x: headPt.x - prevPt.x, y: headPt.y - prevPt.y };
  let mag = Math.hypot(dir.x, dir.y);

  let idx = subPath.length - 3;
  while (mag < 0.0001 && idx >= 0) {
    prevPt = subPath[idx];
    dir = { x: headPt.x - prevPt.x, y: headPt.y - prevPt.y };
    mag = Math.hypot(dir.x, dir.y);
    idx--;
  }

  if (mag < 0.0001) {
    dir = { x: s.headDir.x, y: s.headDir.y };
    mag = Math.hypot(dir.x, dir.y) || 1;
  }

  dir.x /= mag;
  dir.y /= mag;

  const hx = (headPt.x + 0.5) * cellSize;
  const hy = (headPt.y + 0.5) * cellSize;

  return (
    <G key={`slither-${s.id}`}>
      {subPath.map((pt, i) => {
        if (i === 0) return null;
        const prev = subPath[i - 1];
        return (
          <Line
            key={`subseg-${s.id}-${i}`}
            x1={(prev.x + 0.5) * cellSize}
            y1={(prev.y + 0.5) * cellSize}
            x2={(pt.x + 0.5) * cellSize}
            y2={(pt.y + 0.5) * cellSize}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {renderArrowHead(hx, hy, dir, cellSize * 0.42, color)}
    </G>
  );
}

function renderArrowHead(x: number, y: number, dir: Point, size: number, color: string) {
  const angle = Math.atan2(dir.y, dir.x);
  const p1 = { x: size * 1.15, y: 0 };
  const p2 = { x: -size * 0.7, y: -size * 0.8 };
  const p3 = { x: -size * 0.2, y: 0 };
  const p4 = { x: -size * 0.7, y: size * 0.8 };

  const rotate = (p: Point) => ({
    x: x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
    y: y + p.x * Math.sin(angle) + p.y * Math.cos(angle),
  });

  const r1 = rotate(p1);
  const r2 = rotate(p2);
  const r3 = rotate(p3);
  const r4 = rotate(p4);

  return (
    <Polygon
      points={`${r1.x},${r1.y} ${r2.x},${r2.y} ${r3.x},${r3.y} ${r4.x},${r4.y}`}
      fill={color}
    />
  );
}

function samplePolylineSegment(path: Point[], startDist: number, endDist: number): Point[] {
  let pts: Point[] = [];
  let currentDist = 0;

  for (let i = 0; i < path.length - 1; i++) {
    let p1 = path[i];
    let p2 = path[i + 1];
    let segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    let nextDist = currentDist + segLen;

    if (nextDist >= startDist && currentDist <= endDist) {
      if (currentDist < startDist) {
        let t = (startDist - currentDist) / segLen;
        pts.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
      } else if (pts.length === 0) {
        pts.push({ x: p1.x, y: p1.y });
      }

      if (nextDist > endDist) {
        let t = (endDist - currentDist) / segLen;
        pts.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
        break;
      } else {
        pts.push({ x: p2.x, y: p2.y });
      }
    }
    currentDist = nextDist;
  }
  return pts;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// --- GUARANTEED PARTITION GENERATOR ---
function carveContiguousSnake(
  startX: number,
  startY: number,
  visited: boolean[][],
  targetLen: number,
  cols: number,
  rows: number,
  rng: () => number
): Point[] {
  let path: Point[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  let curr = { x: startX, y: startY };

  let currentDir = DIRS[Math.floor(rng() * DIRS.length)];
  let straightSteps = Math.floor(rng() * 4) + 2;

  while (path.length < targetLen) {
    if (straightSteps <= 0 || !canStep(curr, currentDir, visited, cols, rows)) {
      let turnOptions = DIRS.filter(
        (d) =>
          (d.x !== -currentDir.x || d.y !== -currentDir.y) &&
          canStep(curr, d, visited, cols, rows)
      );
      if (turnOptions.length === 0) break;
      currentDir = turnOptions[Math.floor(rng() * turnOptions.length)];
      straightSteps = Math.floor(rng() * 4) + 2;
    }

    let nextPt = { x: curr.x + currentDir.x, y: curr.y + currentDir.y };
    visited[nextPt.y][nextPt.x] = true;
    path.push(nextPt);
    curr = nextPt;
    straightSteps--;
  }
  return path;
}

function canStep(pt: Point, dir: Point, visited: boolean[][], cols: number, rows: number) {
  let nx = pt.x + dir.x;
  let ny = pt.y + dir.y;
  if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
  return !visited[ny][nx];
}

function absorbOrphansStrict(snakes: SnakeItem[], gridMap: number[][], activeIds: Set<number>) {
  for (let i = snakes.length - 1; i >= 0; i--) {
    let s = snakes[i];
    if (s.cells.length === 1) {
      let pt = s.cells[0];
      let absorbed = false;
      for (let target of snakes) {
        if (target.id === s.id) continue;
        let head = target.cells[target.cells.length - 1];
        let tail = target.cells[0];

        if (Math.abs(pt.x - head.x) + Math.abs(pt.y - head.y) === 1) {
          target.cells.push(pt);
          gridMap[pt.y][pt.x] = target.id;
          absorbed = true;
          break;
        }
        if (Math.abs(pt.x - tail.x) + Math.abs(pt.y - tail.y) === 1) {
          target.cells.unshift(pt);
          gridMap[pt.y][pt.x] = target.id;
          absorbed = true;
          break;
        }
      }

      if (!absorbed) {
        for (let target of snakes) {
          if (target.id === s.id) continue;
          for (let k = 0; k < target.cells.length; k++) {
            let cell = target.cells[k];
            if (Math.abs(pt.x - cell.x) + Math.abs(pt.y - cell.y) === 1) {
              target.cells.splice(k + 1, 0, pt);
              gridMap[pt.y][pt.x] = target.id;
              absorbed = true;
              break;
            }
          }
          if (absorbed) break;
        }
      }

      if (absorbed) {
        snakes.splice(i, 1);
        activeIds.delete(s.id);
      }
    }
  }
}

function orientSnakesWithDAG(snakes: SnakeItem[], gridMap: number[][], cols: number, rows: number) {
  let tempGrid = gridMap.map((r) => [...r]);
  let unassigned = new Set(snakes);

  while (unassigned.size > 0) {
    let foundClear = false;
    for (let s of unassigned) {
      if (s.cells.length < 2) continue;

      let dirA = getEndpointDir(s.cells, s.cells.length - 1, s.cells.length - 2);
      if (isRayClear(s.cells[s.cells.length - 1], dirA, s.id, tempGrid, cols, rows)) {
        s.headDir = dirA;
        s.cells.forEach((pt) => {
          tempGrid[pt.y][pt.x] = -1;
        });
        unassigned.delete(s);
        foundClear = true;
        break;
      }

      let dirB = getEndpointDir(s.cells, 0, 1);
      if (isRayClear(s.cells[0], dirB, s.id, tempGrid, cols, rows)) {
        s.cells.reverse();
        s.headDir = dirB;
        s.cells.forEach((pt) => {
          tempGrid[pt.y][pt.x] = -1;
        });
        unassigned.delete(s);
        foundClear = true;
        break;
      }
    }
    if (!foundClear) return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      gridMap[r][c] = -1;
    }
  }
  for (let s of snakes) {
    s.cells.forEach((pt) => {
      gridMap[pt.y][pt.x] = s.id;
    });
  }
  return true;
}

function getEndpointDir(cells: Point[], tipIdx: number, prevIdx: number): Point {
  if (cells.length >= 2) {
    return {
      x: cells[tipIdx].x - cells[prevIdx].x,
      y: cells[tipIdx].y - cells[prevIdx].y,
    };
  }
  return { x: 0, y: -1 };
}

function isRayClear(
  head: Point,
  dir: Point,
  snakeId: number,
  grid: number[][],
  cols: number,
  rows: number
): boolean {
  let cx = head.x + dir.x;
  let cy = head.y + dir.y;
  while (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
    let occ = grid[cy][cx];
    if (occ !== -1 && occ !== snakeId) return false;
    cx += dir.x;
    cy += dir.y;
  }
  return true;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  redFlashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(239, 68, 68, 0.28)",
    zIndex: 999,
  },
  fullScreenBoard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    ...(Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } : {}),
  },
  svgContainer: {
    flex: 1,
  },
  floatingTopBar: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  floatingRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floatingLevelBadge: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  levelTitleText: {
    fontSize: 15,
    fontWeight: "800",
  },
  floatingStatusWrapper: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  movesTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  movesText: {
    fontSize: 13,
    fontWeight: "800",
  },
  heartsRow: {
    flexDirection: "row",
    gap: 4,
  },
  modeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  floatingBottomControls: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    zIndex: 20,
  },
  circleActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  hintBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#3B82F6",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  hintBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  confettiCenterAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 1,
    height: 1,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  streakOverlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  streakCenterBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  streakFireCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FF7A00",
    shadowColor: "#FF7A00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  streakGiantNumber: {
    fontSize: 54,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 18,
    letterSpacing: 1,
  },
  streakLabelText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF9800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "86%",
    borderRadius: 26,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF9C3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
  },
  modalSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  levelTransitionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 24,
    width: "100%",
  },
  levelStepBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  levelStepText: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});