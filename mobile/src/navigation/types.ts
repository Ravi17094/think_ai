import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Route + param map for the five assigned pages. */
export type RootStackParamList = {
  SignIn: undefined;
  Login: undefined;
  AdminHome: undefined;
  Account: undefined;
  LmsHome: undefined;
  CoursePlayer: { courseId: number; lessonId?: number };
  AssessmentTaking: { assessmentId: number; enrollmentId: number };
  AssessmentResults: { assessmentId: number; attemptId: number };
  LmsCertificate: { certificateId: number };
  Analytics: undefined;
  CodePlayground: { entry?: import("@/lms/types").HistoryEntry } | undefined;
  PlaygroundHistory: undefined;
  LearnerProfile: undefined;
  LmsSettings: undefined;
  Downloads: undefined;
  LearnerDashboard: undefined;
  MyCourses: undefined;
  CourseDetail: { courseId: string; moduleId?: string };
  GlobalSearch: undefined;
  ForumHome: { categoryId?: string; threadId?: string } | undefined;
  // Pages 6–10.
  ForumThread: { threadId: string };
  CreatePost: undefined;
  Bookmarks: undefined;
  Moderation: undefined;
  Checkout: { courseId?: string; formValues?: Record<string, unknown> } | undefined;
  // Day 3 — Manjunath assigned pages.
  PaymentSuccess:
    | {
        paymentId?: string;
        payment?: unknown;
        formValues?: Record<string, unknown>;
      }
    | undefined;
  PaymentFailed:
    | {
        reason?: 'declined' | 'insufficient_funds' | 'expired' | 'network' | 'unknown';
        errorCode?: string;
        message?: string;
        preserve?: boolean;
        formValues?: Record<string, unknown>;
      }
    | undefined;
  NotificationPreferences: undefined;
  // Cross-module learning journey (E2E).
  VideoPlayer: { courseId: string; lessonId?: string };
  Assessment: { assessmentId: string };
  Results: { assessmentId: string; score: number; passed: boolean };
  Certificate: { courseId: string };
  StaffTools: undefined;
  LiveStudio: undefined;
  AttendanceRegister: undefined;
  AttendanceReport: undefined;
  GradingQueue: undefined;
  InstructorControls: undefined;
  RbacMatrix: undefined;
};

export type ScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;
