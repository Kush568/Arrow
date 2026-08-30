import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useGame } from "../context/GameContext";
import { useTheme } from "../context/ThemeContext";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { level, currentStreak, levelProgress } = useGame();
  const [activeTab, setActiveTab] = useState<"home" | "streak" | "profile">("home");

  // Calculate accurate level completion percentage
  const progressPercent =
    levelProgress && levelProgress.level === level && levelProgress.totalArrows > 0
      ? Math.min(
          100,
          Math.round((levelProgress.clearedSnakeIds.length / levelProgress.totalArrows) * 100)
        )
      : 0;

  const handleDailyChallenge = () => {
    console.log("Daily Challenge pressed");
  };

  const handleQuickMatch = () => {
    console.log("Quick Match pressed");
  };

  const handleLeaderboard = () => {
    router.push("/leaderboard");
  };

  const handlePlay = () => {
    router.push("/game");
  };

  const openStreak = () => {
    router.push("/streak");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Top Header: Centered Streak & Leaderboard Badges */}
        <View style={styles.header}>
          {/* Streak Badge (Tappable) */}
          <TouchableOpacity
            style={[styles.topBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={openStreak}
          >
            <Ionicons name="flame" size={22} color="#FF7A00" />
            <Text style={[styles.badgeText, { color: colors.text }]}>{currentStreak}</Text>
          </TouchableOpacity>

          {/* Leaderboard Badge */}
          <TouchableOpacity
            style={[styles.topBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={handleLeaderboard}
          >
            <Ionicons name="trophy" size={20} color="#EAB308" />
            <Text style={[styles.badgeText, { color: colors.text }]}>#1</Text>
          </TouchableOpacity>
        </View>

        {/* Top Action Cards: Daily Challenge & Quick Match */}
        <View style={styles.cardsRow}>
          {/* Daily Challenge Card */}
          <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={0.7}
            onPress={handleDailyChallenge}
          >
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialCommunityIcons
                name="calendar-star"
                size={36}
                color={colors.subtext}
              />
            </View>
            <Text style={[styles.cardLabel, { color: colors.subtext }]}>Daily Challenge</Text>
          </TouchableOpacity>

          {/* Quick Match Card */}
          <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={0.7}
            onPress={handleQuickMatch}
          >
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="flash-outline" size={34} color={colors.subtext} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.subtext }]}>Quick Match</Text>
          </TouchableOpacity>
        </View>

        {/* Center / Bottom Play Section */}
        <View style={styles.playSection}>
          <Text style={[styles.levelText, { color: colors.subtext }]}>LEVEL {level}</Text>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.playBtn }]}
            activeOpacity={0.8}
            onPress={handlePlay}
          >
            <Text style={[styles.playButtonText, { color: colors.playBtnText }]}>Play</Text>
          </TouchableOpacity>

          {/* In-Level Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeaderRow}>
              <Text style={[styles.progressLabel, { color: colors.subtext }]}>Completed</Text>
              <Text style={[styles.progressPercentText, { color: colors.text }]}>
                {progressPercent}%
              </Text>
            </View>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: isDark ? "#1E2433" : "#E2E8F0" },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: progressPercent === 100 ? "#10B981" : "#3B82F6",
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.bottomNavWrapper}>
        <View style={[styles.floatingNavBar, { backgroundColor: colors.navBg, borderColor: colors.border }]}>
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab("home")}
          >
            <Ionicons
              name={activeTab === "home" ? "home" : "home-outline"}
              size={24}
              color={activeTab === "home" ? colors.text : "#94A3B8"}
            />
          </TouchableOpacity>

          {/* Streak Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={openStreak}
          >
            <Ionicons
              name="flame-outline"
              size={26}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push("/profile")}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    marginBottom: 28,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  cardWrapper: {
    flex: 1,
    alignItems: "center",
  },
  card: {
    width: "100%",
    height: 105,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  playSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 80,
  },
  levelText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  playButton: {
    width: "72%",
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  playButtonText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: "72%",
    marginTop: 18,
    gap: 6,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: "900",
  },
  progressBarTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  bottomNavWrapper: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  floatingNavBar: {
    flexDirection: "row",
    width: "65%",
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  navItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});