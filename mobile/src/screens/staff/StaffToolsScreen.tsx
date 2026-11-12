import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "@/api/session";
import type { ScreenProps } from "@/navigation/types";
import { palette, radii, typography } from "@/theme/tokens";

const tools = [
  { route: "LiveStudio" as const, icon: "●", title: "Live Studio", detail: "Chat, polls, attendees and breakout rooms" },
  { route: "AttendanceRegister" as const, icon: "✓", title: "Attendance", detail: "Mark and save the class register" },
  { route: "AttendanceReport" as const, icon: "↗", title: "Attendance report", detail: "Filter records and share a CSV" },
  { route: "GradingQueue" as const, icon: "✦", title: "Grading queue", detail: "Review submissions and grade in bulk" },
  { route: "InstructorControls" as const, icon: "☷", title: "Instructor controls", detail: "Prepare and manage your live session" },
  { route: "RbacMatrix" as const, icon: "⌘", title: "Role permissions", detail: "Review secure role-based access" },
];

const tabs = [
  { label: "Home", icon: "⌂", route: "LmsHome" as const },
  { label: "My learning", icon: "▶", route: "MyCourses" as const },
  { label: "Explore", icon: "⌕", route: "GlobalSearch" as const },
  { label: "Wishlist", icon: "♡", route: "Wishlist" as const },
  { label: "Profile", icon: "♙", route: "LearnerProfile" as const },
];

export function StaffToolsScreen({ navigation }: ScreenProps<"StaffTools">) {
  const logout = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>TEACHING WORKSPACE</Text>
        <Text style={styles.title}>Everything for your class</Text>
        <Text style={styles.note}>
          Run a live session, track attendance, grade work, and manage access.
        </Text>

        <View style={styles.summary}>
          <View style={styles.summaryIcon}><Text style={styles.summaryIconText}>TA</Text></View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Teaching tools</Text>
            <Text style={styles.summaryText}>Your TA and instructor workspace</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Class management</Text>
        <View style={styles.toolList}>
          {tools.map((tool) => (
            <Pressable
              key={tool.route}
              onPress={() => navigation.navigate(tool.route)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tool.title}`}
            >
              <View style={styles.toolIcon}><Text style={styles.toolIconText}>{tool.icon}</Text></View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{tool.title}</Text>
                <Text style={styles.detail}>{tool.detail}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => void logout()} style={styles.logout} accessibilityRole="button">
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <Pressable key={tab.label} style={styles.navItem} onPress={() => navigation.navigate(tab.route)} accessibilityRole="tab">
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={styles.navLabel}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 24, paddingTop: 116, paddingBottom: 28 },
  kicker: { ...typography.caption, color: palette.accent, fontWeight: "800", letterSpacing: 1.3 },
  title: { ...typography.display, color: palette.textPrimary, marginTop: 6 },
  note: { ...typography.body, color: palette.textSecondary, lineHeight: 24, marginTop: 8 },
  summary: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginTop: 24, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radii.lg, backgroundColor: palette.surface },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: palette.brand },
  summaryIconText: { color: palette.textPrimary, fontSize: 15, fontWeight: "900" },
  summaryCopy: { flex: 1 },
  summaryTitle: { ...typography.subtitle, color: palette.textPrimary },
  summaryText: { ...typography.caption, color: palette.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.subtitle, color: palette.textPrimary, marginTop: 28, marginBottom: 12 },
  toolList: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16, minHeight: 88, backgroundColor: palette.surface, borderColor: palette.borderStrong, borderWidth: 1, borderRadius: 20 },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  toolIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.surfaceMuted },
  toolIconText: { color: palette.accent, fontSize: 18, fontWeight: "800" },
  cardCopy: { flex: 1 },
  cardTitle: { ...typography.subtitle, color: palette.textPrimary },
  detail: { ...typography.caption, color: palette.textSecondary, lineHeight: 19, marginTop: 3 },
  arrow: { color: palette.brand, fontSize: 32, lineHeight: 34, fontWeight: "300" },
  logout: { marginTop: 24, borderWidth: 1, borderColor: palette.danger, borderRadius: radii.md, padding: 15, alignItems: "center" },
  logoutText: { ...typography.label, color: palette.danger },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingTop: 12, paddingBottom: 10, backgroundColor: palette.surface, borderTopColor: palette.border, borderTopWidth: 1 },
  navItem: { alignItems: "center", minWidth: 52, gap: 3 },
  navIcon: { color: palette.textSecondary, fontSize: 22 },
  navLabel: { color: palette.textSecondary, fontSize: 10, fontWeight: "700" },
});
