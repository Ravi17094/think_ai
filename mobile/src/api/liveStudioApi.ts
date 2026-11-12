import { apiData } from './http';

export type StudioMessage = { id: number; userId: string; userName: string; text: string; timestamp: string; deleted: boolean };
export type StudioPoll = { id: number; question: string; status: string; totalVotes: number; options: Array<{ id: number; text: string; votes: number; percent: number }> };
export type StudioAttendee = { userId: string; name: string; online: boolean; muted: boolean; cameraOn: boolean; raisedHand: boolean };
export type StudioSession = { id: string; title: string; status: string; attendees: StudioAttendee[]; polls: StudioPoll[]; messages: StudioMessage[] };
export type BreakoutRoom = { id: number; name: string; status: string; members: Array<{ userId: string; userName: string }> };
export type JitsiJoinDetails = { domain: string; room: string; token: string; expiresInSeconds: number };

// The full Live Studio module is mounted by the backend at `/api/live-studio`.
// Keep the common API base at `/api`; only this feature adds its route segment.
const LIVE_STUDIO_PATH = '/live-studio';

export const listLiveSessions = () => apiData<StudioSession[]>(`${LIVE_STUDIO_PATH}/sessions`);
export const createLiveSession = (id: string, title: string, scheduledAt?: string) => apiData<StudioSession>(`${LIVE_STUDIO_PATH}/sessions`, { method: 'POST', body: { id, title, scheduledAt } });
export const joinLiveSession = (id: string) => apiData<StudioSession>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(id)}/join`, { method: 'POST' });
export const getLiveMessages = (id: string) => apiData<StudioMessage[]>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(id)}/messages`);
export const sendLiveMessage = (id: string, text: string) => apiData<StudioMessage>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { text } });
export const getBreakoutRooms = (id: string) => apiData<BreakoutRoom[]>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(id)}/breakouts`);
export const createBreakoutRoom = (id: string, name: string) => apiData<BreakoutRoom>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(id)}/breakouts`, { method: 'POST', body: { name } });
export const joinBreakoutRoom = (id: number) => apiData<BreakoutRoom>(`${LIVE_STUDIO_PATH}/breakouts/${id}/join`, { method: 'POST' });
export const leaveBreakoutRoom = (id: number) => apiData<BreakoutRoom>(`${LIVE_STUDIO_PATH}/breakouts/${id}/leave`, { method: 'POST' });
export const voteLivePoll = (pollId: number, optionId: number) => apiData<StudioPoll>(`${LIVE_STUDIO_PATH}/polls/${pollId}/vote`, { method: 'POST', body: { optionId } });
export const createLivePoll = (sessionId: string, question: string, options: string[]) => apiData<StudioPoll>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(sessionId)}/polls`, { method: 'POST', body: { question, options } });
export const getJitsiJoinDetails = (sessionId: string) => apiData<JitsiJoinDetails>(`${LIVE_STUDIO_PATH}/sessions/${encodeURIComponent(sessionId)}/jitsi-token`, { method: 'POST' });
