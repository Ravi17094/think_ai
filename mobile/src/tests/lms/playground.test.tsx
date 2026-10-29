import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { Button } from "react-native";
import { CodePlaygroundScreen, PlaygroundHistoryScreen, starter } from "@/lms/screens/PlaygroundScreen";
import { lmsApi } from "@/lms/api";
import { appendHistory, loadHistory } from "@/lms/storage";
import type { Execution, HistoryEntry, Language } from "@/lms/types";

let mockSession = { userId: "patan", token: "learner-token" };
let mockOnline = true;
let mockFocused = true;
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => mockFocused }));
jest.mock("@/lms/LmsProvider", () => ({
  useLms: () => ({ session: mockSession, online: mockOnline, ready: true, syncStatus: "", account: { role: "Learner" } }),
}));
jest.mock("@/lms/api", () => ({ lmsApi: { execute: jest.fn() } }));
jest.mock("@/lms/CodeEditor", () => ({
  CodeEditor: ({ code, onChange, editable }: any) => {
    const React = require("react");
    const { TextInput } = require("react-native");
    return React.createElement(TextInput, { accessibilityLabel: "Source code", value: code, onChangeText: onChange, editable });
  },
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const result = (overrides: Partial<Execution["results"][number]> = {}): Execution => ({
  language: "python",
  results: [{ status: "Accepted", statusId: 3, stdout: "42\n", stderr: "", compileOutput: "", passed: null, time: "0.01", memory: 1024, ...overrides }],
});
const navigation = { navigate: jest.fn(), setParams: jest.fn() };
const route = (entry?: HistoryEntry) => ({ key: "playground", name: "CodePlayground" as const, params: entry ? { entry } : undefined });
const view = (entry?: HistoryEntry) => <CodePlaygroundScreen route={route(entry)} navigation={navigation as any} />;
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockSession = { userId: "patan", token: "learner-token" };
  mockOnline = true;
  mockFocused = true;
  (lmsApi.execute as jest.Mock).mockResolvedValue(result());
});

test.each<Language>(["python", "javascript", "java", "cpp"])(
  "%s run passes source/stdin/expected and captured token to the API and records the result",
  async (language) => {
    const screen = render(view());
    fireEvent.press(screen.getByText(language));
    expect(screen.getByLabelText("Source code").props.value).toBe(starter[language]);
    fireEvent.changeText(screen.getByLabelText("Source code"), "source for test");
    fireEvent.changeText(screen.getByLabelText("Test input (stdin)"), "21\n");
    fireEvent.changeText(screen.getByLabelText("Expected output (optional)"), "42");
    fireEvent.press(screen.getByText("Run code"));
    await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
    expect(lmsApi.execute).toHaveBeenCalledWith(language, "source for test", "21\n", "42", "learner-token");
    expect(screen.getByText("Accepted\n42\n")).toBeTruthy();
    expect(await loadHistory("patan")).toEqual([
      expect.objectContaining({ language, code: "source for test", input: "21\n", expectedOutput: "42", output: "Accepted\n42\n" }),
    ]);
  },
);

test.each([
  ["python", "input()"],
  ["javascript", "fs.readFileSync(0"],
  ["java", "Scanner(System.in)"],
  ["cpp", "std::cin"],
] as const)("%s explains where to provide input before running", (language, inputMethod) => {
  const screen = render(view());
  fireEvent.press(screen.getByText(language));
  expect(screen.getByText(inputMethod, { exact: false }).props.children).toContain("Test input (stdin) before Run code");
  expect(screen.getByText("Output is read-only. Programs cannot receive more input while running.")).toBeTruthy();
  expect(screen.getByLabelText("Expected output (optional)")).toBeTruthy();
  if (language === "java") expect(screen.getByText(/Main class with public static void main/)).toBeTruthy();
});

test.each([
  ["python", 'print("Ready")'],
  ["javascript", 'console.log("Ready");'],
  ["java", 'class Main { public static void main(String[] args) { System.out.println("Ready"); } }'],
  ["cpp", '#include <iostream>\nint main() { std::cout << "Ready" << std::endl; }'],
  ["python", 'try:\n    print(input())\nexcept EOFError:\n    print("Ready")'],
] as const)("%s programs can run with empty stdin, including code that handles EOF", async (language, source) => {
  (lmsApi.execute as jest.Mock).mockResolvedValue(result({ stdout: "Ready\n" }));
  const screen = render(view());
  fireEvent.press(screen.getByText(language));
  fireEvent.changeText(screen.getByLabelText("Source code"), source);
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Accepted\nReady\n")).toBeTruthy());
  expect(lmsApi.execute).toHaveBeenCalledWith(language, source, "", undefined, "learner-token");
});

test.each(["", "5\n"])("Python EOF preserves the traceback and helps with missing input %j without inventing values or output", async (stdin) => {
  const source = 'first = int(input())\nsecond = int(input())\nprint(first + second)';
  const traceback = 'Traceback (most recent call last):\n  File "main.py", line 2, in <module>\n    second = int(input())\nEOFError: EOF when reading a line\n';
  (lmsApi.execute as jest.Mock).mockResolvedValue(result({
    status: "Runtime Error (NZEC)", statusId: 11, stdout: "", stderr: traceback, passed: false,
  }));
  const screen = render(view());
  fireEvent.changeText(screen.getByLabelText("Source code"), source);
  fireEvent.changeText(screen.getByLabelText("Test input (stdin)"), stdin);
  fireEvent.changeText(screen.getByLabelText("Expected output (optional)"), "10");
  fireEvent.press(screen.getByText("Run code"));
  const help = "Input ended before Python could finish reading. If your program uses input(), enter all required values in Test input (stdin), one line per input() call, then Run code again. Output cannot accept input.";
  const output = `Runtime Error (NZEC)\n${traceback}\n${help}`;
  await waitFor(() => expect(screen.getByText(output)).toBeTruthy());
  expect(lmsApi.execute).toHaveBeenCalledWith("python", source, stdin, "10", "learner-token");
  expect(screen.queryByText(/Expected output did not match/)).toBeNull();
  expect(await loadHistory("patan")).toEqual([expect.objectContaining({ code: source, input: stdin, output })]);
});

test.each([
  ["python", { stdout: "EOFError: text printed by the program\n" }],
  ["python", { stderr: "EOFError: caught and printed\n" }],
  ["python", { status: "Runtime Error", statusId: 11, stdout: "EOFError\n", stderr: "ValueError: bad value\n" }],
  ["javascript", { status: "Runtime Error", statusId: 11, stderr: "EOFError: example\n" }],
] as const)("%s only receives Python missing-input help for a failed Python runtime stderr", async (language, execution) => {
  (lmsApi.execute as jest.Mock).mockResolvedValue(result(execution));
  const screen = render(view());
  fireEvent.press(screen.getByText(language));
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
  expect(screen.queryByText(/Input ended before Python could finish reading/)).toBeNull();
});

test("language selection preserves each language's edits and never resets the selected language", () => {
  const screen = render(view());
  fireEvent.changeText(screen.getByLabelText("Source code"), "my python draft");
  fireEvent.changeText(screen.getByLabelText("Test input (stdin)"), "python input");
  fireEvent.press(screen.getByText("python"));
  expect(screen.getByLabelText("Source code").props.value).toBe("my python draft");
  fireEvent.press(screen.getByText("javascript"));
  fireEvent.changeText(screen.getByLabelText("Source code"), "my JS draft");
  fireEvent.press(screen.getByText("python"));
  expect(screen.getByLabelText("Source code").props.value).toBe("my python draft");
  expect(screen.getByLabelText("Test input (stdin)").props.value).toBe("python input");
  fireEvent.press(screen.getByText("javascript"));
  expect(screen.getByLabelText("Source code").props.value).toBe("my JS draft");
});

test("changing languages clears output and messages while selecting the same language preserves the draft and result", async () => {
  const screen = render(view());
  fireEvent.changeText(screen.getByLabelText("Source code"), "my python draft");
  fireEvent.changeText(screen.getByLabelText("Test input (stdin)"), "python input");
  fireEvent.changeText(screen.getByLabelText("Expected output (optional)"), "42");
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Accepted\n42\n")).toBeTruthy());
  fireEvent.press(screen.getByText("python"));
  expect(screen.getByText("Accepted\n42\n")).toBeTruthy();
  expect(screen.getByLabelText("Source code").props.value).toBe("my python draft");
  fireEvent.press(screen.getByText("javascript"));
  expect(screen.queryByText("Accepted\n42\n")).toBeNull();
  expect(screen.getByText("Run your code to see output.")).toBeTruthy();
  const error = "The execution sandbox is unavailable. Try again later.";
  (lmsApi.execute as jest.Mock).mockRejectedValueOnce(new Error(error));
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getAllByText(error)).toHaveLength(2));
  fireEvent.press(screen.getByText("javascript"));
  expect(screen.getAllByText(error)).toHaveLength(2);
  fireEvent.press(screen.getByText("python"));
  expect(screen.queryByText(error)).toBeNull();
  expect(screen.getByText("Run your code to see output.")).toBeTruthy();
  expect(screen.getByLabelText("Source code").props.value).toBe("my python draft");
  expect(screen.getByLabelText("Test input (stdin)").props.value).toBe("python input");
  expect(screen.getByLabelText("Expected output (optional)").props.value).toBe("42");
});

