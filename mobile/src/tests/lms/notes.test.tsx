import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Notes } from "@/lms/screens/CoursePlayerScreen";
import { lmsApi } from "@/lms/api";
import { storageKey } from "@/lms/storage";
let mockOnline = true;
jest.mock("@/lms/LmsProvider", () => ({
  useLms: () => ({
    session: { userId: "patan", token: "test" },
    online: mockOnline,
  }),
}));
jest.mock("@/lms/api", () => ({
  lmsApi: { note: jest.fn(), saveNote: jest.fn() },
}));
jest.mock("expo-av", () => ({
  Video: "Video",
  ResizeMode: { CONTAIN: "contain" },
}));
jest.mock("@/lms/downloads", () => ({
  downloadLesson: jest.fn(),
  localVideo: jest.fn(),
}));
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockOnline = true;
  (lmsApi.note as jest.Mock).mockResolvedValue({ text: "" });
  (lmsApi.saveNote as jest.Mock).mockResolvedValue({ text: "Note" });
});
test("empty notes finish loading and become editable, then save on blur", async () => {
  const screen = render(<Notes enrollmentId={2} lessonId={1} />);
  const field = screen.getByLabelText(
    "Your notes (save when leaving the field)",
  );
  await waitFor(() => expect(field.props.editable).toBe(true));
  fireEvent.changeText(field, "My new note");
  fireEvent(field, "blur");
  await waitFor(() =>
    expect(lmsApi.saveNote).toHaveBeenCalledWith(2, 1, "My new note"),
  );
  await waitFor(() => expect(screen.getByText("Notes saved")).toBeTruthy());
  screen.unmount();
});
test("offline notes save to account-scoped storage and remain dirty for reconnect", async () => {
  mockOnline = false;
  const screen = render(<Notes enrollmentId={2} lessonId={1} />);
  const field = screen.getByLabelText(
    "Your notes (save when leaving the field)",
  );
  await waitFor(() => expect(field.props.editable).toBe(true));
  fireEvent.changeText(field, "Offline note");
  fireEvent(field, "blur");
  await waitFor(async () =>
    expect(
      JSON.parse(
        (await AsyncStorage.getItem(storageKey("patan", "note:2:1"))) || "{}",
      ),
    ).toEqual({ text: "Offline note", dirty: true }),
  );
  expect(lmsApi.saveNote).not.toHaveBeenCalled();
  screen.unmount();
});
