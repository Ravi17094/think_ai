import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/http';
import { getAttendanceRegister, saveAttendance, type AttendanceRecord, type AttendanceStatus } from '@/api/staffApi';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const statusOrder: AttendanceStatus[] = ['PRESENT', 'TARDY', 'ABSENT', 'EXCUSED'];
const today = new Date().toISOString().slice(0, 10);

export function AttendanceRegisterScreen() {
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionTitle, setSessionTitle] = useState('TA session');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [notice, setNotice] = useState('Load an active session to take attendance.');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const present = useMemo(() => records.filter((item) => item.status === 'PRESENT' || item.status === 'TARDY').length, [records]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getAttendanceRegister(sessionDate, sessionTitle);
      setRecords(rows);
      setNotice(rows.length ? `${rows.length} enrolled learner${rows.length === 1 ? '' : 's'} loaded.` : 'No enrolled learners were found for this session.');
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Could not load attendance.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const update = (enrollmentId: number, patch: Partial<AttendanceRecord>) => setRecords((items) => items.map((item) => item.enrollmentId === enrollmentId ? { ...item, ...patch } : item));
  const cycle = (record: AttendanceRecord) => update(record.enrollmentId, { status: statusOrder[(statusOrder.indexOf(record.status) + 1) % statusOrder.length]! });
  const save = async () => {
    if (!records.length) return;
    setSaving(true);
    try {
      await Promise.all(records.map((record) => saveAttendance(record, sessionDate, sessionTitle)));
      setNotice(`Attendance saved for ${records.length} learner${records.length === 1 ? '' : 's'}.`);
    } catch (error) { setNotice(error instanceof ApiError ? error.message : 'Could not save attendance.'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Attendance register</Text><Text style={styles.note}>{notice}</Text>
    <View style={styles.filters}><TextInput value={sessionTitle} onChangeText={setSessionTitle} placeholder="Session title" placeholderTextColor={palette.textMuted} style={styles.input} /><TextInput value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} style={styles.input} /></View>
    <Pressable onPress={load} disabled={loading} style={styles.secondary}><Text style={styles.secondaryText}>{loading ? 'Loading…' : 'Load session'}</Text></Pressable>
    <View style={styles.summary}><Text style={styles.summaryLabel}>Present or tardy</Text><Text style={styles.summaryValue}>{present} / {records.length}</Text></View>
    {records.map((record) => <View key={record.enrollmentId} style={styles.card}><View style={styles.row}><View style={styles.nameBox}><Text style={styles.name}>{record.studentName}</Text><Text style={styles.email}>{record.courseTitle}</Text></View><Pressable onPress={() => cycle(record)} style={styles.status}><Text style={styles.statusText}>{record.status}</Text></Pressable></View><TextInput value={record.notes} onChangeText={(notes) => update(record.enrollmentId, { notes })} placeholder="Optional note" placeholderTextColor={palette.textMuted} style={styles.input} /></View>)}
    <Text style={styles.hint}>Tap a status to cycle: Present → Tardy → Absent → Excused.</Text><Pressable onPress={save} disabled={saving || !records.length} style={[styles.button, (!records.length || saving) && styles.disabled]} accessibilityRole="button"><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save attendance'}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.md},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},filters:{gap:spacing.sm},input:{borderWidth:1,borderColor:palette.border,borderRadius:radii.sm,color:palette.textPrimary,padding:spacing.sm,backgroundColor:palette.surface},secondary:{borderColor:palette.brand,borderWidth:1,borderRadius:radii.md,padding:spacing.sm,alignItems:'center'},secondaryText:{...typography.label,color:palette.brand},summary:{backgroundColor:palette.surfaceMuted,borderRadius:radii.md,padding:spacing.md},summaryLabel:{...typography.label,color:palette.textSecondary},summaryValue:{...typography.display,color:palette.brand,marginTop:spacing.xs},card:{backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:radii.md,padding:spacing.md,gap:spacing.sm},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},nameBox:{flex:1},name:{...typography.subtitle,color:palette.textPrimary},email:{...typography.caption,color:palette.textSecondary},status:{backgroundColor:palette.brand,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderRadius:radii.pill},statusText:{...typography.caption,color:palette.textPrimary},hint:{...typography.caption,color:palette.textMuted},button:{backgroundColor:palette.brand,borderRadius:radii.md,padding:spacing.md,alignItems:'center'},buttonText:{...typography.label,color:palette.textPrimary},disabled:{opacity:.45} });
