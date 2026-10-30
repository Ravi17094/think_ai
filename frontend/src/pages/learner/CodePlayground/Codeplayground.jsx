import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../../components/ThemeContext';
import { executeCode  } from '../../../api/codeExecutionApi';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
];

const DEFAULT_SNIPPETS = {
  javascript: `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("world"));\n`,
  python: `def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("world"))\n`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n`,
  cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!" << std::endl;\n  return 0;\n}\n`,
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-x-0.5" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CodePlayground() {
  const { isDarkMode } = useTheme();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_SNIPPETS.javascript);
  const [status, setStatus] = useState('idle'); // idle | running | success | error
  const [output, setOutput] = useState('');

  const handleRun = useCallback(async () => {
    setStatus('running');
    setOutput('');

    try {
     const result = await executeCode({ language, code });
      const combined = [result.stdout, result.stderr].filter(Boolean).join('\n');
      setStatus(result.exitCode === 0 ? 'success' : 'error');
      setOutput(combined || (result.exitCode === 0 ? '(no output)' : 'Execution failed.'));
    } catch (err) {
      setStatus('error');
      setOutput(err.message || 'Something went wrong running your code.');
    }
  }, [language, code]);

  const handleLanguageChange = (e) => {
    const next = e.target.value;
    setLanguage(next);
    setCode(DEFAULT_SNIPPETS[next] ?? '');
    setStatus('idle');
    setOutput('');
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-to)]/80">
            Code Playground
          </p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Practice &amp; Experiment</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageChange}
            aria-label="Select language"
            className="rounded-lg border border-[var(--border)] bg-purple-600 px-3 py-2 text-sm
                       text-blue-200 outline-none focus:border-[var(--border-hover)]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="flex items-center gap-2 rounded-lg bg-green-600
               px-4 py-2 text-sm font-semibold text-green-100 transition-all
               hover:bg-green-700 disabled:opacity-60"
          >
            {status === 'running' ? <SpinnerIcon /> : <PlayIcon />}
            {status === 'running' ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* editor + output */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-h-[320px] lg:min-h-0 overflow-hidden rounded-xl border border-[var(--border)]">
          <Editor
            height="100%"
            language={LANGUAGES.find((l) => l.id === language)?.monacoId}
            value={code}
            onChange={(value) => setCode(value ?? '')}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        <div className="min-h-[240px] lg:min-h-0 flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Output
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                status === 'success'
                  ? 'bg-[var(--success)]/15 text-[var(--success)]'
                  : status === 'error'
                    ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                    : status === 'running'
                      ? 'bg-[var(--accent-to)]/15 text-[var(--accent-to)]'
                      : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
              }`}
            >
              {status}
            </span>
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm text-[var(--text-secondary)]">
            {output || 'Run your code to see output here.'}
          </pre>
        </div>
      </div>
    </div>
  );
}