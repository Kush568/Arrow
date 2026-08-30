import { useEffect } from "react";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Updates from "expo-updates";
import { ThemeProvider } from "../context/ThemeContext";
import { GameProvider } from "../context/GameContext";

export default function RootLayout() {
  useEffect(() => {
    // Lock screen orientation to Portrait
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // Check for updates on startup (runs only on installed APKs, not in development)
    async function checkForAppUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // Instantly apply new code
        }
      } catch (err) {
        console.log("Update check error:", err);
      }
    }

    checkForAppUpdates();
  }, []);

  return (
    <ThemeProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GameProvider>
    </ThemeProvider>
  );
}