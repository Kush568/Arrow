import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: isDark ? "#222734" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="person" size={40} color={colors.subtext} />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>Player #1337</Text>
          <View style={[styles.levelBadge, { backgroundColor: isDark ? "#222734" : "#F1F5F9" }]}>
            <Text style={[styles.levelBadgeText, { color: colors.subtext }]}>LEVEL 67</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.statBoxLabel}>Games Won</Text>
            <Text style={[styles.statBoxValue, { color: colors.text }]}>142</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.statBoxLabel}>Win Rate</Text>
            <Text style={[styles.statBoxValue, { color: colors.text }]}>78%</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.statBoxLabel}>Best Streak</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>14</Text>
              <Ionicons name="flame" size={20} color="#FF7A00" />
            </View>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.statBoxLabel}>Global Rank</Text>
            <Text style={[styles.statBoxValue, { color: colors.text }]}>#82</Text>
          </View>
        </View>

        {/* Settings & Preferences */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeader, { color: colors.text }]}>Settings</Text>

          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="moon-outline" size={20} color={colors.subtext} />
              <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Sound FX */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="volume-high-outline" size={20} color="#64748B" />
              <Text style={styles.settingText}>Sound FX</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Haptics */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="phone-portrait-outline" size={20} color="#64748B" />
              <Text style={styles.settingText}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Ionicons name="notifications-outline" size={20} color="#64748B" />
              <Text style={styles.settingText}>Daily Reminders</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.bottomNavWrapper}>
        <View style={[styles.floatingNavBar, { backgroundColor: colors.navBg, borderColor: colors.border }]}>
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

          {/* Profile Tab (Active - does not jump to home) */}
          <View style={styles.navItem}>
            <Ionicons name="person" size={24} color={colors.text} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statBoxLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
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
    backgroundColor: "#FFFFFF",
    width: "65%",
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowColor: "#0F172A",
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