import { act, render } from "@testing-library/react-native";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { CodeEditor as WebCodeEditor } from "@/lms/CodeEditor.web";
import { CodeEditor as NativeCodeEditor } from "@/lms/CodeEditor";
import { editorHtml } from "@/lms/editorHtml";

const mockNativePostMessage = jest.fn();
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ postMessage: mockNativePostMessage }));
    return React.createElement(View, { ...props, testID: "native-editor" });
  }) };
});
jest.mock("@/lms/ui", () => ({
  styles: { muted: {} },
  Field: ({ label, ...props }: any) => require("react").createElement(require("react-native").TextInput, { accessibilityLabel: label, ...props }),
}));

type Listener = (event: any) => void;
let messageListener: Listener | undefined;
const previousAdd = window.addEventListener;
const previousRemove = window.removeEventListener;
beforeEach(() => {
  jest.clearAllMocks();
  messageListener = undefined;
  window.addEventListener = jest.fn((_name: string, listener: Listener) => { messageListener = listener; }) as any;
  window.removeEventListener = jest.fn() as any;
});
afterEach(() => {
  window.addEventListener = previousAdd;
  window.removeEventListener = previousRemove;
});

test("web iframe load/ready resyncs the latest code after updates arrive before its document is ready", () => {
  const postMessage = jest.fn();
  const frame: any = { contentWindow: null };
  let screen!: ReactTestRenderer;
  act(() => {
    screen = create(<WebCodeEditor code="initial" language="python" onChange={jest.fn()} />, { createNodeMock: () => frame });
  });
  const initialDocument = screen.root.findByType("iframe").props.srcDoc;
  act(() => { screen.update(<WebCodeEditor code="restored Java" language="java" onChange={jest.fn()} />); });
  frame.contentWindow = { postMessage };
  act(() => { screen.root.findByType("iframe").props.onLoad(); });
  expect(postMessage).toHaveBeenLastCalledWith({ code: "restored Java", language: "java", editable: true }, "*");
  expect(screen.root.findByType("iframe").props.srcDoc).toBe(initialDocument);
  postMessage.mockClear();
  act(() => { messageListener?.({ source: frame.contentWindow, data: { thinkzEditor: true, type: "ready" } }); });
  expect(postMessage).toHaveBeenCalledWith({ code: "restored Java", language: "java", editable: true }, "*");
  act(() => { screen.unmount(); });
});

test("web editor accepts only its own valid change messages and blocks changes while read-only", () => {
  const onChange = jest.fn();
  const frame = { contentWindow: { postMessage: jest.fn() } };
  let screen!: ReactTestRenderer;
  act(() => { screen = create(<WebCodeEditor code="code" language="python" onChange={onChange} />, { createNodeMock: () => frame }); });
  act(() => {
    messageListener?.({ source: {}, data: { thinkzEditor: true, type: "change", code: "foreign" } });
    messageListener?.({ source: frame.contentWindow, data: { thinkzEditor: true, type: "change", code: 123 } });
    messageListener?.({ source: frame.contentWindow, data: { thinkzEditor: true, type: "change", code: "typed" } });
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("typed");
  act(() => { screen.update(<WebCodeEditor code="typed" language="python" onChange={onChange} editable={false} />); });
  act(() => { messageListener?.({ source: frame.contentWindow, data: { thinkzEditor: true, type: "change", code: "ignored" } }); });
  expect(onChange).toHaveBeenCalledTimes(1);
  act(() => { screen.unmount(); });
});

test("native editor resyncs readiness and its editable fallback respects the run lock", () => {
  const onChange = jest.fn();
  const screen = render(<NativeCodeEditor code="initial" language="python" onChange={onChange} />);
  screen.rerender(<NativeCodeEditor code="restored" language="cpp" onChange={onChange} editable={false} />);
  const native = screen.getByTestId("native-editor");
  act(() => { native.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "ready" }) } }); });
  expect(mockNativePostMessage).toHaveBeenLastCalledWith(JSON.stringify({ code: "restored", language: "cpp", editable: false }));
  act(() => { native.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "change", code: "ignored" }) } }); });
  expect(onChange).not.toHaveBeenCalled();
  act(() => { native.props.onError(); });
  expect(screen.getByLabelText("Source code").props.value).toBe("restored");
  expect(screen.getByLabelText("Source code").props.editable).toBe(false);
});

