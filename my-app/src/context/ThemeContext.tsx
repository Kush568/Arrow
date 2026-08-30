import React, { createContext, useContext, useState } from "react";

import { StatusBarStyle } from "react-native";

export type ThemeColors = {
  isDark: boolean;
  bg: string;
  card: string;
  border: string;
  text: string;
  subtext: string;
  icon: string;
  navBg: string;
  playBtn: string;
  playBtnText: string;
  statusBarStyle: StatusBarStyle;
};

export const lightTheme: ThemeColors = {
  isDark: false,
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  subtext: "#64748B",
  icon: "#64748B",
  navBg: "#FFFFFF",
  playBtn: "#0F172A",
  playBtnText: "#FFFFFF",
  statusBarStyle: "dark-content",
};

export const darkTheme: ThemeColors = {
  isDark: true,
  bg: "#111318",
  card: "#1A1D26",
  border: "#282C3A",
  text: "#FFFFFF",
  subtext: "#9EABC0",
  icon: "#9EABC0",
  navBg: "#1A1D26",
  playBtn: "#F3F4F6",
  playBtnText: "#111318",
  statusBarStyle: "light-content",
};

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightTheme,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);