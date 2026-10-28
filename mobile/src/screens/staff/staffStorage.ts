import AsyncStorage from '@react-native-async-storage/async-storage';

export type AttendanceStatus = 'PRESENT' | 'TARDY' | 'ABSENT' | 'EXCUSED';
export type AttendanceRecord = { id: string; name: string; status: AttendanceStatus; note: string };
export type GradeRecord = { id: string; learner: string; assignment: string; score: number; feedback: string; graded: boolean };

export const ATTENDANCE_KEY = 'thinkz_staff_attendance_v1';
export const GRADES_KEY = 'thinkz_staff_grades_v1';
export const CHECKLIST_KEY = 'thinkz_staff_checklist_v1';
export const RBAC_KEY = 'thinkz_staff_rbac_v1';

export const defaultAttendance: AttendanceRecord[] = [
  { id: 'learner-1', name: 'Demo learner', status: 'PRESENT', note: '' },
  { id: 'learner-2', name: 'Example learner', status: 'ABSENT', note: '' },
];

export const defaultGrades: GradeRecord[] = [
  { id: 'submission-1', learner: 'Demo learner', assignment: 'Variables check', score: 0, feedback: '', graded: false },
  { id: 'submission-2', learner: 'Example learner', assignment: 'Functions exercise', score: 8, feedback: 'Good structure. Add one more test case.', graded: false },
];

export const checklistItems = ['Test microphone', 'Upload slide deck', 'Configure breakout rooms', 'Set poll questions', 'Verify recording enabled'];
export const defaultPermissions = ['view_courses', 'edit_courses', 'view_assessments'];

export async function loadStored<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveStored<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
