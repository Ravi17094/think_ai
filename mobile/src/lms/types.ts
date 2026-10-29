export type Language = "python" | "javascript" | "java" | "cpp";
export interface Lesson {
  id: number;
  title: string;
  videoUrl: string | null;
  content?: string;
  durationSeconds: number;
  completionThreshold: number;
  videoBytes?: number | null;
  order: number;
}
export interface AssessmentSummary {
  id: number;
  title: string;
  duration: number | null;
  status: string;
}
export interface Module {
  id: number;
  title: string;
  order: number;
  lessons: Lesson[];
  assessments: AssessmentSummary[];
}
export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail?: string | null;
  modules: Module[];
}
export interface Progress {
  lessonId: number;
  enrollmentId: number;
  watchedSeconds: number;
  totalDuration: number;
  completed: boolean;
  watchPercentage: number;
  updatedAt: string;
}
export interface Completion {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  eligible: boolean;
}
export interface Enrollment {
  id: number;
  courseAccess: boolean;
  enrollmentStatus: string;
  batch: { course: Course };
  summary: Completion;
}
export interface PlayerData {
  course: Course;
  enrollmentId: number;
  progress: Progress[];
  summary: Completion;
}
export interface Question {
  id: number;
  questionText: string;
  questionType: "MCQ" | "CODING";
  marks: number;
  options: { id: number; optionText: string }[];
  supportedLanguages?: Language[];
  starterCode?: Partial<Record<Language, string>>;
  examples?: { input: string; output: string }[];
}
export interface Answer {
  questionId: number;
  selectedOptionId?: number;
  code?: string;
  language?: Language;
}
export interface Attempt {
  attemptId: number;
  startedAt: string;
  expiresAt: string;
  serverTime: string;
  assessment: { id: number; title: string; questions: Question[] };
}
export interface Draft {
  attemptId: number;
  expiresAt: string;
  answers: Record<string, Answer>;
  flags: number[];
  savedAt: string;
}
export interface AssessmentResult {
  attemptId: number;
  assessmentId: number;
  title: string;
  status: string;
  error?: string;
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  passed: boolean;
  canRetake: boolean;
  enrollmentId: number;
  certificateEligible: boolean;
  certificateId: number | null;
  questions: {
    id: number;
    text: string;
    explanation: string | null;
    selectedAnswer: string;
    correctAnswer: string;
    flagged: boolean;
    marks: number;
    marksObtained: number;
  }[];
}
export interface Certificate {
  id: number;
  certificateNo: string;
  studentName: string;
  courseName: string;
  issuedAt: string;
  pdfUrl: string;
  storage?: "local" | "s3";
}
export interface Execution {
  language: Language;
  results: {
    status: string;
    statusId: number;
    stdout: string;
    stderr: string;
    compileOutput: string;
    passed: boolean | null;
    time: string;
    memory: number;
  }[];
}
export interface HistoryEntry {
  id: string;
  language: Language;
  code: string;
  input?: string;
  expectedOutput?: string;
  output: string;
  timestamp: string;
}
export interface Profile {
  user: { id: number; name: string | null; email: string; role: string };
  stats: {
    coursesCompleted: number;
    certificatesEarned: number;
    totalHours: number;
  };
  activity: { type: string; text: string; at: string }[];
  certificates: Certificate[];
}
export type AnalyticsBucket = "daily" | "weekly" | "monthly" | "quarterly";
export interface ReportStatus {
  enabled: boolean;
  configured: boolean;
  cadence: "weekly" | "monthly" | "quarterly";
  utcHour: number;
  recipientCount: number;
  recent: {
    id: number;
    periodKey: string;
    status: string;
    attempts: number;
    sentAt: string | null;
  }[];
}
export interface Analytics {
  attendance?: {
    status: string;
    source: string;
    eligible: number | null;
    attended: number | null;
    excused: number | null;
  };
  counts?: { completedEnrollments: number; gradedAttempts: number };
  kpis: {
    enrollmentCount: number;
    completionRate: number;
    averageScore: number;
    activeUsers: number;
    attendancePercentage?: number | null;
  };
  trend: { date: string; count: number }[];
  courses: {
    id: number;
    title: string;
    enrollments: number;
    completed: number;
  }[];
}
export interface Download {
  lessonId: number;
  title: string;
  courseId: number;
  uri: string;
  bytes: number;
  status: "downloading" | "complete";
  timestamp: string;
}
export interface ProgressUpdate {
  lessonId: number;
  enrollmentId: number;
  watchedSeconds: number;
  updatedAt: string;
  baseVersion: string | null;
}
