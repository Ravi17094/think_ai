import type { RootStackParamList } from "@/navigation/types";

export type AccessAudience = "admin" | "learner" | "account" | "moderation";
export const isAdministrator = (role?: string | null) =>
  ["admin", "superadmin"].includes((role || "").toLowerCase());
export function allowsAudience(audience: AccessAudience, role?: string | null) {
  if (!role) return false;
  if (audience === "admin") return isAdministrator(role);
  if (audience === "learner") return !isAdministrator(role);
  if (audience === "moderation")
    return (
      isAdministrator(role) ||
      ["moderator", "administrator", "moderator:superuser"].includes(
        role.toLowerCase(),
      )
    );
  return true;
}
export const roleHome = (role?: string | null): "AdminHome" | "LmsHome" =>
  isAdministrator(role) ? "AdminHome" : "LmsHome";
export const routeAudience: Partial<
  Record<keyof RootStackParamList, AccessAudience>
> = {
  AdminHome: "admin",
  Analytics: "admin",
  Account: "account",
  LmsHome: "learner",
  CoursePlayer: "learner",
  AssessmentTaking: "learner",
  AssessmentResults: "learner",
  LmsCertificate: "learner",
  Certificate: "learner",
  VideoPlayer: "learner",
  Assessment: "learner",
  Results: "learner",
  PaymentSuccess: "learner",
  PaymentFailed: "learner",
  NotificationPreferences: "account",
  Downloads: "learner",
  CodePlayground: "learner",
  PlaygroundHistory: "learner",
  LearnerProfile: "learner",
  LmsSettings: "learner",
  LearnerDashboard: "learner",
  MyCourses: "learner",
  CourseDetail: "learner",
  Checkout: "learner",
  GlobalSearch: "account",
  ForumHome: "account",
  ForumThread: "account",
  CreatePost: "account",
  Bookmarks: "account",
  Moderation: "moderation",
};
