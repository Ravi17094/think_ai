import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/http';
import { flushLiveChat, queueLiveChat } from '@/offline/liveChatQueue';
import { BreakoutRoom, StudioMessage, StudioSession, createBreakoutRoom, createLivePoll, getBreakoutRooms, getLiveMessages, joinBreakoutRoom, joinLiveSession, leaveBreakoutRoom, sendLiveMessage, voteLivePoll } from '@/api/liveStudioApi';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const SESSION_ID = 'demo-live-session';
const messageTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function LiveStudioScreen() {
  const [session, setSession] = useState<StudioSession | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [message, setMessage] = useState('');
  const [roomName, setRoomName] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('Yes,No');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [joined, nextMessages, nextRooms] = await Promise.all([joinLiveSession(SESSION_ID), getLiveMessages(SESSION_ID), getBreakoutRooms(SESSION_ID)]);
      const flushed = await flushLiveChat(SESSION_ID);
      setSession(joined); setMessages(nextMessages); setRooms(nextRooms); setError(flushed ? `${flushed} queued chat message${flushed === 1 ? '' : 's'} sent.` : null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reconnect to Live Studio.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 8000); return () => clearInterval(timer); }, [refresh]);

  const send = async () => {
    const text = message.trim(); if (!text) return;
    setSending(true);
    try { const created = await sendLiveMessage(SESSION_ID, text); setMessages((current) => [...current, created]); setMessage(''); } catch (caught) { if (caught instanceof ApiError && caught.status === 0) { await queueLiveChat(SESSION_ID, text); setMessage(''); setError('You are offline. Message queued and will send on reconnect.'); } else { setError(caught instanceof ApiError ? caught.message : 'Message was not sent.'); } } finally { setSending(false); }
  };
  const makeRoom = async () => { if (!roomName.trim()) return; try { await createBreakoutRoom(SESSION_ID, roomName.trim()); setRoomName(''); await refresh(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not create room.'); } };
  const makePoll = async () => { const options = pollOptions.split(',').map((item) => item.trim()).filter(Boolean); if (!pollQuestion.trim() || options.length < 2) { setError('Enter a question and two comma-separated options.'); return; } try { await createLivePoll(SESSION_ID, pollQuestion, options); setPollQuestion(''); await refresh(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not create poll.'); } };
  const vote = async (pollId: number, optionId: number) => { try { await voteLivePoll(pollId, optionId); await refresh(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Vote was not saved.'); } };
  const roomAction = async (room: BreakoutRoom) => { try { if (room.members.length) await leaveBreakoutRoom(room.id); else await joinBreakoutRoom(room.id); await refresh(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not update breakout room.'); } };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={palette.brand} /><Text style={styles.muted}>Connecting to Live Studio…</Text></SafeAreaView>;
  return <SafeAreaView edges={['left', 'right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.hero}><Text style={styles.kicker}>LIVE • {session?.status?.toUpperCase() ?? 'RECONNECTING'}</Text><Text style={styles.title}>{session?.title ?? 'Live class'}</Text><Text style={styles.muted}>{session?.attendees.filter((person) => person.online).length ?? 0} attendees online · refreshes automatically</Text></View>
    {error ? <Pressable style={styles.error} onPress={() => void refresh()}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}
    <View style={styles.video}><Text style={styles.videoTitle}>Video room</Text><Text style={styles.muted}>Jitsi video opens when the server has JITSI_DOMAIN, JITSI_APP_ID and JITSI_JWT_SECRET configured.</Text></View>
    <Section title="Attendees"><View style={styles.chips}>{session?.attendees.map((person) => <Text key={person.userId} style={styles.chip}>{person.online ? '●' : '○'} {person.name}</Text>)}</View></Section>
    <Section title="Chat"><View style={styles.chat}>{messages.slice(-8).map((item) => <View key={item.id} style={styles.message}><Text style={styles.messageName}>{item.userName} <Text style={styles.time}>{messageTime(item.timestamp)}</Text></Text><Text style={styles.messageText}>{item.deleted ? 'Message removed' : item.text}</Text></View>)}</View><View style={styles.row}><TextInput value={message} onChangeText={setMessage} placeholder="Send message" placeholderTextColor={palette.textMuted} style={styles.input} /><Pressable onPress={() => void send()} disabled={sending} style={styles.button}><Text style={styles.buttonText}>{sending ? '…' : 'Send'}</Text></Pressable></View></Section>
    <Section title="Polls">{session?.polls.length ? session.polls.map((poll) => <View key={poll.id} style={styles.subcard}><Text style={styles.cardTitle}>{poll.question}</Text>{poll.options.map((option) => <Pressable key={option.id} onPress={() => void vote(poll.id, option.id)} style={styles.option}><Text style={styles.optionText}>{option.text}</Text><Text style={styles.muted}>{option.percent}%</Text></Pressable>)}</View>) : <Text style={styles.muted}>No active polls.</Text>}<TextInput value={pollQuestion} onChangeText={setPollQuestion} placeholder="New poll question" placeholderTextColor={palette.textMuted} style={styles.input} /><TextInput value={pollOptions} onChangeText={setPollOptions} placeholder="Option 1, Option 2" placeholderTextColor={palette.textMuted} style={styles.input} /><Pressable onPress={() => void makePoll()} style={styles.secondary}><Text style={styles.secondaryText}>Create poll</Text></Pressable></Section>
    <Section title="Breakout rooms">{rooms.map((room) => <View key={room.id} style={styles.option}><View><Text style={styles.cardTitle}>{room.name}</Text><Text style={styles.muted}>{room.members.length} members</Text></View><Pressable onPress={() => void roomAction(room)} style={styles.secondary}><Text style={styles.secondaryText}>{room.members.length ? 'Leave' : 'Join'}</Text></Pressable></View>)}<View style={styles.row}><TextInput value={roomName} onChangeText={setRoomName} placeholder="New room name" placeholderTextColor={palette.textMuted} style={styles.input} /><Pressable onPress={() => void makeRoom()} style={styles.button}><Text style={styles.buttonText}>Add</Text></Pressable></View></Section>
  </ScrollView></SafeAreaView>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: palette.background }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.background }, content: { padding: spacing.md, gap: spacing.md }, hero: { gap: spacing.xs }, kicker: { ...typography.caption, color: palette.success, letterSpacing: 1 }, title: { ...typography.title, color: palette.textPrimary }, muted: { ...typography.body, color: palette.textSecondary }, video: { backgroundColor: '#050814', borderRadius: radii.lg, padding: spacing.lg, minHeight: 108, justifyContent: 'center', gap: spacing.sm, borderColor: palette.border, borderWidth: 1 }, videoTitle: { ...typography.subtitle, color: palette.textPrimary }, section: { backgroundColor: palette.surface, padding: spacing.md, borderRadius: radii.lg, gap: spacing.sm, borderColor: palette.border, borderWidth: 1 }, sectionTitle: { ...typography.subtitle, color: palette.textPrimary }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, chip: { ...typography.caption, backgroundColor: palette.surfaceMuted, color: palette.textPrimary, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, chat: { gap: spacing.sm }, message: { borderLeftColor: palette.brand, borderLeftWidth: 2, paddingLeft: spacing.sm }, messageName: { ...typography.label, color: palette.textPrimary }, time: { color: palette.textMuted, fontWeight: '400' }, messageText: { ...typography.body, color: palette.textSecondary }, row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }, input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, color: palette.textPrimary, paddingHorizontal: spacing.sm, ...typography.body }, button: { minHeight: 44, borderRadius: radii.md, paddingHorizontal: spacing.md, justifyContent: 'center', backgroundColor: palette.brand }, buttonText: { ...typography.label, color: palette.textPrimary }, subcard: { gap: spacing.xs, borderTopWidth: 1, borderColor: palette.border, paddingTop: spacing.sm }, cardTitle: { ...typography.label, color: palette.textPrimary }, option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }, optionText: { ...typography.body, color: palette.textPrimary, flex: 1 }, secondary: { borderWidth: 1, borderColor: palette.brand, borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, secondaryText: { ...typography.label, color: palette.brand }, error: { backgroundColor: 'rgba(248,113,113,0.14)', borderRadius: radii.md, padding: spacing.sm }, errorText: { ...typography.body, color: palette.danger } });
