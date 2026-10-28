import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { ATTENDANCE_KEY, type AttendanceRecord, type AttendanceStatus, defaultAttendance, loadStored, saveStored } from './staffStorage';

const statusOrder: AttendanceStatus[] = ['PRESENT', 'TARDY', 'ABSENT', 'EXCUSED'];
export function AttendanceRegisterScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>(defaultAttendance); const [ready, setReady] = useState(false); const [notice, setNotice] = useState('Loading attendance register…');
  useEffect(() => { loadStored(ATTENDANCE_KEY, defaultAttendance).then((data) => { setRecords(data); setReady(true); setNotice('Attendance is ready to record.'); }); }, []);
  const present = useMemo(() => records.filter((item) => item.status === 'PRESENT' || item.status === 'TARDY').length, [records]);
  const cycle = (id: string) => setRecords((items) => items.map((item) => item.id === id ? { ...item, status: statusOrder[(statusOrder.indexOf(item.status) + 1) % statusOrder.length]! } : item));
  const setNote = (id: string, note: string) => setRecords((items) => items.map((item) => item.id === id ? { ...item, note } : item));
  const save = async () => { await saveStored(ATTENDANCE_KEY, records); setNotice('Attendance saved on this device.'); };
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Attendance register</Text><Text style={styles.note}>{notice}</Text><View style={styles.summary}><Text style={styles.summaryLabel}>Attendance today</Text><Text style={styles.summaryValue}>{present} / {records.length}</Text></View>
    {records.map((record) => <View key={record.id} style={styles.card}><View style={styles.row}><Text style={styles.name}>{record.name}</Text><Pressable onPress={() => cycle(record.id)} style={styles.status}><Text style={styles.statusText}>{record.status}</Text></Pressable></View><TextInput value={record.note} onChangeText={(note) => setNote(record.id, note)} placeholder="Optional note" placeholderTextColor={palette.textMuted} style={styles.input} editable={ready} /></View>)}
    <Text style={styles.hint}>Tap a status to cycle: Present → Tardy → Absent → Excused.</Text><Pressable onPress={save} style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>Save attendance</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.md},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},summary:{backgroundColor:palette.surfaceMuted,borderRadius:radii.md,padding:spacing.md},summaryLabel:{...typography.label,color:palette.textSecondary},summaryValue:{...typography.display,color:palette.brand,marginTop:spacing.xs},card:{backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:radii.md,padding:spacing.md,gap:spacing.sm},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},name:{...typography.subtitle,color:palette.textPrimary},status:{backgroundColor:palette.brand,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderRadius:radii.pill},statusText:{...typography.caption,color:palette.textPrimary},input:{borderWidth:1,borderColor:palette.border,borderRadius:radii.sm,color:palette.textPrimary,padding:spacing.sm},hint:{...typography.caption,color:palette.textMuted},button:{backgroundColor:palette.brand,borderRadius:radii.md,padding:spacing.md,alignItems:'center'},buttonText:{...typography.label,color:palette.textPrimary} });
