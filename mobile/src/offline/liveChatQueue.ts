import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLiveMessage } from '@/api/liveStudioApi';

const KEY = 'thinkz_live_chat_queue';
type QueuedChat = { sessionId: string; text: string; queuedAt: string };
async function read(): Promise<QueuedChat[]> { try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]') as QueuedChat[]; } catch { return []; } }
export async function queueLiveChat(sessionId: string, text: string): Promise<void> { const current = await read(); await AsyncStorage.setItem(KEY, JSON.stringify([...current, { sessionId, text, queuedAt: new Date().toISOString() }].slice(-50))); }
export async function flushLiveChat(sessionId: string): Promise<number> { const current = await read(); const keep: QueuedChat[] = []; let sent = 0; for (const item of current) { if (item.sessionId !== sessionId) { keep.push(item); continue; } try { await sendLiveMessage(item.sessionId, item.text); sent += 1; } catch { keep.push(item); } } await AsyncStorage.setItem(KEY, JSON.stringify(keep)); return sent; }
