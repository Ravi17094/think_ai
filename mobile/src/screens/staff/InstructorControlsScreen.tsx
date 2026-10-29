import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/http';
import { getInstructorControls, saveInstructorControls, type InstructorControls } from '@/api/staffApi';
import { checklistItems } from './staffStorage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const SESSION_ID = 'demo-live-session';
const initialControls: InstructorControls = { muted: false, chatDisabled: false, spotlight: false, recording: false };

export function InstructorControlsScreen() {
  const [done, setDone] = useState<string[]>([]);
  const [controls, setControls] = useState<InstructorControls>(initialControls);
  const [notice, setNotice] = useState('Loading server-saved session preparation…');
  const [saving, setSaving] = useState(false);
  const load = async () => { try { const value = await getInstructorControls(SESSION_ID); setDone(value.checklist); setControls(value.controls); setNotice(value.updatedAt ? 'Loaded the shared server copy.' : 'Start the shared preparation checklist.'); } catch (error) { setNotice(error instanceof ApiError ? error.message : 'Could not load controls.'); } };
  useEffect(() => { void load(); }, []);
  const persist = async (nextDone: string[], nextControls: InstructorControls, label: string) => { setDone(nextDone); setControls(nextControls); setSaving(true); try { await saveInstructorControls(SESSION_ID, nextDone, nextControls); setNotice(`${label} saved for everyone on this session.`); } catch (error) { setNotice(error instanceof ApiError ? error.message : 'Save failed. Tap the change again to retry.'); } finally { setSaving(false); } };
  const toggleCheck = (item: string) => { const next = done.includes(item) ? done.filter((value) => value !== item) : [...done, item]; void persist(next, controls, 'Checklist'); };
  const toggle = (key: keyof InstructorControls, label: string) => { const next = { ...controls, [key]: !controls[key] }; void persist(done, next, label); };
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Instructor controls</Text><Text style={styles.note}>{saving ? 'Saving…' : notice}</Text><Text style={styles.section}>Session preparation</Text>
    {checklistItems.map((item) => <Pressable disabled={saving} key={item} onPress={() => toggleCheck(item)} style={styles.item}><Text style={done.includes(item) ? styles.done : styles.itemText}>{done.includes(item) ? '✓ ' : '○ '}{item}</Text></Pressable>)}<Text style={styles.progress}>{done.length} of {checklistItems.length} checks complete</Text><Text style={styles.section}>Live controls</Text><View style={styles.grid}>
    <Control label={controls.muted ? 'Unmute all' : 'Mute all'} onPress={() => toggle('muted','Mute all')} /><Control label={controls.chatDisabled ? 'Enable chat' : 'Disable chat'} onPress={() => toggle('chatDisabled','Chat')} /><Control label={controls.spotlight ? 'Remove spotlight' : 'Spotlight speaker'} onPress={() => toggle('spotlight','Spotlight')} /><Control label={controls.recording ? 'Stop recording' : 'Start recording'} onPress={() => toggle('recording','Recording')} /></View>
    <Text style={styles.section}>Post-session summary</Text><View style={styles.summary}><Text style={styles.summaryText}>Attendance: available in the attendance register</Text><Text style={styles.summaryText}>Grading: available in the grading queue</Text><Text style={styles.summaryText}>Recording: {controls.recording ? 'recording in progress' : 'not started'}</Text></View>
  </ScrollView></SafeAreaView>;
}
function Control({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.control}><Text style={styles.controlText}>{label}</Text></Pressable>; }
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.sm},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},section:{...typography.subtitle,color:palette.textPrimary,marginTop:spacing.md},item:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:radii.sm,padding:spacing.md},itemText:{...typography.body,color:palette.textPrimary},done:{...typography.body,color:palette.success,textDecorationLine:'line-through'},progress:{...typography.caption,color:palette.brand},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},control:{width:'48%',minHeight:64,justifyContent:'center',padding:spacing.sm,borderRadius:radii.md,backgroundColor:palette.surfaceMuted},controlText:{...typography.label,color:palette.brand},summary:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:radii.md,padding:spacing.md,gap:spacing.xs},summaryText:{...typography.body,color:palette.textSecondary}});
