import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type PlayHistory = {
  [dateKey: string]: number; // e.g. "2026-08-25": 4
};

type GameContextType = {
  level: number;
  currentStreak: number;
  bestStreak: number;
  playHistory: PlayHistory;
  completeLevel: () => Promise<void>;
  getGamesForDate: (dateKey: string) => number;
};

const GameContext = createContext<GameContextType>({
  level: 1,
  currentStreak: 0,
  bestStreak: 0,
  playHistory: {},
  completeLevel: async () => {},
  getGamesForDate: () => 0,
});

const STORAGE_KEYS = {
  LEVEL: "@game_level",
  HISTORY: "@game_history",
  BEST_STREAK: "@game_best_streak",
};

// Accurate streak calculation based on consecutive active days
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
    // Check if played yesterday (streak is preserved for today)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);
    if ((history[yesterdayKey] || 0) > 0) {
      streak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      return 0; // Streak broken
    }
  }

  // Count backwards day by day
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
  const [playHistory, setPlayHistory] = useState<PlayHistory>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Load persistent data on start
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedLevel, savedHistory, savedBest] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LEVEL),
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.BEST_STREAK),
        ]);

        const parsedLevel = savedLevel ? parseInt(savedLevel, 10) : 1;
        const parsedHistory: PlayHistory = savedHistory ? JSON.parse(savedHistory) : {};
        const parsedBest = savedBest ? parseInt(savedBest, 10) : 0;

        setLevel(parsedLevel);
        setPlayHistory(parsedHistory);

        const calculatedStreak = calculateStreak(parsedHistory);
        setCurrentStreak(calculatedStreak);
        setBestStreak(Math.max(parsedBest, calculatedStreak));
      } catch (err) {
        console.error("Failed to load game data", err);
      }
    };

    loadData();
  }, []);

  // Called whenever the player wins a level in game.tsx
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

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LEVEL, nextLevel.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.BEST_STREAK, newBest.toString()),
      ]);
    } catch (err) {
      console.error("Failed to save completed level", err);
    }
  };

  const getGamesForDate = (dateKey: string) => {
    return playHistory[dateKey] || 0;
  };

  return (
    <GameContext.Provider
      value={{
        level,
        currentStreak,
        bestStreak,
        playHistory,
        completeLevel,
        getGamesForDate,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);