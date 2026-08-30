import { useEffect } from "react";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { ThemeProvider } from "../context/ThemeContext";
import { GameProvider } from "../context/GameContext";

export default function RootLayout() {
  useEffect(() => {
    // Lock screen orientation to Portrait
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  return (
    <ThemeProvider>
      <GameProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </GameProvider>
    </ThemeProvider>
  );
}