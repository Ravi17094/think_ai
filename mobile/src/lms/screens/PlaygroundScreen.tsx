import { useCodeExecution } from "@/hooks/useCodeExecution";
export { starter } from "@/hooks/useCodeExecution";
import { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { CodeEditor } from "../CodeEditor";
import { useLms } from "../LmsProvider";
import { clearHistory, loadHistory } from "../storage";
import type { HistoryEntry, Language } from "../types";
import { Card, Field, Message, Screen, styles } from "../ui";
const inputGuidance: Record<Language, string> = {
  python: "Uses input()? Enter all values in Test input (stdin) before Run code, one line per input() call.",
  javascript: "Uses fs.readFileSync(0, \"utf8\") or process.stdin? Enter all values in Test input (stdin) before Run code.",
  java: "Uses Scanner(System.in)? Enter all values in Test input (stdin) before Run code. Use a Main class with public static void main(String[] args).",
  cpp: "Uses std::cin? Enter all values in Test input (stdin) before Run code.",
};
export function CodePlaygroundScreen({
  route,
  navigation,
}: ScreenProps<"CodePlayground">) {
  const { language, code, input, expected, output, busy, message, online, run,
    updateDraft, setLanguage, setOutput, setMessage } = useCodeExecution({ route, navigation });
  return (
    <Screen title="Code playground">
      <View style={styles.row}>
        {(["python", "javascript", "java", "cpp"] as Language[]).map((l) => (
          <AppButton
            key={l}
            title={l}
            disabled={busy}
            variant={l === language ? "primary" : "secondary"}
            onPress={() => {
              if (l !== language) {
                setLanguage(l);
                setOutput("");
                setMessage("");
              }
            }}
          />
        ))}
      </View>
      <CodeEditor code={code} language={language} onChange={(value) => updateDraft({ code: value })} editable={!busy} />
      <Message text={inputGuidance[language]} />
      <Message text="Output is read-only. Programs cannot receive more input while running." />
      <Field
        label="Test input (stdin)"
        multiline
        editable={!busy}
        value={input}
        onChangeText={(value) => updateDraft({ input: value })}
      />
      <Field
        label="Expected output (optional)"
        multiline
        editable={!busy}
        value={expected}
        onChangeText={(value) => updateDraft({ expected: value })}
      />
      <Message text="Expected output is optional. Leave it empty to run without comparing the result. Use the language's standard library; external packages may be unavailable." />
      <AppButton
        title={busy ? "Executing (up to 30 seconds)..." : "Run code"}
        loading={busy}
        disabled={!online || !code.trim()}
        onPress={() => void run()}
      />
      {message ? <Message error text={message} /> : null}
      <Card>
        <Text style={styles.heading}>Output</Text>
        <Text selectable style={[styles.text, { fontFamily: "monospace" }]}>
          {output || "Run your code to see output."}
        </Text>
      </Card>
      <AppButton
        title="Execution history"
        disabled={busy}
        variant="secondary"
        onPress={() => navigation.navigate("PlaygroundHistory")}
      />
    </Screen>
  );
}
export function PlaygroundHistoryScreen({
  navigation,
}: ScreenProps<"PlaygroundHistory">) {
  const { session } = useLms();
  const focused = useIsFocused();
  const [entries, setEntries] = useState<HistoryEntry[]>([]),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!focused) return;
    void loadHistory(session.userId)
      .then((rows) => { if (active) { setEntries(rows); setError(""); } })
      .catch(() => { if (active) setError("Cannot read history."); });
    return () => { active = false; };
  }, [session.userId, focused]);
  return (
    <Screen title="Execution history">
      <Message text="The latest 50 executions are stored on this device. Tap Restore code to reopen an execution." />
      {error ? <Message error text={error} /> : null}
      <AppButton
        title="Clear history"
        variant="danger"
        disabled={!entries.length}
        onPress={() => setConfirm(true)}
      />
      {!entries.length ? (
        <Message text="No executions saved yet." />
      ) : (
        entries.map((entry) => (
          <Card key={entry.id}>
            <Text style={styles.badge}>{entry.language}</Text>
            <Text style={styles.muted}>
              {new Date(entry.timestamp).toLocaleString()}
            </Text>
            <Text numberOfLines={3} style={styles.text}>
              {entry.code}
            </Text>
            <AppButton
              title="Restore code"
              onPress={() => navigation.navigate("CodePlayground", { entry })}
            />
          </Card>
        ))
      )}
      <Modal
        visible={confirm}
        transparent
        onRequestClose={() => setConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,.8)",
          }}
        >
          <Card>
            <Text style={styles.heading}>Clear all execution history?</Text>
            <AppButton
              title="Clear"
              variant="danger"
              onPress={() =>
                void clearHistory(session.userId)
                  .then(() => {
                    setEntries([]);
                    setConfirm(false);
                  })
                  .catch(() => setError("Cannot clear history."))
              }
            />
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setConfirm(false)}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
