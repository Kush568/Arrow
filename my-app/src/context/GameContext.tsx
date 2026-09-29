import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type PlayHistory = {
  [dateKey: string]: number;
};

export type LevelProgress = {
  level: number;
  totalArrows: number;
  clearedSnakeIds: number[];
  hearts: number;
  hints: number;
};

type GameContextType = {
  level: number;
  userSeed: number;
  currentStreak: number;
  bestStreak: number;
  playHistory: PlayHistory;
  levelProgress: LevelProgress | null;
  saveLevelProgress: (
    level: number,
    totalArrows: number,
    clearedSnakeIds: number[],
    hearts: number,
    hints: number
  ) => void;
  clearLevelProgress: () => Promise<void>;
  completeLevel: () => Promise<void>;
  getGamesForDate: (dateKey: string) => number;
  resetAllData: () => Promise<void>;
};

const GameContext = createContext<GameContextType>({
  level: 1,
  userSeed: 123456,
  currentStreak: 0,
  bestStreak: 0,
  playHistory: {},
  levelProgress: null,
  saveLevelProgress: () => {},
  clearLevelProgress: async () => {},
  completeLevel: async () => {},
  getGamesForDate: () => 0,
  resetAllData: async () => {},
});

const STORAGE_KEYS = {
  LEVEL: "@game_level",
  HISTORY: "@game_history",
  BEST_STREAK: "@game_best_streak",
  USER_SEED: "@game_user_seed",
  LEVEL_PROGRESS: "@game_level_progress",
};

const calculateStreak = (history: PlayHistory): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = formatDateKey(today);
  const playedToday = (history[todayKey] || 0) > 0;

  let checkDate = new Date(today);
  let streak = 0;

  if (playedToday) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);
    if ((history[yesterdayKey] || 0) > 0) {
      streak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      return 0;
    }
  }

  while (true) {
    const key = formatDateKey(checkDate);
    if ((history[key] || 0) > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevel] = useState(1);
  const [userSeed, setUserSeed] = useState(123456);
  const [playHistory, setPlayHistory] = useState<PlayHistory>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedLevel, savedHistory, savedBest, savedUserSeed, savedProgress] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.LEVEL),
            AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
            AsyncStorage.getItem(STORAGE_KEYS.BEST_STREAK),
            AsyncStorage.getItem(STORAGE_KEYS.USER_SEED),
            AsyncStorage.getItem(STORAGE_KEYS.LEVEL_PROGRESS),
          ]);

        let seed = savedUserSeed ? parseInt(savedUserSeed, 10) : 0;
        if (!seed) {
          seed = Math.floor(Math.random() * 2147483647) + 1;
          await AsyncStorage.setItem(STORAGE_KEYS.USER_SEED, seed.toString());
        }

        const parsedLevel = savedLevel ? parseInt(savedLevel, 10) : 1;
        const parsedHistory: PlayHistory = savedHistory ? JSON.parse(savedHistory) : {};
        const parsedBest = savedBest ? parseInt(savedBest, 10) : 0;

        setUserSeed(seed);
        setLevel(parsedLevel);
        setPlayHistory(parsedHistory);

        const calculatedStreak = calculateStreak(parsedHistory);
        setCurrentStreak(calculatedStreak);
        setBestStreak(Math.max(parsedBest, calculatedStreak));

        if (savedProgress) {
          try {
            const parsed: LevelProgress = JSON.parse(savedProgress);
            if (parsed && parsed.level === parsedLevel) {
              setLevelProgress(parsed);
            }
          } catch {}
        }
      } catch (err) {
        console.error("Load game data error", err);
      }
    };

    loadData();
  }, []);

  // Save progress instantly including remaining hearts & hints
  const saveLevelProgress = (
    lvl: number,
    total: number,
    clearedIds: number[],
    currentHearts: number,
    currentHints: number
  ) => {
    const progress: LevelProgress = {
      level: lvl,
      totalArrows: total,
      clearedSnakeIds: clearedIds,
      hearts: currentHearts,
      hints: currentHints,
    };
    setLevelProgress(progress);
    AsyncStorage.setItem(STORAGE_KEYS.LEVEL_PROGRESS, JSON.stringify(progress)).catch(() => {});
  };

  const clearLevelProgress = async () => {
    setLevelProgress(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LEVEL_PROGRESS);
    } catch {}
  };

  const completeLevel = async () => {
    try {
      const todayKey = formatDateKey(new Date());
      const updatedHistory = {
        ...playHistory,
        [todayKey]: (playHistory[todayKey] || 0) + 1,
      };

      const nextLevel = level + 1;
      const newStreak = calculateStreak(updatedHistory);
      const newBest = Math.max(bestStreak, newStreak);

      setLevel(nextLevel);
      setPlayHistory(updatedHistory);
      setCurrentStreak(newStreak);
      setBestStreak(newBest);
      setLevelProgress(null);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LEVEL, nextLevel.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.BEST_STREAK, newBest.toString()),
        AsyncStorage.removeItem(STORAGE_KEYS.LEVEL_PROGRESS),
      ]);
    } catch (err) {
      console.error("Complete level error", err);
    }
  };

  const getGamesForDate = (dateKey: string) => {
    return playHistory[dateKey] || 0;
  };

  const resetAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.LEVEL,
        STORAGE_KEYS.HISTORY,
        STORAGE_KEYS.BEST_STREAK,
        STORAGE_KEYS.LEVEL_PROGRESS,
      ]);
      setLevel(1);
      setPlayHistory({});
      setCurrentStreak(0);
      setBestStreak(0);
      setLevelProgress(null);
    } catch (err) {
      console.error("Reset data error", err);
    }
  };

  return (
    <GameContext.Provider
      value={{
        level,
        userSeed,
        currentStreak,
        bestStreak,
        playHistory,
        levelProgress,
        saveLevelProgress,
        clearLevelProgress,
        completeLevel,
        getGamesForDate,
        resetAllData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);