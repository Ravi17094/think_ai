// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "@/navigation/types";
import { lmsApi } from "@/lms/api";
import { useLms } from "@/lms/LmsProvider";
import { appendHistory } from "@/lms/storage";
import type { HistoryEntry, Language } from "@/lms/types";
export const starter: Record<Language, string> = {
  python: 'print("Hello, Patan!")',
  javascript: 'console.log("Hello, Patan!");',
  java: 'public class Main { public static void main(String[] args) { System.out.println("Hello, Patan!"); } }',
  cpp: '#include <iostream>\nint main() { std::cout << "Hello, Patan!" << std::endl; }',
};
type PlaygroundDraft = { code: string; input: string; expected: string };
const newDrafts = (): Record<Language, PlaygroundDraft> =>
  Object.fromEntries(
    Object.entries(starter).map(([language, code]) => [language, { code, input: "", expected: "" }]),
  ) as Record<Language, PlaygroundDraft>;
export function useCodeExecution({ route, navigation }: ScreenProps<"CodePlayground">) {
  const { session, online } = useLms();
  const [language, setLanguage] = useState<Language>("python"),
    [drafts, setDrafts] = useState(newDrafts),
    [output, setOutput] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { code, input, expected } = drafts[language];
  const actor = `${session.userId}:${session.token || ""}`;
  const activeActor = useRef(actor);
  activeActor.current = actor;
  const mounted = useRef(true);
  const generation = useRef(0);
  const running = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    generation.current++;
    running.current = false;
    setBusy(false);
    setLanguage("python");
    setDrafts(newDrafts());
    setOutput("");
    setMessage("");
  }, [actor]);
  useEffect(() => {
    if (route.params?.entry) {
      const entry = route.params.entry;
      generation.current++;
      running.current = false;
      setBusy(false);
      setMessage("");
      setDrafts((old) => ({
        ...old,
        [entry.language]: {
          code: entry.code,
          input: entry.input || "",
          expected: entry.expectedOutput || "",
        },
      }));
      setLanguage(entry.language);
      setOutput(entry.output);
      navigation.setParams({ entry: undefined });
    }
  }, [route.params?.entry?.id]);
  function updateDraft(change: Partial<PlaygroundDraft>) {
    setDrafts((old) => ({ ...old, [language]: { ...old[language], ...change } }));
  }
  async function run() {
    if (running.current || !online || !session.token || !code.trim()) return;
    const runId = ++generation.current;
    const current = () => mounted.current && activeActor.current === actor && generation.current === runId;
    const identity = session.userId;
    const token = session.token;
    const source = code;
    const selected = language;
    const stdin = input;
    const expectedOutput = expected;
    running.current = true;
    setBusy(true);
    setMessage("");
    setOutput("");
    let text = "";
    try {
      try {
        const result = await lmsApi.execute(
          selected, source, stdin,
          expectedOutput === "" ? undefined : expectedOutput,
          token,
        );
        text = result.results
          .map((r) => {
            const inputHelp = selected === "python" && r.statusId >= 7 && r.statusId <= 12 &&
              /(?:^|\n)EOFError(?::|\r?$)/.test(r.stderr)
              ? "Input ended before Python could finish reading. If your program uses input(), enter all required values in Test input (stdin), one line per input() call, then Run code again. Output cannot accept input."
              : "";
            return [
              r.status,
              r.stdout,
              r.stderr,
              r.compileOutput,
              inputHelp,
              r.statusId !== 3 || typeof r.passed !== "boolean"
                ? ""
                : r.passed
                  ? "Expected output matched"
                  : "Expected output did not match",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n");
      } catch (e) {
        text = e instanceof Error ? e.message : "Execution failed.";
        if (current()) setMessage(text);
      }
      if (!current()) return;
      setOutput(text);
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        language: selected,
        code: source,
        input: stdin,
        expectedOutput,
        output: text,
        timestamp: new Date().toISOString(),
      };
      try {
        await appendHistory(identity, entry);
      } catch {
        if (current()) setMessage((previous) =>
          [previous, "Execution finished, but history could not be saved."].filter(Boolean).join("\n"),
        );
      }
    } finally {
      if (current()) {
        running.current = false;
        setBusy(false);
      }
    }
  }
  return { language, code, input, expected, output, busy, message, online, run,
    updateDraft, setLanguage, setOutput, setMessage };
}