test("an in-flight run locks editing/history, rejects duplicate presses, and clears old output", async () => {
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Accepted\n42\n")).toBeTruthy());
  await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
  const pending = deferred<Execution>();
  (lmsApi.execute as jest.Mock).mockReturnValue(pending.promise);
  const button = screen.getByText("Run code");
  act(() => { fireEvent.press(button); fireEvent.press(button); });
  expect(lmsApi.execute).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Accepted\n42\n")).toBeNull();
  expect(screen.getByText("Executing (up to 30 seconds)...")).toBeTruthy();
  expect(screen.getByLabelText("Source code").props.editable).toBe(false);
  expect(screen.getByLabelText("Test input (stdin)").props.editable).toBe(false);
  fireEvent.press(screen.getByText("Execution history"));
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => { pending.resolve(result()); });
  await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
});

test.each([
  ["Compilation Error", { status: "Compilation Error", statusId: 6, stdout: "", compileOutput: "Main.java: missing semicolon" }, "Main.java: missing semicolon"],
  ["Runtime Error", { status: "Runtime Error", statusId: 11, stdout: "", stderr: "ZeroDivisionError" }, "ZeroDivisionError"],
  ["wrong expected output", { passed: false }, "Expected output did not match"],
  ["matching expected output", { passed: true }, "Expected output matched"],
] as const)("renders %s returned by the API", async (_name, execution, visible) => {
  (lmsApi.execute as jest.Mock).mockResolvedValue(result(execution));
  const screen = render(view());
  if ("passed" in execution) fireEvent.changeText(screen.getByLabelText("Expected output (optional)"), "42");
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText(new RegExp(visible))).toBeTruthy());
});

