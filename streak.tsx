import { Ionicons } from "@expo/vector-icons";
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

// Helper to determine fire heat-map shade based on levels played & dark mode
const getFireShade = (count: number, isDark: boolean) => {
  if (count === 0) {
    return isDark
      ? { bg: "#161922", text: "#4B5563", border: "#222734" }
      : { bg: "#F1F5F9", text: "#94A3B8", border: "#E2E8F0" };
  }
  if (count <= 2) {
    return isDark
      ? { bg: "#3D2418", text: "#FDBA74", border: "#7C2D12" }
      : { bg: "#FFE4D6", text: "#EA580C", border: "#FDBA74" };
  }
  if (count <= 4) {
    return isDark
      ? { bg: "#7C2D12", text: "#FFEDD5", border: "#C2410C" }
      : { bg: "#FFB088", text: "#C2410C", border: "#FB923C" };
  }
  if (count <= 6) {
    return { bg: "#EA580C", text: "#FFFFFF", border: "#FF7A00" };
  }
  // Max cap: Constant deep flame ember
  return { bg: "#DC2626", text: "#FFFFFF", border: "#EF4444" };
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function StreakScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const [currentStreak] = useState(7);
  const [bestStreak] = useState(14);

  // Month navigation state
  const [displayedDate, setDisplayedDate] = useState(new Date());

  const handlePrevMonth = () => {
    setDisplayedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setDisplayedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

  // Generate days based on selected month
  const totalDaysInMonth = new Date(
    displayedDate.getFullYear(),
    displayedDate.getMonth() + 1,
    0
  ).getDate();

  const monthDays = Array.from({ length: totalDaysInMonth }, (_, index) => {
    const day = index + 1;
    // Dynamic sample intensity distribution
    const count = (day * 3 + displayedDate.getMonth()) % 9;
    return { day, count };
  });

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Streak</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Big Streak Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.streakHero}>
            <Ionicons name="flame" size={54} color="#FF7A00" />
            <Text style={[styles.heroNumber, { color: colors.text }]}>{currentStreak}</Text>
            <Text style={[styles.heroSubtext, { color: colors.subtext }]}>Day Streak Active!</Text>
          </View>

          <View style={[styles.statsDivider, { backgroundColor: isDark ? "#222734" : "#F1F5F9" }]} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Streak</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{bestStreak} days</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>24 active</Text>
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Centered Month with Prev/Next Controls */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={[styles.arrowButton, { backgroundColor: isDark ? "#222734" : "#F1F5F9" }]}
              activeOpacity={0.7}
              onPress={handlePrevMonth}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTH_NAMES[displayedDate.getMonth()]} {displayedDate.getFullYear()}
            </Text>

            <TouchableOpacity
              style={[styles.arrowButton, { backgroundColor: isDark ? "#222734" : "#F1F5F9" }]}
              activeOpacity={0.7}
              onPress={handleNextMonth}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Row */}
          <View style={styles.daysRow}>
            {daysOfWeek.map((dayName, idx) => (
              <Text key={idx} style={styles.dayOfWeekText}>
                {dayName}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.calendarGrid}>
            {monthDays.map((item) => {
              const shade = getFireShade(item.count, isDark);
              return (
                <View
                  key={item.day}
                  style={[
                    styles.dayTile,
                    {
                      backgroundColor: shade.bg,
                      borderColor: shade.border,
                    },
                  ]}
                >
                  <Text style={[styles.dayNumber, { color: shade.text }]}>
                    {item.day}
                  </Text>
                  {item.count > 0 && (
                    <Text style={[styles.multiplierText, { color: shade.text }]}>
                      x{item.count}
                    </Text>
                  )}
                </View>
              );
            })}
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

          {/* Streak Tab (Active) */}
          <View style={styles.navItem}>
            <Ionicons name="flame" size={26} color="#FF7A00" />
          </View>

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
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  streakHero: {
    alignItems: "center",
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 4,
  },
  heroSubtext: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  statsDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dayOfWeekText: {
    width: "13%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  dayTile: {
    width: "12.8%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "700",
  },
  multiplierText: {
    fontSize: 8.5,
    fontWeight: "900",
    marginTop: 1,
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