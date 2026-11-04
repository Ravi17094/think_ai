import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/http";
import { type AttendanceReportRow, getAttendanceReport } from "@/api/staffApi";
import { palette, radii, spacing, typography } from "@/theme/tokens";
import { StaffButton, StaffNotice, StaffPageHeader, StaffSection, staffStyles } from "./staffUi";

const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const filters = ["", "PRESENT", "TARDY", "ABSENT", "EXCUSED"];

export function AttendanceReportScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [notice, setNotice] = useState("Choose optional filters, then load the report.");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const next = await getAttendanceReport(from, to, status);
      setRows(next);
      setNotice(`${next.length} attendance record${next.length === 1 ? "" : "s"} loaded.`);
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Could not load attendance report.");
    } finally {
      setLoading(false);
    }
  };

  const shareCsv = async () => {
    const headers = ["Student", "Email", "Course", "Date", "Session", "Status", "Notes"];
    const csv = [headers.join(","), ...rows.map((row) => [row.studentName, row.studentEmail, row.courseTitle, row.sessionDate, row.sessionTitle, row.status, row.notes].map(csvEscape).join(","))].join("\n");
    try {
      await Share.share({ title: "Attendance report.csv", message: csv });
    } catch {
      setNotice("Could not open CSV sharing.");
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={staffStyles.safe}>
      <ScrollView contentContainerStyle={staffStyles.content} keyboardShouldPersistTaps="handled">
        <StaffPageHeader eyebrow="CLASS INSIGHTS" title="Attendance report" description="Filter saved attendance records and share a CSV with your teaching team." />
        <StaffNotice>{notice}</StaffNotice>
        <StaffSection title="Report filters">
          <View style={styles.filterCard}>
            <Text style={styles.label}>From date</Text>
            <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} style={staffStyles.input} />
            <Text style={styles.label}>To date</Text>
            <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} style={staffStyles.input} />
            <Text style={styles.label}>Attendance status</Text>
            <View style={styles.filters}>
              {filters.map((item) => (
                <Pressable key={item || "all"} onPress={() => setStatus(item)} style={[styles.filter, status === item && styles.selected]} accessibilityRole="button">
                  <Text style={[styles.filterText, status === item && styles.selectedText]}>{item ? item.charAt(0) + item.slice(1).toLowerCase() : "All"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.actions}>
            <View style={styles.action}><StaffButton title={loading ? "Loading…" : "Load report"} onPress={() => void load()} disabled={loading} /></View>
            <View style={styles.action}><StaffButton title="Share CSV" onPress={() => void shareCsv()} disabled={!rows.length} variant="secondary" /></View>
          </View>
        </StaffSection>
        <StaffSection title={`Records (${rows.length})`}>
          {rows.map((row, index) => (
            <View key={`${row.studentEmail}-${row.sessionDate}-${index}`} style={styles.record}>
              <View style={styles.recordTop}><Text numberOfLines={1} style={styles.name}>{row.studentName}</Text><Text style={styles.badge}>{row.status}</Text></View>
              <Text style={styles.detail}>{row.courseTitle}</Text>
              <Text style={styles.detail}>{row.sessionTitle} · {row.sessionDate}</Text>
              {row.notes ? <Text style={styles.notes}>{row.notes}</Text> : null}
            </View>
          ))}
          {!rows.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No records yet</Text><Text style={styles.emptyText}>Load a report to see saved attendance here.</Text></View> : null}
        </StaffSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterCard: { ...staffStyles.card, gap: spacing.sm },
  label: { ...typography.label, color: palette.textSecondary, marginTop: spacing.xs },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filter: { borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 9, backgroundColor: palette.surfaceMuted },
  selected: { borderColor: palette.brand, backgroundColor: "#28164E" },
  filterText: { ...typography.caption, color: palette.textSecondary, fontWeight: "700" },
  selectedText: { color: palette.textPrimary },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
  record: { ...staffStyles.card, gap: spacing.xxs },
  recordTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { ...typography.subtitle, color: palette.textPrimary, flex: 1 },
  badge: { ...typography.caption, color: palette.accent, fontWeight: "800", backgroundColor: palette.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill },
  detail: { ...typography.caption, color: palette.textSecondary },
  notes: { ...typography.body, color: palette.textPrimary, marginTop: spacing.xs },
  empty: { ...staffStyles.card, alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.subtitle, color: palette.textPrimary },
  emptyText: { ...typography.body, color: palette.textSecondary, textAlign: "center" },
});
