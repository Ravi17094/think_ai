import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { GRADES_KEY, type GradeRecord, defaultGrades, loadStored, saveStored } from './staffStorage';

export function GradingQueueScreen() {
  const [grades, setGrades] = useState<GradeRecord[]>(defaultGrades); const [notice, setNotice] = useState('Loading submissions…');
  useEffect(() => { loadStored(GRADES_KEY, defaultGrades).then((data) => { setGrades(data); setNotice('Review scores, add feedback, and save grades.'); }); }, []);
  const update = (id: string, patch: Partial<GradeRecord>) => setGrades((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const save = async () => { const next = grades.map((item) => ({ ...item, graded: true })); setGrades(next); await saveStored(GRADES_KEY, next); setNotice('Grades saved on this device.'); };
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Grading queue</Text><Text style={styles.note}>{notice}</Text>
    {grades.map((grade) => <View key={grade.id} style={styles.card}><Text style={styles.name}>{grade.learner}</Text><Text style={styles.assignment}>{grade.assignment}</Text><TextInput value={String(grade.score)} onChangeText={(score) => update(grade.id, { score: Number(score.replace(/[^0-9]/g, '')) || 0 })} keyboardType="number-pad" maxLength={3} style={styles.score} /><TextInput value={grade.feedback} onChangeText={(feedback) => update(grade.id, { feedback })} placeholder="Feedback for learner" placeholderTextColor={palette.textMuted} multiline style={styles.feedback}/><Text style={styles.state}>{grade.graded ? 'Saved' : 'Pending review'}</Text></View>)}
    <Pressable onPress={save} style={styles.button}><Text style={styles.buttonText}>Save grades</Text></Pressable></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.md},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},card:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:radii.md,padding:spacing.md,gap:spacing.xs},name:{...typography.subtitle,color:palette.textPrimary},assignment:{...typography.body,color:palette.textSecondary},score:{width:80,borderWidth:1,borderColor:palette.border,borderRadius:radii.sm,color:palette.textPrimary,padding:spacing.sm,marginTop:spacing.xs},feedback:{minHeight:80,borderWidth:1,borderColor:palette.border,borderRadius:radii.sm,color:palette.textPrimary,padding:spacing.sm,textAlignVertical:'top'},state:{...typography.caption,color:palette.accent},button:{backgroundColor:palette.brand,borderRadius:radii.md,padding:spacing.md,alignItems:'center'},buttonText:{...typography.label,color:palette.textPrimary}});
