import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/http";
import {
  getAttendanceRegister,
  saveAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/api/staffApi";
import { palette, radii, spacing, typography } from "@/theme/tokens";
import { StaffButton, StaffNotice, StaffPageHeader, StaffSection, staffStyles } from "./staffUi";

const statusOrder: AttendanceStatus[] = ["PRESENT", "TARDY", "ABSENT", "EXCUSED"];
const today = new Date().toISOString().slice(0, 10);
const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  TARDY: "Tardy",
  ABSENT: "Absent",
  EXCUSED: "Excused",
};

export function AttendanceRegisterScreen() {
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionTitle, setSessionTitle] = useState("TA session");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [notice, setNotice] = useState("Load a class to take attendance.");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const present = useMemo(
    () => records.filter((item) => item.status === "PRESENT" || item.status === "TARDY").length,
    [records],
  );

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getAttendanceRegister(sessionDate, sessionTitle);
      setRecords(rows);
      setNotice(rows.length ? `${rows.length} enrolled learner${rows.length === 1 ? "" : "s"} loaded.` : "No enrolled learners were found for this class.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  };
  // Start after mount so the first fetch does not synchronously cascade state updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (enrollmentId: number, patch: Partial<AttendanceRecord>) => {
    setRecords((items) => items.map((item) => item.enrollmentId === enrollmentId ? { ...item, ...patch } : item));
  };
  const cycle = (record: AttendanceRecord) => {
    update(record.enrollmentId, { status: statusOrder[(statusOrder.indexOf(record.status) + 1) % statusOrder.length]! });
  };
  const save = async () => {
    if (!records.length) return;
    setSaving(true);
    try {
      await Promise.all(records.map((record) => saveAttendance(record, sessionDate, sessionTitle)));
      setNotice(`Attendance saved for ${records.length} learner${records.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={staffStyles.safe}>
      <ScrollView contentContainerStyle={staffStyles.content} keyboardShouldPersistTaps="handled">
        <StaffPageHeader eyebrow="CLASS MANAGEMENT" title="Attendance" description="Load a session, confirm each learner's status, then save the shared register." />
        <StaffNotice>{notice}</StaffNotice>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Present or tardy</Text>
          <Text style={styles.summaryValue}>{present} / {records.length}</Text>
          <Text style={styles.summaryHint}>Marked learners in this session</Text>
        </View>
        <StaffSection title="Session details">
          <View style={styles.filterCard}>
            <Text style={styles.label}>Session title</Text>
            <TextInput value={sessionTitle} onChangeText={setSessionTitle} placeholder="Session title" placeholderTextColor={palette.textMuted} style={staffStyles.input} />
            <Text style={styles.label}>Date</Text>
            <TextInput value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} style={staffStyles.input} />
          </View>
          <StaffButton title={loading ? "Loading class…" : "Load class"} onPress={() => void load()} disabled={loading} variant="secondary" />
        </StaffSection>
        <StaffSection title="Learners">
          {records.map((record) => (
            <View key={record.enrollmentId} style={styles.learnerCard}>
              <View style={styles.cardTop}>
                <View style={styles.nameBox}>
                  <Text style={styles.name}>{record.studentName}</Text>
                  <Text numberOfLines={1} style={styles.course}>{record.courseTitle}</Text>
                </View>
                <Pressable onPress={() => cycle(record)} style={[styles.status, statusStyle(record.status)]} accessibilityRole="button">
                  <Text style={styles.statusText}>{statusLabels[record.status]}</Text>
                </Pressable>
              </View>
              <TextInput value={record.notes} onChangeText={(notes) => update(record.enrollmentId, { notes })} placeholder="Add an optional note" placeholderTextColor={palette.textMuted} style={styles.noteInput} />
            </View>
          ))}
          {!records.length ? <View style={styles.empty}><Text style={styles.emptyText}>No learner records loaded yet.</Text></View> : null}
          <Text style={styles.hint}>Tap a status to cycle through Present, Tardy, Absent, and Excused.</Text>
        </StaffSection>
        <StaffButton title={saving ? "Saving attendance…" : "Save attendance"} onPress={() => void save()} disabled={saving || !records.length} />
      </ScrollView>
    </SafeAreaView>
  );
}

function statusStyle(status: AttendanceStatus) {
  switch (status) {
    case "PRESENT": return styles.statusPRESENT;
    case "TARDY": return styles.statusTARDY;
    case "ABSENT": return styles.statusABSENT;
    case "EXCUSED": return styles.statusEXCUSED;
  }
}

const styles = StyleSheet.create({
  summary: { backgroundColor: "#21164A", borderColor: palette.brand, borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg },
  summaryLabel: { ...typography.label, color: palette.textSecondary },
  summaryValue: { ...typography.display, color: palette.textPrimary, marginTop: spacing.xxs },
  summaryHint: { ...typography.caption, color: palette.accent, marginTop: spacing.xxs },
  filterCard: { ...staffStyles.card, gap: spacing.sm },
  label: { ...typography.label, color: palette.textSecondary, marginTop: spacing.xs },
  learnerCard: { ...staffStyles.card, gap: spacing.sm },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  nameBox: { flex: 1 },
  name: { ...typography.subtitle, color: palette.textPrimary },
  course: { ...typography.caption, color: palette.textSecondary, marginTop: spacing.xxs },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 9, borderRadius: radii.pill },
  statusPRESENT: { backgroundColor: "rgba(52, 211, 153, .18)" },
  statusTARDY: { backgroundColor: "rgba(251, 191, 36, .18)" },
  statusABSENT: { backgroundColor: "rgba(248, 113, 113, .18)" },
  statusEXCUSED: { backgroundColor: "rgba(96, 165, 250, .18)" },
  statusText: { ...typography.caption, color: palette.textPrimary, fontWeight: "800" },
  noteInput: { ...staffStyles.input, minHeight: 46, fontSize: 14, backgroundColor: palette.background },
  hint: { ...typography.caption, color: palette.textMuted, lineHeight: 18 },
  empty: { ...staffStyles.card, alignItems: "center", padding: spacing.lg },
  emptyText: { ...typography.body, color: palette.textSecondary },
});
