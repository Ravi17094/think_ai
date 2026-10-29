import { useEffect, useMemo, useRef } from "react";
import { editorHtml, type CodeEditorProps } from "./editorHtml";
export function CodeEditor({ code, language, onChange, editable = true }: CodeEditorProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ code, language, editable });
  latest.current = { code, language, editable };
  const sync = () => frame.current?.contentWindow?.postMessage(latest.current, "*");
  // Keep the document mounted while typing. Only messages update its model.
  const html = useMemo(() => editorHtml(code, language, editable), []);
  useEffect(() => {
    sync();
  }, [code, language, editable]);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.data?.thinkzEditor
      ) {
        if (event.data.type === "ready") sync();
        else if (event.data.type === "change" && typeof event.data.code === "string" && latest.current.editable)
          onChange(event.data.code);
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [onChange]);
  return (
    <iframe
      ref={frame}
      title="Source code editor"
      sandbox="allow-scripts"
      srcDoc={html}
      onLoad={sync}
      style={{
        width: "100%",
        height: 300,
        border: "1px solid #3a4570",
        borderRadius: 10,
      }}
    />
  );
}
