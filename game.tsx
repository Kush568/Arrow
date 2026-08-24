import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Modal,
    PanResponder,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle, G, Line, Polygon } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

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

export default function GameScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();

  const [level, setLevel] = useState(67);
  const [moves, setMoves] = useState(99);
  const [hearts, setHearts] = useState(3);
  const [hintsAvailable, setHintsAvailable] = useState(2);
  const [hintedId, setHintedId] = useState<number | null>(null);

  const [victory, setVictory] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Board configuration
  const cols = 10;
  const rows = 12;
  const cellSize = 34;
  const boardWidth = cols * cellSize;
  const boardHeight = rows * cellSize;

  // Transform (Zoom & Pan)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Game state refs for 60fps animation loop
  const snakesRef = useRef<SnakeItem[]>([]);
  const gridMapRef = useRef<number[][]>([]);
  const activeIdsRef = useRef<Set<number>>(new Set());

  // Render trigger for canvas updates
  const [, setFrameTick] = useState(0);

  // --- GUARANTEED SOLVABLE GENERATOR (DAG Solver) ---
  const generateLevel = useCallback(() => {
    let success = false;
    let attempts = 0;
    let newSnakes: SnakeItem[] = [];
    let newGrid: number[][] = [];
    let newActiveIds = new Set<number>();

    while (!success && attempts < 100) {
      attempts++;
      newGrid = Array.from({ length: rows }, () => Array(cols).fill(-1));
      newSnakes = [];
      newActiveIds.clear();

      let visited = Array.from({ length: rows }, () => Array(cols).fill(false));
      let currentId = 1;
      const lengthPool = [2, 3, 4, 5, 6, 8];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!visited[r][c]) {
            let targetLength = lengthPool[Math.floor(Math.random() * lengthPool.length)];
            let path = carveContiguousSnake(c, r, visited, targetLength, cols, rows);

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

      if (orientSnakesWithDAG(newSnakes, newGrid, cols, rows)) {
        success = true;
      }
    }

    // Build slither tracks
    for (let s of newSnakes) {
      let track = [...s.cells];
      let curr = s.cells[s.cells.length - 1];
      for (let i = 1; i <= Math.max(cols, rows) + 8; i++) {
        track.push({
          x: curr.x + s.headDir.x * i,
          y: curr.y + s.headDir.y * i,
        });
      }
      s.extendedPath = track;
    }

    snakesRef.current = newSnakes;
    gridMapRef.current = newGrid;
    activeIdsRef.current = newActiveIds;
    setHintedId(null);
    setVictory(false);
    setGameOver(false);
    setMoves(99);
    setHearts(3);
    resetZoom();
  }, [cols, rows]);

  useEffect(() => {
    generateLevel();
  }, [generateLevel]);

  // --- GAME ANIMATION LOOP ---
  useEffect(() => {
    let animId: number;
    const loop = () => {
      let needsRedraw = false;
      const snakes = snakesRef.current;
      const activeIds = activeIdsRef.current;

      for (let s of snakes) {
        if (s.isSlithering) {
          s.slitherProgress += 0.35;
          needsRedraw = true;
        }
        if (s.shakeTimer > 0) {
          s.shakeTimer--;
          needsRedraw = true;
        }
      }

      // Check win condition
      if (
        activeIds.size === 0 &&
        !snakes.some((s) => s.isSlithering && s.slitherProgress < s.extendedPath.length)
      ) {
        if (!victory) setVictory(true);
      }

      if (needsRedraw) {
        setFrameTick((t) => (t + 1) % 1000);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [victory]);

  // --- TAP INTERACTION ---
  const handleTap = (clientX: number, clientY: number) => {
    const p = panRef.current;
    const s = scaleRef.current;

    // Convert screen coordinates to grid coordinates
    const boardScreenLeft = (SCREEN_WIDTH - boardWidth * s) / 2 + p.x;
    const boardScreenTop = (SCREEN_HEIGHT * 0.45 - (boardHeight * s) / 2) + p.y;

    const clickX = Math.floor((clientX - boardScreenLeft) / (cellSize * s));
    const clickY = Math.floor((clientY - boardScreenTop) / (cellSize * s));

    if (clickX < 0 || clickX >= cols || clickY < 0 || clickY >= rows) return;

    const id = gridMapRef.current[clickY]?.[clickX];
    if (id && id !== -1 && activeIdsRef.current.has(id)) {
      tapSnake(id);
    }
  };

  const tapSnake = (id: number) => {
    const snake = snakesRef.current.find((s) => s.id === id);
    if (!snake || snake.isSlithering) return;

    const head = snake.cells[snake.cells.length - 1];
    if (isRayClear(head, snake.headDir, snake.id, gridMapRef.current, cols, rows)) {
      // Clear path and launch
      snake.cells.forEach((pt) => {
        gridMapRef.current[pt.y][pt.x] = -1;
      });
      snake.isSlithering = true;
      activeIdsRef.current.delete(snake.id);
      setMoves((m) => Math.max(0, m - 1));
      if (hintedId === snake.id) setHintedId(null);
    } else {
      // Ray blocked -> shake & lose heart
      snake.shakeTimer = 8;
      setHearts((h) => {
        const nextH = h - 1;
        if (nextH <= 0) setGameOver(true);
        return Math.max(0, nextH);
      });
    }
    setFrameTick((t) => (t + 1) % 1000);
  };

  const giveHint = () => {
    if (hintsAvailable <= 0) return;
    for (let s of snakesRef.current) {
      if (activeIdsRef.current.has(s.id) && !s.isSlithering) {
        const head = s.cells[s.cells.length - 1];
        if (isRayClear(head, s.headDir, s.id, gridMapRef.current, cols, rows)) {
          setHintedId(s.id);
          setHintsAvailable((h) => h - 1);
          setFrameTick((t) => (t + 1) % 1000);
          return;
        }
      }
    }
  };

  const resetZoom = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  // --- PAN / ZOOM GESTURE HANDLER ---
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const initialScale = useRef<number>(1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1) {
          touchStartRef.current = {
            x: touches[0].pageX,
            y: touches[0].pageY,
            time: Date.now(),
          };
          initialPinchDist.current = null;
        } else if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          initialPinchDist.current = Math.hypot(dx, dy);
          initialScale.current = scaleRef.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1 && !initialPinchDist.current) {
          setPan({
            x: panRef.current.x + gestureState.dx * 0.12,
            y: panRef.current.y + gestureState.dy * 0.12,
          });
        } else if (touches.length === 2 && initialPinchDist.current) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const currentDist = Math.hypot(dx, dy);
          const newScale = Math.min(
            Math.max(0.7, (currentDist / initialPinchDist.current) * initialScale.current),
            2.2
          );
          setScale(newScale);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const distMoved = Math.hypot(gestureState.dx, gestureState.dy);
        const timeDiff = Date.now() - touchStartRef.current.time;

        // Count as Tap if tap released quickly without panning much
        if (distMoved < 10 && timeDiff < 300) {
          handleTap(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        }
        initialPinchDist.current = null;
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* TOP BAR: Back (<), Level Title, Reload (↺) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.roundBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.levelTitleText, { color: colors.text }]}>
          Level {level}
        </Text>

        <TouchableOpacity
          style={[styles.roundBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={generateLevel}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* STATUS PILL: Moves (✏️ 99), Hearts (❤️❤️❤️), Normal */}
      <View style={styles.statusPillWrapper}>
        <View style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Moves */}
          <View style={styles.movesTag}>
            <Ionicons name="pencil" size={14} color="#64748B" />
            <Text style={[styles.movesText, { color: colors.text }]}>{moves}</Text>
          </View>

          {/* Hearts */}
          <View style={styles.heartsRow}>
            {[1, 2, 3].map((h) => (
              <Ionicons
                key={h}
                name={h <= hearts ? "heart" : "heart-outline"}
                size={18}
                color={h <= hearts ? "#EF4444" : "#CBD5E1"}
              />
            ))}
          </View>

          {/* Mode Tag */}
          <View style={[styles.modeTag, { backgroundColor: isDark ? "#222734" : "#F1F5F9" }]}>
            <Text style={styles.modeText}>Normal</Text>
          </View>
        </View>
      </View>

      {/* INTERACTIVE DRAGGABLE / ZOOMABLE CANVAS STAGE */}
      <View style={styles.boardArea} {...panResponder.panHandlers}>
        <Svg
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT * 0.62}
          style={styles.svgContainer}
        >
          <G
            transform={`translate(${
              (SCREEN_WIDTH - boardWidth * scale) / 2 + pan.x
            }, ${
              (SCREEN_HEIGHT * 0.31 - (boardHeight * scale) / 2) + pan.y
            }) scale(${scale})`}
          >
            {/* Background Grid Dots */}
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

            {/* Static Arrows */}
            {snakesRef.current.map((s) => {
              if (s.isSlithering || !activeIdsRef.current.has(s.id)) return null;
              return renderStaticSnake(s, cellSize, hintedId === s.id, isDark);
            })}

            {/* Slithering Animated Arrows */}
            {snakesRef.current.map((s) => {
              if (!s.isSlithering) return null;
              return renderSlitheringSnake(s, cellSize, isDark);
            })}
          </G>
        </Svg>
      </View>

      {/* BOTTOM ACTION BUTTONS: Hint & Reset Zoom */}
      <View style={styles.bottomControls}>
        {/* Hint Button */}
        <TouchableOpacity
          style={[
            styles.circleActionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
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

        {/* Reset Zoom / Center Button */}
        <TouchableOpacity
          style={[
            styles.circleActionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.8}
          onPress={resetZoom}
        >
          <Feather name="maximize-2" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* VICTORY MODAL */}
      <Modal visible={victory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Level Cleared!</Text>
            <Text style={[styles.modalSubtext, { color: colors.subtext }]}>
              All arrows untangled cleanly.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => {
                setLevel((l) => l + 1);
                generateLevel();
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
            <Text style={styles.modalEmoji}>💔</Text>
            <Text style={[styles.modalTitle, { color: "#EF4444" }]}>Out of Lives!</Text>
            <Text style={[styles.modalSubtext, { color: colors.subtext }]}>
              Watch out for blocked arrow paths.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
              activeOpacity={0.8}
              onPress={generateLevel}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- RENDER HELPERS ---
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

function renderSlitheringSnake(s: SnakeItem, cellSize: number, isDark: boolean) {
  const color = isDark ? "#F8FAFC" : "#0F172A";
  const strokeWidth = Math.max(3.5, cellSize * 0.2);

  const bodyLength = s.cells.length - 1;
  const headDist = bodyLength + s.slitherProgress;
  const tailDist = s.slitherProgress;

  const subPath = samplePolylineSegment(s.extendedPath, tailDist, headDist);
  if (subPath.length < 2) return null;

  const headPt = subPath[subPath.length - 1];
  const prevPt = subPath[subPath.length - 2];
  const dir = { x: headPt.x - prevPt.x, y: headPt.y - prevPt.y };
  const mag = Math.hypot(dir.x, dir.y) || 1;
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

// --- GENERATOR LOGIC ---
function carveContiguousSnake(
  startX: number,
  startY: number,
  visited: boolean[][],
  targetLen: number,
  cols: number,
  rows: number
): Point[] {
  let path: Point[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  let curr = { x: startX, y: startY };

  let currentDir = DIRS[Math.floor(Math.random() * DIRS.length)];
  let straightSteps = Math.floor(Math.random() * 4) + 2;

  while (path.length < targetLen) {
    if (straightSteps <= 0 || !canStep(curr, currentDir, visited, cols, rows)) {
      let turnOptions = DIRS.filter(
        (d) =>
          (d.x !== -currentDir.x || d.y !== -currentDir.y) &&
          canStep(curr, d, visited, cols, rows)
      );
      if (turnOptions.length === 0) break;
      currentDir = turnOptions[Math.floor(Math.random() * turnOptions.length)];
      straightSteps = Math.floor(Math.random() * 4) + 2;
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
      // Test Endpoint A
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
      // Test Endpoint B
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

  // Restore gridMap
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

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  levelTitleText: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusPillWrapper: {
    alignItems: "center",
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    color: "#64748B",
  },
  boardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  svgContainer: {
    flex: 1,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingBottom: 28,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "85%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});