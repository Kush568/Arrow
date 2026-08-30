import { useEffect } from "react";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Updates from "expo-updates";
import { useFonts } from "expo-font";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { ThemeProvider } from "../context/ThemeContext";
import { GameProvider } from "../context/GameContext";

export default function RootLayout() {
  // Load icon font families for web browsers
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...Feather.font,
  });

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GameProvider>
    </ThemeProvider>
  );
}