// Execute only the generated editor's bridge/bootstrap script against a minimal
// DOM model. User source remains a string; no browser, CDN or code runner is used.
function editorDocument() {
  const messages: any[] = [];
  const listeners: Record<string, Listener> = {};
  const children: any[] = [];
  let area: any;
  let loader: any;
  let modelValue = "";
  let modelChanged: (() => void) | undefined;
  const model = {
    getValue: () => modelValue,
    setValue: (value: string) => { modelValue = value; modelChanged?.(); },
    getModel: () => ({}),
    updateOptions: jest.fn(),
    onDidChangeModelContent: (callback: () => void) => { modelChanged = callback; },
  };
  const monaco = { editor: {
    create: jest.fn((_root, options) => { modelValue = options.value; return model; }),
    setModelLanguage: jest.fn(),
  } };
  const root = { innerHTML: "", appendChild: (element: any) => { children.push(element); } };
  const document = {
    createElement: (tag: string) => {
      const element: any = { setAttribute: jest.fn(), remove: jest.fn() };
      if (tag === "textarea") area = element;
      return element;
    },
    getElementById: () => root,
    addEventListener: (name: string, callback: Listener) => { listeners[`document:${name}`] = callback; },
    head: { appendChild: (element: any) => { loader = element; } },
  };
  const window = { addEventListener: (name: string, callback: Listener) => { listeners[name] = callback; } };
  const parent = { postMessage: (value: any) => messages.push(value) };
  const amd: any = (_names: string[], callback: () => void) => callback();
  amd.config = jest.fn();
  const script = editorHtml("initial", "python").match(/<script>([\s\S]*)<\/script>/)![1]!;
  new Function("window", "document", "parent", "require", "monaco", script)(window, document, parent, amd, monaco);
  return { messages, listeners, area, loader, monaco, model, children };
}

test("textarea edits survive delayed Monaco initialization and readiness is announced", () => {
  const doc = editorDocument();
  expect(doc.messages[0]).toMatchObject({ thinkzEditor: true, type: "ready" });
  doc.area.value = "typed before CDN loaded";
  doc.area.oninput();
  doc.loader.onload();
  expect(doc.monaco.editor.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ value: "typed before CDN loaded", language: "python" }));
  expect(doc.messages[1]).toMatchObject({ type: "change", code: "typed before CDN loaded" });
});

test("editor bridge changes all language models without echoing host updates and applies read-only", () => {
  const doc = editorDocument();
  doc.loader.onload();
  const before = doc.messages.length;
  for (const language of ["python", "javascript", "java", "cpp"]) {
    doc.listeners.message!({ data: { code: `host ${language}`, language, editable: false } });
    expect(doc.model.getValue()).toBe(`host ${language}`);
    expect(doc.monaco.editor.setModelLanguage).toHaveBeenLastCalledWith(expect.anything(), language);
  }
  expect(doc.model.updateOptions).toHaveBeenLastCalledWith({ readOnly: true });
  expect(doc.messages).toHaveLength(before);
});

test("failed Monaco initialization retains a working text fallback", () => {
  const doc = editorDocument();
  doc.monaco.editor.create.mockImplementationOnce(() => { throw new Error("Editor unavailable"); });
  doc.loader.onload();
  expect(doc.children[doc.children.length - 1]).toBe(doc.area);
  doc.listeners.message!({ data: { code: "restored fallback", language: "java", editable: true } });
  expect(doc.area.value).toBe("restored fallback");
  doc.area.value = "edited fallback";
  doc.area.oninput();
  expect(doc.messages[doc.messages.length - 1]).toMatchObject({ type: "change", code: "edited fallback" });
});
