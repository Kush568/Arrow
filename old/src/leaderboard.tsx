import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

type LeaderboardTab = "weekly" | "allTime";

const TOP_PLAYERS = [
  { rank: 1, name: "You (Player #1337)", level: 67, streak: 7, isUser: true },
  { rank: 2, name: "CyberNinja", level: 65, streak: 12, isUser: false },
  { rank: 3, name: "PixelMaster", level: 61, streak: 9, isUser: false },
  { rank: 4, name: "ShadowRaven", level: 58, streak: 5, isUser: false },
  { rank: 5, name: "AuraHunter", level: 54, streak: 8, isUser: false },
  { rank: 6, name: "Vortex007", level: 51, streak: 4, isUser: false },
  { rank: 7, name: "BlazeRunner", level: 49, streak: 6, isUser: false },
  { rank: 8, name: "ZenithPulse", level: 47, streak: 3, isUser: false },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("weekly");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Leaderboard
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Toggle (Weekly vs All Time) */}
        <View
          style={[
            styles.tabSelector,
            {
              backgroundColor: isDark ? "#1A1D26" : "#EDF2F7",
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "weekly" && {
                backgroundColor: colors.card,
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.3 : 0.06,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => setActiveTab("weekly")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === "weekly" ? colors.text : colors.subtext },
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "allTime" && {
                backgroundColor: colors.card,
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.3 : 0.06,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => setActiveTab("allTime")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === "allTime" ? colors.text : colors.subtext },
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top 3 Podium Cards */}
        <View style={styles.podiumContainer}>
          {/* #2 Silver */}
          <View style={styles.podiumColumn}>
            <View style={[styles.podiumAvatar, { backgroundColor: isDark ? "#222734" : "#E2E8F0" }]}>
              <Text style={styles.avatarRankText}>2</Text>
            </View>
            <Text
              style={[styles.podiumName, { color: colors.text }]}
              numberOfLines={1}
            >
              CyberNinja
            </Text>
            <Text style={[styles.podiumScore, { color: colors.subtext }]}>
              Lvl 65
            </Text>
            <View style={[styles.podiumBar, styles.podiumBar2, { backgroundColor: isDark ? "#1E2433" : "#E2E8F0" }]}>
              <Ionicons name="medal" size={20} color="#94A3B8" />
            </View>
          </View>

          {/* #1 Gold (Center) */}
          <View style={styles.podiumColumn}>
            <MaterialCommunityIcons name="crown" size={24} color="#EAB308" style={styles.crownIcon} />
            <View
              style={[
                styles.podiumAvatar,
                styles.firstPlaceAvatar,
                { backgroundColor: "#FEF08A" },
              ]}
            >
              <Text style={[styles.avatarRankText, { color: "#854D0E" }]}>1</Text>
            </View>
            <Text
              style={[styles.podiumName, { color: colors.text, fontWeight: "800" }]}
              numberOfLines={1}
            >
              You
            </Text>
            <Text style={[styles.podiumScore, { color: "#EAB308", fontWeight: "700" }]}>
              Lvl 67
            </Text>
            <View style={[styles.podiumBar, styles.podiumBar1, { backgroundColor: isDark ? "#262C3D" : "#FEF08A" }]}>
              <Ionicons name="trophy" size={24} color="#EAB308" />
            </View>
          </View>

          {/* #3 Bronze */}
          <View style={styles.podiumColumn}>
            <View style={[styles.podiumAvatar, { backgroundColor: isDark ? "#222734" : "#E2E8F0" }]}>
              <Text style={styles.avatarRankText}>3</Text>
            </View>
            <Text
              style={[styles.podiumName, { color: colors.text }]}
              numberOfLines={1}
            >
              PixelMaster
            </Text>
            <Text style={[styles.podiumScore, { color: colors.subtext }]}>
              Lvl 61
            </Text>
            <View style={[styles.podiumBar, styles.podiumBar3, { backgroundColor: isDark ? "#1E2433" : "#E2E8F0" }]}>
              <Ionicons name="medal" size={20} color="#B45309" />
            </View>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.listContainer}>
          {TOP_PLAYERS.map((player) => (
            <View
              key={player.rank}
              style={[
                styles.playerRow,
                {
                  backgroundColor: player.isUser
                    ? isDark
                      ? "#232A3B"
                      : "#EEF2F6"
                    : colors.card,
                  borderColor: player.isUser ? "#3B82F6" : colors.border,
                },
              ]}
            >
              <View style={styles.rankBadge}>
                <Text
                  style={[
                    styles.rankNumber,
                    {
                      color:
                        player.rank === 1
                          ? "#EAB308"
                          : player.rank === 2
                          ? "#94A3B8"
                          : player.rank === 3
                          ? "#B45309"
                          : colors.subtext,
                    },
                  ]}
                >
                  #{player.rank}
                </Text>
              </View>

              <View style={styles.playerInfo}>
                <Text
                  style={[
                    styles.playerName,
                    {
                      color: colors.text,
                      fontWeight: player.isUser ? "800" : "600",
                    },
                  ]}
                >
                  {player.name}
                </Text>
                <View style={styles.streakIndicator}>
                  <Ionicons name="flame" size={14} color="#FF7A00" />
                  <Text style={styles.streakSmallText}>{player.streak}</Text>
                </View>
              </View>

              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>LVL {player.level}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.bottomNavWrapper}>
        <View
          style={[
            styles.floatingNavBar,
            { backgroundColor: colors.navBg, borderColor: colors.border },
          ]}
        >
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="home-outline" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {/* Streak Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace("/streak")}
          >
            <Ionicons name="flame-outline" size={26} color="#94A3B8" />
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace("/profile")}
          >
            <Ionicons name="person-outline" size={24} color="#94A3B8" />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 24,
    gap: 12,
  },
  podiumColumn: {
    flex: 1,
    alignItems: "center",
  },
  crownIcon: {
    marginBottom: -4,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  firstPlaceAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#EAB308",
  },
  avatarRankText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#64748B",
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 11,
    marginBottom: 8,
  },
  podiumBar: {
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumBar1: {
    height: 90,
  },
  podiumBar2: {
    height: 70,
  },
  podiumBar3: {
    height: 55,
  },
  listContainer: {
    gap: 10,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  rankBadge: {
    width: 36,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: "800",
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  playerName: {
    fontSize: 14,
    marginBottom: 2,
  },
  streakIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  streakSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF7A00",
  },
  levelBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
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
    shadowOpacity: 0.1,
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