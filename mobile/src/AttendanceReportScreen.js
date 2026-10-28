import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import useAttendanceReport, {
  attendanceRowsToCsv,
  ATTENDANCE_FILTERS,
} from "./useAttendanceReport";
import { COLORS } from "./theme";

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function AttendanceReportScreen({ account }) {
  const sessionDate = new Date().toISOString().slice(0, 10);
  const sessionTitle = "Mobile TA session";
  const {
    rows,
    filteredRows,
    summary,
    filter,
    setFilter,
    loading,
    error,
    load,
  } = useAttendanceReport({
    token: account?.token,
    sessionDate,
    sessionTitle,
  });

  const exportCsv = async () => {
    if (!rows.length) {
      Alert.alert("No attendance data", "Load attendance before exporting a report.");
      return;
    }

    try {
      const fileUri = `${FileSystem.cacheDirectory}thinkz-attendance-${sessionDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, attendanceRowsToCsv(filteredRows), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Share attendance report",
        });
      } else {
        await Share.share({ message: attendanceRowsToCsv(filteredRows) });
      }
    } catch (exportError) {
      Alert.alert("Export failed", exportError.message || "Unable to create the CSV report.");
    }
  };

  if (loading && !rows.length) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Attendance report</Text>
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
      </View>
    );
  }

  if (error && !rows.length) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Attendance report</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.primaryButton} onPress={load}>
          <Text style={styles.primaryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Attendance report</Text>
      <Text style={styles.muted}>Session: {sessionTitle} - {sessionDate}</Text>

      <View style={styles.summaryGrid}>
        <Stat label="Total learners" value={summary.total} />
        <Stat label="Attendance rate" value={`${summary.attendancePercentage}%`} />
        <Stat label="Present" value={summary.PRESENT} />
        <Stat label="Absent" value={summary.ABSENT} />
        <Stat label="Tardy" value={summary.TARDY} />
        <Stat label="Excused" value={summary.EXCUSED} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {ATTENDANCE_FILTERS.map((item) => (
          <Pressable
            key={item}
            style={[styles.filter, filter === item && styles.filterActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={load}>
          <Text style={styles.secondaryText}>{loading ? "Refreshing..." : "Refresh"}</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={exportCsv}>
          <Text style={styles.primaryText}>Export CSV</Text>
        </Pressable>
      </View>

      {!filteredRows.length ? (
        <Text style={styles.muted}>No learners match this attendance filter.</Text>
      ) : (
        filteredRows.map((row) => (
          <View key={row.enrollmentId} style={styles.row}>
            <Text style={styles.name}>{row.studentName}</Text>
            <Text style={styles.detail}>
              {row.status} - Join: {row.joinTime} - Last seen: {row.lastSeen} - Observed duration: {row.duration}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: COLORS.background, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "700", color: COLORS.text },
  muted: { color: COLORS.muted, fontSize: 15 },
  error: { color: COLORS.danger, fontSize: 14 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "47%", backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 5, elevation: 1 },
  statLabel: { color: COLORS.muted, fontSize: 14 },
  statValue: { color: COLORS.text, fontSize: 26, fontWeight: "700" },
  filters: { gap: 8, paddingVertical: 3 },
  filter: { borderWidth: 1, borderColor: COLORS.inputBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontWeight: "600" },
  filterTextActive: { color: COLORS.surface },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 8, alignSelf: "flex-start" },
  primaryText: { color: COLORS.surface, fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, alignSelf: "flex-start" },
  secondaryText: { color: COLORS.primaryDark, fontWeight: "700" },
  row: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, gap: 6, borderWidth: 1, borderColor: COLORS.border },
  name: { color: COLORS.text, fontWeight: "700", fontSize: 16 },
  detail: { color: COLORS.detail, lineHeight: 20 },
  skeleton: { height: 84, backgroundColor: COLORS.border, borderRadius: 10 },
});