test.each([
  ["Compilation Error", 6, false],
  ["Runtime Error", 11, false],
  ["Time Limit Exceeded", 5, false],
  ["Internal Error", 13, true],
] as const)("%s keeps the actual error without showing an expected-output comparison", async (status, statusId, passed) => {
  (lmsApi.execute as jest.Mock).mockResolvedValue(result({ status, statusId, stdout: "", stderr: "actual execution diagnostic", passed }));
  const screen = render(view());
  fireEvent.changeText(screen.getByLabelText("Expected output (optional)"), "42");
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText(`${status}\nactual execution diagnostic`)).toBeTruthy());
  expect(screen.queryByText(/Expected output (matched|did not match)/)).toBeNull();
});

test.each([
  "Execution exceeded the time limit.",
  "The execution sandbox is unavailable. Try again later.",
])("API failure %s stays distinct, restores Run and can be retried", async (error) => {
  (lmsApi.execute as jest.Mock).mockRejectedValueOnce(new Error(error));
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
  expect(screen.getAllByText(error)).toHaveLength(2);
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Accepted\n42\n")).toBeTruthy());
  expect(lmsApi.execute).toHaveBeenCalledTimes(2);
});

test("history failure retains execution output and shows a storage-specific error", async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Storage full"));
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Execution finished, but history could not be saved.")).toBeTruthy());
  expect(screen.getByText("Accepted\n42\n")).toBeTruthy();
  expect(screen.getByText("Run code")).toBeTruthy();
});

test("history-save failure appends its warning without masking the execution error", async () => {
  (lmsApi.execute as jest.Mock).mockRejectedValueOnce(new Error("Execution exceeded the time limit."));
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Storage full"));
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  await waitFor(() => expect(screen.getByText("Run code")).toBeTruthy());
  expect(screen.getByText("Execution exceeded the time limit.\nExecution finished, but history could not be saved.")).toBeTruthy();
  expect(screen.getByText("Execution exceeded the time limit.")).toBeTruthy();
});

