import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Updates from "expo-updates";
import { useFonts } from "expo-font";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { ThemeProvider } from "../context/ThemeContext";
import { GameProvider } from "../context/GameContext";

// Bulletproof font injector for Cloudflare Pages / Web
function injectWebFontFaces() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const fontStyleId = "expo-vector-icons-web-fonts";
  if (document.getElementById(fontStyleId)) return;

  const fontStyles = `
    @font-face {
      font-family: 'ionicons';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Ionicons';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'material-community';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Material Design Icons';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'feather';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Feather';
      src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype'),
           url('https://unpkg.com/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype');
    }
  `;

  const style = document.createElement("style");
  style.id = fontStyleId;
  style.appendChild(document.createTextNode(fontStyles));
  document.head.appendChild(style);
}

export default function RootLayout() {
  injectWebFontFaces();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...Feather.font,
  });

  useEffect(() => {
    // Only lock orientation on native mobile devices (prevents web SecurityError)
    if (Platform.OS !== "web") {
      try {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch {}
    }

    async function checkForAppUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (err) {
        console.log("Update check:", err);
      }
    }

    checkForAppUpdates();
  }, []);

  if (!fontsLoaded && Platform.OS !== "web") {
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