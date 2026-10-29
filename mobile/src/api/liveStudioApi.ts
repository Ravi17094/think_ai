import { apiData } from './http';

export type StudioMessage = { id: number; userId: string; userName: string; text: string; timestamp: string; deleted: boolean };
export type StudioPoll = { id: number; question: string; status: string; totalVotes: number; options: Array<{ id: number; text: string; votes: number; percent: number }> };
export type StudioAttendee = { userId: string; name: string; online: boolean; muted: boolean; cameraOn: boolean; raisedHand: boolean };
export type StudioSession = { id: string; title: string; status: string; attendees: StudioAttendee[]; polls: StudioPoll[]; messages: StudioMessage[] };
export type BreakoutRoom = { id: number; name: string; status: string; members: Array<{ userId: string; userName: string }> };

export const joinLiveSession = (id: string) => apiData<StudioSession>(`/studio/sessions/${encodeURIComponent(id)}/join`, { method: 'POST' });
export const getLiveMessages = (id: string) => apiData<StudioMessage[]>(`/studio/sessions/${encodeURIComponent(id)}/messages`);
export const sendLiveMessage = (id: string, text: string) => apiData<StudioMessage>(`/studio/sessions/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { text } });
export const getBreakoutRooms = (id: string) => apiData<BreakoutRoom[]>(`/studio/sessions/${encodeURIComponent(id)}/breakouts`);
export const createBreakoutRoom = (id: string, name: string) => apiData<BreakoutRoom>(`/studio/sessions/${encodeURIComponent(id)}/breakouts`, { method: 'POST', body: { name } });
export const joinBreakoutRoom = (id: number) => apiData<BreakoutRoom>(`/studio/breakouts/${id}/join`, { method: 'POST' });
export const leaveBreakoutRoom = (id: number) => apiData<BreakoutRoom>(`/studio/breakouts/${id}/leave`, { method: 'POST' });
export const voteLivePoll = (pollId: number, optionId: number) => apiData<StudioPoll>(`/studio/polls/${pollId}/vote`, { method: 'POST', body: { optionId } });
export const createLivePoll = (sessionId: string, question: string, options: string[]) => apiData<StudioPoll>(`/studio/sessions/${encodeURIComponent(sessionId)}/polls`, { method: 'POST', body: { question, options } });
