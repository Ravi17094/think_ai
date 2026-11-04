import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/http";
import { bulkGradeSubmissions, getGradingQueue, gradeSubmission, type GradingSubmission } from "@/api/staffApi";
import { palette, radii, spacing, typography } from "@/theme/tokens";
import { StaffButton, StaffNotice, StaffPageHeader, StaffSection, staffStyles } from "./staffUi";

type GradeDraft = { score: string; feedback: string };

export function GradingQueueScreen() {
  const [grades, setGrades] = useState<GradingSubmission[]>([]);
  const [drafts, setDrafts] = useState<Record<number, GradeDraft>>({});
  const [notice, setNotice] = useState("Loading submitted assessments…");
  const [saving, setSaving] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = async () => {
    try {
      const rows = await getGradingQueue();
      setGrades(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, { score: String(row.score ?? 0), feedback: row.feedback ?? "" }])));
      setNotice(rows.length ? "Review a score and save feedback for each learner." : "There are no submitted assessments to grade.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not load submissions.");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialLoad);
  }, []);

  const patch = (id: number, value: Partial<GradeDraft>) => setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { score: "", feedback: "" }), ...value } }));
  const save = async (row: GradingSubmission) => {
    const draft = drafts[row.id];
    const score = Number(draft?.score);
    if (!Number.isFinite(score) || score < 0 || score > row.totalMarks) {
      setNotice(`Enter a score between 0 and ${row.totalMarks}.`);
      return;
    }
    setSaving(row.id);
    try {
      const updated = await gradeSubmission(row.id, score, draft?.feedback ?? "");
      setGrades((rows) => rows.map((item) => item.id === row.id ? updated : item));
      setNotice(`Grade saved for ${row.learnerName}.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not save grade.");
    } finally {
      setSaving(null);
    }
  };
  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveSelected = () => {
    if (!selected.length) { setNotice("Select submissions first."); return; }
    const rows = grades.filter((row) => selected.includes(row.id));
    for (const row of rows) {
      const score = Number(drafts[row.id]?.score);
      if (!Number.isFinite(score) || score < 0 || score > row.totalMarks) { setNotice(`Check ${row.learnerName}'s score before batch saving.`); return; }
    }
    Alert.alert("Save selected grades?", `This will grade ${rows.length} submission${rows.length === 1 ? "" : "s"} and cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Save grades", onPress: () => void (async () => {
        setBulkSaving(true);
        try {
          const updated = await bulkGradeSubmissions(rows.map((row) => {
            const draft = drafts[row.id] ?? { score: "", feedback: "" };
            return { id: row.id, score: Number(draft.score), feedback: draft.feedback };
          }));
          setGrades((current) => current.map((row) => updated.find((item) => item.id === row.id) ?? row));
          setSelected([]);
          setNotice(`${updated.length} grades saved.`);
        } catch (error) {
          setNotice(error instanceof ApiError ? error.message : "Could not save selected grades.");
        } finally {
          setBulkSaving(false);
        }
      })() },
    ]);
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={staffStyles.safe}>
      <ScrollView contentContainerStyle={staffStyles.content} keyboardShouldPersistTaps="handled">
        <StaffPageHeader eyebrow="ASSESSMENT REVIEW" title="Grading queue" description="Review submitted assessments, add feedback, and save multiple grades at once." />
        <StaffNotice>{notice}</StaffNotice>
        <View style={styles.overview}>
          <View><Text style={styles.overviewLabel}>Ready to review</Text><Text style={styles.overviewValue}>{grades.length}</Text></View>
          <View style={styles.divider} />
          <View><Text style={styles.overviewLabel}>Selected</Text><Text style={styles.overviewValue}>{selected.length}</Text></View>
        </View>
        <View style={styles.actions}>
          <View style={styles.action}><StaffButton title="Refresh" onPress={() => void load()} variant="secondary" /></View>
          <View style={styles.action}><StaffButton title={bulkSaving ? "Saving…" : `Save selected (${selected.length})`} onPress={saveSelected} disabled={!selected.length || bulkSaving} /></View>
        </View>
        <StaffSection title="Submissions">
          {grades.map((grade) => (
            <View key={grade.id} style={[styles.card, selected.includes(grade.id) && styles.selected]}>
              <Pressable onPress={() => toggle(grade.id)} style={styles.selectRow} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(grade.id) }}>
                <View style={[styles.checkbox, selected.includes(grade.id) && styles.checkboxSelected]}><Text style={styles.check}>{selected.includes(grade.id) ? "✓" : ""}</Text></View>
                <View style={styles.nameBox}><Text style={styles.name}>{grade.learnerName}</Text><Text style={styles.assignment}>{grade.assessmentTitle}</Text></View>
                <Text style={styles.marks}>/ {grade.totalMarks}</Text>
              </Pressable>
              <Text style={styles.label}>Score</Text>
              <TextInput value={drafts[grade.id]?.score ?? ""} onChangeText={(score) => patch(grade.id, { score })} keyboardType="decimal-pad" maxLength={6} placeholder="0" placeholderTextColor={palette.textMuted} style={styles.score} />
              <Text style={styles.label}>Feedback</Text>
              <TextInput value={drafts[grade.id]?.feedback ?? ""} onChangeText={(feedback) => patch(grade.id, { feedback })} placeholder="Share clear, useful feedback" placeholderTextColor={palette.textMuted} multiline style={styles.feedback} />
              <StaffButton title={saving === grade.id ? "Saving grade…" : "Save grade"} onPress={() => void save(grade)} disabled={saving === grade.id} />
            </View>
          ))}
          {!grades.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing to grade</Text><Text style={styles.emptyText}>New submissions will appear here automatically.</Text></View> : null}
        </StaffSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overview: { flexDirection: "row", alignItems: "center", backgroundColor: "#21164A", borderColor: palette.brand, borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, gap: spacing.lg },
  overviewLabel: { ...typography.caption, color: palette.textSecondary },
  overviewValue: { ...typography.display, color: palette.textPrimary, marginTop: spacing.xxs },
  divider: { width: 1, height: 42, backgroundColor: palette.borderStrong },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
  card: { ...staffStyles.card, gap: spacing.sm },
  selected: { borderColor: palette.brand, backgroundColor: "#171633" },
  selectRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  checkbox: { width: 28, height: 28, borderColor: palette.borderStrong, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: palette.brand, borderColor: palette.brand },
  check: { color: palette.textPrimary, fontWeight: "900" },
  nameBox: { flex: 1 },
  name: { ...typography.subtitle, color: palette.textPrimary },
  assignment: { ...typography.caption, color: palette.textSecondary, marginTop: spacing.xxs },
  marks: { ...typography.label, color: palette.accent },
  label: { ...typography.label, color: palette.textSecondary, marginTop: spacing.xs },
  score: { ...staffStyles.input, width: 110 },
  feedback: { ...staffStyles.input, minHeight: 102, paddingTop: spacing.sm, textAlignVertical: "top" },
  empty: { ...staffStyles.card, alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.subtitle, color: palette.textPrimary },
  emptyText: { ...typography.body, color: palette.textSecondary, textAlign: "center" },
});
