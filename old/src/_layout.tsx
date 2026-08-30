import { Stack } from "expo-router";
import { GameProvider } from "../context/GameContext";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
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