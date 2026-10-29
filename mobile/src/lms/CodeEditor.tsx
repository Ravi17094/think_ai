import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { editorHtml, type CodeEditorProps } from "./editorHtml";
import { Field, styles } from "./ui";
export function CodeEditor({ code, language, onChange, editable = true }: CodeEditorProps) {
  const ref = useRef<WebView>(null);
  const latest = useRef({ code, language, editable });
  latest.current = { code, language, editable };
  const sync = () => ref.current?.postMessage(JSON.stringify(latest.current));
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => editorHtml(code, language, editable), []);
  useEffect(() => {
    sync();
  }, [code, language, editable]);
  return failed ? (
    <Field
      label="Source code"
      multiline
      style={{ minHeight: 280, fontFamily: "monospace" }}
      value={code}
      onChangeText={onChange}
      editable={editable}
      autoCapitalize="none"
      autoCorrect={false}
    />
  ) : (
    <View style={{ height: 310 }}>
      <Text style={styles.muted}>Code editor · {language}</Text>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        onLoadEnd={sync}
        onError={() => setFailed(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "ready") sync();
            else if (data.type === "change" && typeof data.code === "string" && latest.current.editable)
              onChange(data.code);
          } catch {
            /* Ignore non-editor messages. */
          }
        }}
        javaScriptEnabled
        onShouldStartLoadWithRequest={(request) =>
          request.url === "about:blank" ||
          request.url.startsWith("https://cdn.jsdelivr.net/")
        }
      />
    </View>
  );
}
