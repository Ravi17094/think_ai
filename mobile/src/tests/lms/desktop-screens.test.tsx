// Adapted from the supplied Desktop coreScreens/portalScreens cases to current LMS types.
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AssessmentResultsScreen } from "@/lms/screens/ResultsScreen";
import { CertificateScreen } from "@/lms/screens/CertificateScreen";
import { LearnerProfileScreen } from "@/lms/screens/ProfileScreen";
import { lmsApi } from "@/lms/api";
import { captureRef } from "react-native-view-shot";
import { shareCertificatePdf, shareCertificatePng } from "@/lms/certificateShare";
import type { AssessmentResult, Certificate, Profile } from "@/lms/types";
jest.mock("@/lms/LmsProvider", () => ({ useLms: () => ({
  session: { userId: "1", token: "test-token" }, online: true, ready: true,
  account: { role: "Learner" }, syncStatus: "Up to date",
}) }));
jest.mock("@/lms/api", () => ({ lmsApi: { result: jest.fn(), certificate: jest.fn(), profile: jest.fn() } }));
jest.mock("react-native-webview", () => ({ WebView: "WebView" }));
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn() }));
jest.mock("@/lms/certificateShare", () => ({
  shareCertificatePdf: jest.fn(), shareCertificatePng: jest.fn(),
  copyCertificateLink: jest.fn(), shareCertificateLink: jest.fn(),
}));
const navigation = { navigate: jest.fn(), replace: jest.fn() };
const props = (name: string, params: unknown = {}) => ({ navigation, route: { name, key: name, params } }) as any;
const result = (change: Partial<AssessmentResult> = {}): AssessmentResult => ({
  attemptId: 1, assessmentId: 2, title: "State quiz", status: "GRADED", score: 8,
  totalMarks: 10, percentage: 80, passed: true, canRetake: true, enrollmentId: 3,
  certificateEligible: true, certificateId: 7,
  questions: [{ id: 1, text: "State question", explanation: "State persists between renders.",
    selectedAnswer: "useState", correctAnswer: "useState", flagged: true, marks: 10, marksObtained: 8 }],
  ...change,
});
const certificate: Certificate = { id: 7, certificateNo: "CERT-EXISTING-STYLE", studentName: "Learner",
  courseName: "React course", issuedAt: "2026-10-27T12:00:00Z", pdfUrl: "https://files.invalid/certificate.pdf" };
const profile: Profile = { user: { id: 1, name: "Learner", email: "learner@example.invalid", role: "Learner" },
  stats: { coursesCompleted: 2, certificatesEarned: 1, totalHours: 12.5 }, certificates: [certificate],
  activity: [{ type: "lesson", text: "Completed React lesson", at: "2026-10-27T12:00:00Z" }] };
