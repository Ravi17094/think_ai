import React, { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../components/ThemeContext';
import { runCode, submitSolution, practiceRun, resetExecution } from '../../../features/codeExecution/codeExecutionSlice';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
];

/**
 * `submissionId` — an existing AssessmentSubmission row's id. Still required
 * up front (see prior thread) — this component does not create one itself.
 * `questionId` — the coding Question this playground is attached to.
 * `testCases` — the question's PUBLIC test cases only:
 *   [{ id, input, expectedOutput }, ...]
 *   (hidden test cases are never sent to the client; the backend runs them
 *   only during Submit and withholds their input/output in the response)
 */
export default function CodePlayground({ mode = 'practice', submissionId, questionId, testCases = [] }) {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const execution = useSelector((state) => state.codeExecution) ?? {
    status: 'idle', mode: null, run: null, submission: null, errorMessage: null,
  };

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(testCases[0]?.id ?? null);

  const status = execution.status; // idle | running | success | error
  const isRunning = status === 'running';

  const isPractice = mode === 'practice';
  const canRun = isPractice ? true : Boolean(submissionId && questionId && selectedTestCaseId);
  const canSubmit = !isPractice && Boolean(submissionId && questionId && code.trim());

  useEffect(() => {
    setSelectedTestCaseId(testCases[0]?.id ?? null);
  }, [testCases]);

  const handleRun = useCallback(() => {
    if (!canRun) return;
    if (isPractice) {
      dispatch(practiceRun({ language, code }));
    } else {
      dispatch(runCode({ language, code, submissionId, questionId, testCaseId: selectedTestCaseId }));
    }
  }, [dispatch, isPractice, language, code, submissionId, questionId, selectedTestCaseId, canRun]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    dispatch(submitSolution({ submissionId, questionId, language, code }));
  }, [dispatch, submissionId, questionId, language, code, canSubmit]);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    dispatch(resetExecution());
  };

  // ---- Run output ----
  const runOutput = execution.run
    ? [execution.run.compileOutput, execution.run.stdout, execution.run.stderr].filter(Boolean).join('\n')
    : '';

  // ---- Submit output ----
  const submission = execution.submission;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-to)]/80">
            Code Playground
          </p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Practice &amp; Experiment</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
         <select
            value={language}
            onChange={handleLanguageChange}
            disabled={isRunning}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer shadow-sm"
          >
            {LANGUAGES.map((l) => (
              <option 
                key={l.id} 
                value={l.id}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {l.label}
              </option>
            ))}
          </select>

          {testCases.length > 0 && (
            <select
              value={selectedTestCaseId ?? ''}
              onChange={(e) => setSelectedTestCaseId(Number(e.target.value))}
              disabled={isRunning}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-glass)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              {testCases.map((tc, i) => (
                <option key={tc.id} value={tc.id}>Test case {i + 1}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleRun}
            disabled={isRunning || !canRun}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {(execution.mode === 'run' || execution.mode === 'practice') && isRunning ? 'Running…' : 'Run'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isRunning || !canSubmit}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-60"
          >
            {execution.mode === 'submit' && isRunning ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-h-[320px] lg:min-h-0 overflow-hidden rounded-xl border border-[var(--border)]">
          <Editor
            height="100%"
            language={LANGUAGES.find((l) => l.id === language)?.monacoId}
            value={code}
            onChange={(value) => setCode(value ?? '')}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
          />
        </div>

        <div className="min-h-[240px] lg:min-h-0 flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
          <div className="border-b border-[var(--border)] px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Output</span>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm text-[var(--text-secondary)]">
            {status === 'idle' && 'Run against a test case, or submit for grading.'}

            {(execution.mode === 'run' || execution.mode === 'practice') && execution.run && (
              <>
                <div className="mb-2 text-xs font-semibold">{execution.run.status?.description}</div>
                <pre className="whitespace-pre-wrap">{runOutput || '(no output)'}</pre>
                {(execution.run.time || execution.run.memory) && (
                  <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                    Time: {execution.run.time}s · Memory: {execution.run.memory} KB
                  </div>
                )}
              </>
            )}

            {execution.mode === 'submit' && submission && (
              <>
                <div className="mb-2 text-sm font-bold">{submission.verdict}</div>
                <div className="mb-3 text-xs text-[var(--text-muted)]">
                  {submission.testCases.passed}/{submission.testCases.total} test cases passed ·
                  {' '}{submission.score}/{submission.totalMarks} marks ({submission.percentage}%)
                </div>
                <div className="space-y-2">
                  {submission.results.map((r) => (
                    <div key={r.executionId} className="rounded border border-[var(--border)] p-2 text-xs">
                      <span className={r.passed ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {r.isHidden ? 'Hidden test case' : `Test case ${r.testCaseId}`}: {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {status === 'error' && !execution.run && !submission && (
              <span>{execution.errorMessage}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
