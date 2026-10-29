import { apiData, apiRequest } from './http';

export type AttendanceStatus = 'PRESENT' | 'TARDY' | 'ABSENT' | 'EXCUSED';

export type AttendanceRecord = {
  enrollmentId: number;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  status: AttendanceStatus;
  notes: string;
};

export type RbacMatrix = {
  roles: string[];
  permissions: string[];
  grants: Record<string, string[]>;
  inheritance?: Record<string, string | null>;
};

export type GradingSubmission = {
  id: number;
  assessmentTitle: string;
  learnerName: string;
  learnerEmail: string;
  score: number | null;
  totalMarks: number;
  feedback: string | null;
  submittedAt: string;
  status: string;
};

export function getAttendanceRegister(sessionDate: string, sessionTitle: string) {
  return apiData<AttendanceRecord[]>('/attendance/ta/register', {
    query: { sessionDate, sessionTitle },
  });
}

export type AttendanceReportRow = { studentName: string; studentEmail: string; courseTitle: string; sessionDate: string; sessionTitle: string; status: AttendanceStatus; notes: string };
export function getAttendanceReport(from?: string, to?: string, status?: string) {
  return apiData<AttendanceReportRow[]>('/attendance/ta/attendance-report', { query: { from, to, status } });
}

export function saveAttendance(record: AttendanceRecord, sessionDate: string, sessionTitle: string) {
  return apiRequest('/attendance/ta/record', {
    method: 'PUT',
    body: {
      enrollmentId: record.enrollmentId,
      status: record.status,
      notes: record.notes,
      sessionDate,
      sessionTitle,
    },
  });
}

export function getRbacMatrix() {
  return apiRequest<RbacMatrix>('/roles/matrix').then((response) => ({
    roles: response.roles as string[],
    permissions: response.permissions as string[],
    grants: response.grants as Record<string, string[]>,
    inheritance: response.inheritance as Record<string, string | null> | undefined,
  }));
}

export function saveRbacPermission(role: string, permission: string, granted: boolean) {
  return apiRequest(`/roles/${encodeURIComponent(role)}/permissions/${encodeURIComponent(permission)}`, {
    method: 'PATCH',
    body: { granted },
  });
}

export function getGradingQueue() {
  return apiData<GradingSubmission[]>('/ta/grading-queue');
}

export function gradeSubmission(submissionId: number, score: number, feedback: string) {
  return apiData<GradingSubmission>(`/ta/submissions/${submissionId}/grade`, {
    method: 'PATCH',
    body: { score, feedback },
  });
}

export function bulkGradeSubmissions(submissions: Array<{ id: number; score: number; feedback: string }>) {
  return apiData<GradingSubmission[]>('/ta/submissions/bulk-grade', { method: 'POST', body: { submissions } });
}

export type InstructorControls = { muted: boolean; chatDisabled: boolean; spotlight: boolean; recording: boolean };
export type InstructorControlState = { checklist: string[]; controls: InstructorControls; updatedAt: string | null };
export const getInstructorControls = (sessionId: string) => apiData<InstructorControlState>(`/instructor-controls/${encodeURIComponent(sessionId)}`);
export const saveInstructorControls = (sessionId: string, checklist: string[], controls: InstructorControls) => apiData<InstructorControlState>(`/instructor-controls/${encodeURIComponent(sessionId)}`, { method: 'PUT', body: { checklist, controls } });
