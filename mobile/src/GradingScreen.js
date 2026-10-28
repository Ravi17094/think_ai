import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getGradingQueue, submitBulkGrades, submitGrade } from "./api";
import { COLORS } from "./theme";

export default function GradingScreen({ account }) {
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bulkSelection, setBulkSelection] = useState([]);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("Loading grading queue...");
  const [busy, setBusy] = useState(false);
  const selectedItems = useMemo(() => queue.filter((item) => bulkSelection.includes(item.id)), [queue, bulkSelection]);

  const load = async () => {
    try {
      const response = await getGradingQueue(account.token);
      setQueue(response.data || []); setBulkSelection([]);
      setNotice("Select one submission to review, or select several for bulk grading.");
    } catch (error) { setNotice(error.message || "Could not load grading queue."); }
  };
  useEffect(() => { load(); }, []);
  const choose = (submission) => { setSelected(submission); setScore(""); setFeedback(""); };
  const toggleBulk = (id) => setBulkSelection((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const validateScore = (max) => {
    if (score === "" || Number(score) < 0 || Number(score) > max) { setNotice(`Enter a score from 0 to ${max}.`); return false; }
    return true;
  };
  const grade = async () => {
    const max = selected?.assessment?.totalMarks || 0;
    if (!validateScore(max)) return;
    setBusy(true);
    try { await submitGrade(account.token, selected.id, score, feedback); setNotice("Grade saved. Loading the remaining submissions..."); setSelected(null); await load(); }
    catch (error) { setNotice(error.message || "Could not save grade."); } finally { setBusy(false); }
  };
  const bulkGrade = () => {
    if (!selectedItems.length) { setNotice("Select at least one submission for bulk grading."); return; }
    const max = Math.min(...selectedItems.map((item) => item.assessment?.totalMarks || 0));
    if (!validateScore(max)) return;
    Alert.alert("Apply bulk grade?", `Apply ${score} marks to ${selectedItems.length} selected submission(s)?`, [{ text: "Cancel", style: "cancel" }, { text: "Apply", onPress: saveBulk }]);
  };
  const saveBulk = async () => {
    setBusy(true);
    try {
      const grades = selectedItems.map((item) => ({ submissionId: item.id, score: Number(score), feedback }));
      const response = await submitBulkGrades(account.token, grades);
      const failed = (response.data || []).filter((item) => !item.success).length;
      setNotice(failed ? `${grades.length - failed} grades saved; ${failed} need review.` : `${grades.length} grades saved successfully.`);
      setScore(""); setFeedback(""); await load();
    } catch (error) { setNotice(error.message || "Could not save the bulk grades."); } finally { setBusy(false); }
  };

  return <ScrollView contentContainerStyle={styles.screen}>
    <Text style={styles.heading}>Grade submissions</Text><Text style={styles.muted}>{notice}</Text>
    {!selected && <>
      <View style={styles.bulkBar}><Text style={styles.strong}>{bulkSelection.length} selected</Text><Pressable disabled={busy || !bulkSelection.length} onPress={bulkGrade} style={[styles.primary, (!bulkSelection.length || busy) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Saving..." : "Bulk grade"}</Text></Pressable></View>
      {bulkSelection.length > 0 && <View style={styles.bulkForm}><TextInput value={score} onChangeText={setScore} keyboardType="numeric" placeholder="Score for selected submissions" style={styles.input}/><TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="Optional feedback template" style={styles.input}/><Pressable onPress={() => setFeedback("Good work. Review the rubric notes and continue practicing.")} style={styles.secondary}><Text>Insert feedback template</Text></Pressable></View>}
      {queue.map((item) => <View key={item.id} style={styles.card}><Pressable onPress={() => toggleBulk(item.id)} style={styles.check}><Text style={styles.checkText}>{bulkSelection.includes(item.id) ? "☑" : "☐"}</Text></Pressable><Pressable onPress={() => choose(item)} style={styles.cardBody}><Text style={styles.strong}>{item.enrollment?.studentName || "Learner"}</Text><Text>{item.assessment?.title || "Assessment"}</Text><Text style={styles.muted}>Submitted {new Date(item.submittedAt).toLocaleString()}</Text></Pressable></View>)}
      {queue.length === 0 && <Text style={styles.muted}>No submissions are awaiting review.</Text>}
    </>}
    {selected && <View style={styles.detailCard}><Text style={styles.strong}>{selected.enrollment?.studentName}</Text><Text>Assessment: {selected.assessment?.title}</Text><Text>Total marks: {selected.assessment?.totalMarks}</Text><Text style={styles.label}>Student answer</Text><Text>{selected.answers?.map((answer) => answer.code || answer.answerText || "No answer").join("\n\n") || "No answer"}</Text><TextInput value={score} onChangeText={setScore} keyboardType="numeric" placeholder="Score" style={styles.input}/><TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="Feedback for learner" style={styles.input}/><View style={styles.actions}><Pressable onPress={() => setSelected(null)} style={styles.secondary}><Text>Back</Text></Pressable><Pressable onPress={() => setFeedback("Good work. Review the rubric notes and continue practicing.")} style={styles.secondary}><Text>Insert template</Text></Pressable><Pressable disabled={busy} onPress={grade} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Saving..." : "Submit grade"}</Text></Pressable></View></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({ screen:{padding:16,gap:12,backgroundColor:COLORS.background},heading:{fontSize:26,fontWeight:"700",color:COLORS.text},muted:{color:COLORS.muted},strong:{fontWeight:"700",fontSize:16,color:COLORS.text},card:{backgroundColor:COLORS.surface,borderRadius:10,padding:14,flexDirection:"row",gap:10},cardBody:{flex:1,gap:4},check:{justifyContent:"center",padding:4},checkText:{fontSize:22,color:COLORS.primary},detailCard:{backgroundColor:COLORS.surface,borderRadius:10,padding:14,gap:8},bulkForm:{backgroundColor:COLORS.primarySurface,padding:12,borderRadius:10,gap:8},bulkBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},label:{fontWeight:"700",marginTop:10,color:COLORS.text},input:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.inputBorder,borderRadius:8,padding:10},actions:{flexDirection:"row",flexWrap:"wrap",gap:10},primary:{backgroundColor:COLORS.primary,padding:10,borderRadius:8},primaryText:{color:COLORS.surface,fontWeight:"700"},secondary:{borderWidth:1,borderColor:COLORS.primary,padding:10,borderRadius:8},disabled:{opacity:0.55} });
