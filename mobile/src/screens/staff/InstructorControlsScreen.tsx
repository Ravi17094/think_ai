import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/http";
import { getInstructorControls, saveInstructorControls, type InstructorControls } from "@/api/staffApi";
import { palette, radii, spacing, typography } from "@/theme/tokens";
import { checklistItems } from "./staffStorage";
import { StaffNotice, StaffPageHeader, StaffSection, staffStyles } from "./staffUi";

const SESSION_ID = "demo-live-session";
const initialControls: InstructorControls = { muted: false, chatDisabled: false, spotlight: false, recording: false };

export function InstructorControlsScreen() {
  const [done, setDone] = useState<string[]>([]);
  const [controls, setControls] = useState<InstructorControls>(initialControls);
  const [notice, setNotice] = useState("Loading server-saved session preparation…");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const value = await getInstructorControls(SESSION_ID);
      setDone(value.checklist);
      setControls(value.controls);
      setNotice(value.updatedAt ? "Loaded the shared server copy." : "Start the shared preparation checklist.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not load controls.");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialLoad);
  }, []);
  const persist = async (nextDone: string[], nextControls: InstructorControls, label: string) => {
    setDone(nextDone); setControls(nextControls); setSaving(true);
    try {
      await saveInstructorControls(SESSION_ID, nextDone, nextControls);
      setNotice(`${label} saved for everyone on this session.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Save failed. Tap the change again to retry.");
    } finally {
      setSaving(false);
    }
  };
  const toggleCheck = (item: string) => {
    const next = done.includes(item) ? done.filter((value) => value !== item) : [...done, item];
    void persist(next, controls, "Checklist");
  };
  const toggle = (key: keyof InstructorControls, label: string) => void persist(done, { ...controls, [key]: !controls[key] }, label);
  const completedPercent = checklistItems.length ? Math.round((done.length / checklistItems.length) * 100) : 0;

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={staffStyles.safe}>
      <ScrollView contentContainerStyle={staffStyles.content}>
        <StaffPageHeader eyebrow="LIVE SESSION" title="Instructor controls" description="Prepare your class and keep the live session settings synced for your teaching team." />
        <StaffNotice tone={saving ? "neutral" : "success"}>{saving ? "Saving changes to the shared session…" : notice}</StaffNotice>
        <View style={styles.progressCard}>
          <View><Text style={styles.progressLabel}>Session preparation</Text><Text style={styles.progressText}>{done.length} of {checklistItems.length} checks complete</Text></View>
          <Text style={styles.progressValue}>{completedPercent}%</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${completedPercent}%` }]} /></View>
        </View>
        <StaffSection title="Before you go live">
          {checklistItems.map((item) => {
            const checked = done.includes(item);
            return <Pressable disabled={saving} key={item} onPress={() => toggleCheck(item)} style={[styles.checkItem, checked && styles.checkItemDone]} accessibilityRole="checkbox" accessibilityState={{ checked }}>
              <View style={[styles.check, checked && styles.checkDone]}><Text style={styles.checkText}>{checked ? "✓" : ""}</Text></View>
              <Text style={[styles.itemText, checked && styles.itemTextDone]}>{item}</Text>
            </Pressable>;
          })}
        </StaffSection>
        <StaffSection title="Live controls">
          <View style={styles.grid}>
            <Control active={controls.muted} label={controls.muted ? "Unmute all" : "Mute all"} hint="Participants" onPress={() => toggle("muted", "Mute all")} />
            <Control active={controls.chatDisabled} label={controls.chatDisabled ? "Enable chat" : "Disable chat"} hint="Discussion" onPress={() => toggle("chatDisabled", "Chat")} />
            <Control active={controls.spotlight} label={controls.spotlight ? "Remove spotlight" : "Spotlight speaker"} hint="Stage view" onPress={() => toggle("spotlight", "Spotlight")} />
            <Control active={controls.recording} label={controls.recording ? "Stop recording" : "Start recording"} hint="Session capture" onPress={() => toggle("recording", "Recording")} />
          </View>
        </StaffSection>
        <StaffSection title="Post-session summary">
          <View style={styles.summary}><Summary label="Attendance" value="Open the attendance register" /><Summary label="Grading" value="Open the grading queue" /><Summary label="Recording" value={controls.recording ? "Recording in progress" : "Not started"} last /></View>
        </StaffSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function Control({ label, hint, active, onPress }: { label: string; hint: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.control, active && styles.controlActive]} accessibilityRole="button"><Text style={[styles.controlLabel, active && styles.controlLabelActive]}>{label}</Text><Text style={styles.controlHint}>{hint}</Text></Pressable>;
}
function Summary({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.summaryRow, last && styles.lastRow]}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryText}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  progressCard: { backgroundColor: "#21164A", borderColor: palette.brand, borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  progressLabel: { ...typography.subtitle, color: palette.textPrimary },
  progressText: { ...typography.caption, color: palette.textSecondary, marginTop: spacing.xxs },
  progressValue: { ...typography.title, color: palette.accent, marginLeft: "auto" },
  track: { height: 8, width: "100%", overflow: "hidden", borderRadius: radii.pill, backgroundColor: palette.border },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: palette.brand },
  checkItem: { ...staffStyles.card, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkItemDone: { borderColor: palette.success, backgroundColor: "rgba(52, 211, 153, .08)" },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: palette.borderStrong, alignItems: "center", justifyContent: "center" },
  checkDone: { backgroundColor: palette.success, borderColor: palette.success },
  checkText: { color: palette.textInverse, fontWeight: "900" },
  itemText: { ...typography.body, color: palette.textPrimary, flex: 1 },
  itemTextDone: { color: palette.success },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  control: { width: "48%", minHeight: 104, justifyContent: "center", padding: spacing.md, borderRadius: radii.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  controlActive: { borderColor: palette.brand, backgroundColor: "#21164A" },
  controlLabel: { ...typography.label, color: palette.textPrimary, lineHeight: 19 },
  controlLabelActive: { color: palette.accent },
  controlHint: { ...typography.caption, color: palette.textSecondary, marginTop: spacing.xs },
  summary: { ...staffStyles.card, paddingVertical: 0 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, paddingVertical: spacing.md, borderBottomColor: palette.border, borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  summaryLabel: { ...typography.body, color: palette.textSecondary },
  summaryText: { ...typography.label, color: palette.textPrimary, flexShrink: 1, textAlign: "right" },
});