beforeEach(() => {
  jest.clearAllMocks();
  (lmsApi.result as jest.Mock).mockResolvedValue(result());
  (lmsApi.certificate as jest.Mock).mockResolvedValue(certificate);
  (lmsApi.profile as jest.Mock).mockResolvedValue(profile);
  (captureRef as jest.Mock).mockResolvedValue("file:///generated-preview.png");
  (shareCertificatePdf as jest.Mock).mockResolvedValue(undefined);
  (shareCertificatePng as jest.Mock).mockResolvedValue(undefined);
});
test("results render actual score, verdict, answer explanations, flags and conditional actions", async () => {
  const view = render(<AssessmentResultsScreen {...props("AssessmentResults", { attemptId: 1 })} />);
  await waitFor(() => expect(view.getByText("80.0% · Passed")).toBeTruthy());
  expect(view.getAllByText("8.0 / 10")).toHaveLength(2);
  expect(view.getByText("Your answer: useState")).toBeTruthy();
  expect(view.getByText("Correct answer: useState")).toBeTruthy();
  expect(view.getByText("State persists between renders.")).toBeTruthy();
  expect(view.getByText("⚑ State question")).toBeTruthy();
  fireEvent.press(view.getByText("Retake assessment"));
  expect(navigation.replace).toHaveBeenCalledWith("AssessmentTaking", { assessmentId: 2, enrollmentId: 3 });
  fireEvent.press(view.getByText("View certificate"));
  expect(navigation.navigate).toHaveBeenCalledWith("LmsCertificate", { certificateId: 7 });
});
test("failed scores hide forbidden retake and certificate actions and render the empty flagged section", async () => {
  (lmsApi.result as jest.Mock).mockResolvedValue(result({ score: 0, percentage: 0, passed: false,
    canRetake: false, certificateEligible: false, certificateId: null,
    questions: result().questions.map(question => ({ ...question, flagged: false, marksObtained: 0 })) }));
  const view = render(<AssessmentResultsScreen {...props("AssessmentResults", { attemptId: 1 })} />);
  await waitFor(() => expect(view.getByText("0.0% · Not passed")).toBeTruthy());
  expect(view.getByText("No questions were flagged.")).toBeTruthy();
  for (const text of ["Retake assessment", "View certificate", "Generate certificate"]) expect(view.queryByText(text)).toBeNull();
});
test("results polling refreshes a grading attempt and stops at a terminal result", async () => {
  (lmsApi.result as jest.Mock).mockResolvedValueOnce(result({ status: "GRADING" })).mockResolvedValue(result());
  const view = render(<AssessmentResultsScreen {...props("AssessmentResults", { attemptId: 1 })} />);
  await waitFor(() => expect(view.getByText("Your answers are being graded")).toBeTruthy());
  await act(async () => { jest.advanceTimersByTime(2000); await Promise.resolve(); });
  await waitFor(() => expect(view.getByText("80.0% · Passed")).toBeTruthy());
  const calls = (lmsApi.result as jest.Mock).mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(lmsApi.result).toHaveBeenCalledTimes(calls);
});
test("certificate metadata and actual PDF preview URL render and PDF download invokes the adapter", async () => {
  const view = render(<CertificateScreen {...props("LmsCertificate", { certificateId: 7 })} />);
  await waitFor(() => expect(view.getByText(certificate.certificateNo)).toBeTruthy());
  expect(view.getByText(certificate.courseName)).toBeTruthy();
  expect(view.getByText(`Issued ${new Date(certificate.issuedAt).toLocaleDateString()}`)).toBeTruthy();
  const preview = view.UNSAFE_getByType("WebView" as any);
  expect(preview.props.source.html).toContain(certificate.pdfUrl);
  expect(preview.props.source.html).toContain("pdf.getPage(1)");
  fireEvent.press(view.getByText("Save / share PDF"));
  await waitFor(() => expect(shareCertificatePdf).toHaveBeenCalledWith(certificate));
});
test("PNG action generates an image before sharing and displays capture failures", async () => {
  const view = render(<CertificateScreen {...props("LmsCertificate", { certificateId: 7 })} />);
  await waitFor(() => expect(view.getByText(certificate.certificateNo)).toBeTruthy());
  fireEvent.press(view.getByText("Share PNG preview"));
  await waitFor(() => expect(shareCertificatePng).toHaveBeenCalledWith("file:///generated-preview.png"));
  expect(captureRef).toHaveBeenCalledWith(expect.anything(), { format: "png", quality: 1 });
  (captureRef as jest.Mock).mockRejectedValueOnce(new Error("Preview capture failed"));
  fireEvent.press(view.getByText("Share PNG preview"));
  await waitFor(() => expect(view.getByText("Preview capture failed")).toBeTruthy());
  expect(shareCertificatePng).toHaveBeenCalledTimes(1);
});
test("profile displays identity, statistics, activity and the existing settings navigation", async () => {
  const view = render(<LearnerProfileScreen {...props("LearnerProfile")} />);
  await waitFor(() => expect(view.getByText(profile.user.email)).toBeTruthy());
  for (const text of ["2 courses completed", "1 certificates earned", "12.5 total hours", "Completed React lesson"]) expect(view.getByText(text)).toBeTruthy();
  expect(view.getByLabelText("Profile avatar")).toBeTruthy();
  fireEvent.press(view.getByText("Edit profile"));
  expect(navigation.navigate).toHaveBeenCalledWith("LmsSettings");
});