test("offline and empty-source runs never invoke the API", () => {
  mockOnline = false;
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  mockOnline = true;
  screen.rerender(view());
  fireEvent.changeText(screen.getByLabelText("Source code"), "  ");
  fireEvent.press(screen.getByText("Run code"));
  expect(lmsApi.execute).not.toHaveBeenCalled();
});

const saved: HistoryEntry = { id: "saved", language: "java", code: "saved Java", input: "5", expectedOutput: "10", output: "saved output", timestamp: "2026-10-26T12:00:00Z" };
test("history restores the full execution context; old entries clear unrelated stdin/expected values", () => {
  const screen = render(view(saved));
  expect(screen.getByLabelText("Source code").props.value).toBe(saved.code);
  expect(screen.getByLabelText("Test input (stdin)").props.value).toBe("5");
  expect(screen.getByLabelText("Expected output (optional)").props.value).toBe("10");
  screen.rerender(view({ ...saved, id: "old", input: undefined, expectedOutput: undefined }));
  expect(screen.getByLabelText("Test input (stdin)").props.value).toBe("");
  expect(screen.getByLabelText("Expected output (optional)").props.value).toBe("");
});

test("consuming a restored route entry lets the exact same saved execution be restored again", () => {
  function NavigatorHarness() {
    const [entry, setEntry] = useState<HistoryEntry | undefined>(saved);
    return <>
      <CodePlaygroundScreen
        route={route(entry)}
        navigation={{ ...navigation, setParams: (params: { entry?: HistoryEntry }) => setEntry(params.entry) } as any}
      />
      <Button title="Restore the same saved execution" onPress={() => setEntry(saved)} />
    </>;
  }
  const screen = render(<NavigatorHarness />);
  expect(screen.getByLabelText("Source code").props.value).toBe(saved.code);
  fireEvent.changeText(screen.getByLabelText("Source code"), "edited after first restore");
  fireEvent.changeText(screen.getByLabelText("Test input (stdin)"), "different input");
  fireEvent.press(screen.getByText("Restore the same saved execution"));
  expect(screen.getByLabelText("Source code").props.value).toBe(saved.code);
  expect(screen.getByLabelText("Test input (stdin)").props.value).toBe(saved.input);
});

test.each(["account switch", "unmount", "history restore"])("late responses after %s cannot overwrite output or write stale history", async (event) => {
  const pending = deferred<Execution>();
  (lmsApi.execute as jest.Mock).mockReturnValue(pending.promise);
  const screen = render(view());
  fireEvent.press(screen.getByText("Run code"));
  if (event === "account switch") {
    mockSession = { userId: "other", token: "other-token" };
    screen.rerender(view());
  } else if (event === "unmount") screen.unmount();
  else screen.rerender(view(saved));
  await act(async () => { pending.resolve(result()); });
  expect(await loadHistory("patan")).toEqual([]);
  expect(await loadHistory("other")).toEqual([]);
  expect(lmsApi.execute).toHaveBeenCalledWith("python", starter.python, "", undefined, "learner-token");
  if (event !== "unmount") {
    expect(screen.queryByText("Accepted\n42\n")).toBeNull();
    if (event === "history restore") expect(screen.getByText("saved output")).toBeTruthy();
    else expect(screen.getByLabelText("Source code").props.value).toBe(starter.python);
  }
});

test("history refreshes on focus, restores context, and clears only after confirmation", async () => {
  await appendHistory("patan", saved);
  const history = () => <PlaygroundHistoryScreen route={{ key: "history", name: "PlaygroundHistory" }} navigation={navigation as any} />;
  const screen = render(history());
  await waitFor(() => expect(screen.getByText(saved.code)).toBeTruthy());
  fireEvent.press(screen.getByText("Restore code"));
  expect(navigation.navigate).toHaveBeenCalledWith("CodePlayground", { entry: saved });
  mockFocused = false;
  screen.rerender(history());
  await appendHistory("patan", { ...saved, id: "new", code: "new code" });
  mockFocused = true;
  screen.rerender(history());
  await waitFor(() => expect(screen.getByText("new code")).toBeTruthy());
  fireEvent.press(screen.getByText("Clear history"));
  expect(await loadHistory("patan")).toHaveLength(2);
  fireEvent.press(screen.getByText("Clear"));
  await waitFor(async () => expect(await loadHistory("patan")).toEqual([]));
  expect(screen.getByText("No executions saved yet.")).toBeTruthy();
});
