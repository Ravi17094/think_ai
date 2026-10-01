import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

import api from '../../../api/axios';
import { useTheme } from '../../../components/ThemeContext';
import { runCode, submitSolution, resetExecution } from '../../../features/codeExecution/codeExecutionSlice';
import { selectUser } from '../../../features/auth/authSlice';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
];

export default function CodeExecutionPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  
  const currentUser = useSelector(selectUser);

  const execution = useSelector((state) => state.codeExecution) ?? {
    status: 'idle', mode: null, run: null, submission: null, errorMessage: null,
  };

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [question, setQuestion] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [submissionId, setSubmissionId] = useState(null);

  const [language, setLanguage] = useState('java');
  const [code, setCode] = useState('');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(null);

  // Tracks if the code has been successfully run at least once
  const [hasRun, setHasRun] = useState(false);

  const status = execution.status; // idle | running | success | error
  const isRunning = status === 'running';

  const canRun = Boolean(submissionId && question?.id && selectedTestCaseId);
  const canSubmit = Boolean(submissionId && question?.id && code.trim() && hasRun);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/assessments/${assessmentId}`);
        const asm = res?.data?.data || res?.data;
        
        if (isMounted) {
          setAssessment(asm);
          const q = asm?.questions?.[0] || null;
          setQuestion(q);
          
          if (q?.starterCode) {
            const langs = Object.keys(q.starterCode);
            if (langs.length > 0) {
              setLanguage(langs[0]);
              setCode(q.starterCode[langs[0]]);
            }
          } else {
            setCode("public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}");
          }

          // Gather public test cases
          const publicTestCases = (q?.testCases || q?.codingTestCases || []).filter(tc => !tc.isHidden);
          setTestCases(publicTestCases);
          setSelectedTestCaseId(publicTestCases[0]?.id ?? null);

          // Map active submission ID securely from storage or fallback to user session
          const activeSubId = localStorage.getItem("activeSubmissionId") || localStorage.getItem("activeEnrollmentId") || currentUser?.id || "1";
          setSubmissionId(Number(activeSubId));
        }
      } catch (err) {
        console.error("Failed to load assessment data", err);
        toast.error("Failed to load coding environment", { theme: "dark" });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      dispatch(resetExecution());
    };
  }, [assessmentId, dispatch, currentUser]);

  const handleRun = useCallback(() => {
    if (!canRun) return;
    dispatch(runCode({ language, code, submissionId, questionId: question?.id, testCaseId: selectedTestCaseId }))
      .unwrap()
      .then(() => {
        setHasRun(true); // Enable submit button after successful run
      })
      .catch(() => {
        setHasRun(false);
      });
  }, [dispatch, language, code, submissionId, question?.id, selectedTestCaseId, canRun]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    dispatch(submitSolution({ submissionId, questionId: question?.id, language, code }))
      .unwrap()
      .then((res) => {
        const message = res?.autoGraded
          ? `Auto graded! Score: ${res?.score ?? 0}/${res?.totalMarks ?? 10} (${res?.percentage ?? 0}%)`
          : `Submitted! Score: ${res?.score ?? 0}/${res?.totalMarks ?? 10} (${res?.percentage ?? 0}%)`;
        toast.success(message, { theme: "dark" });
      })
      .catch((err) => {
        toast.error(err || "Submission evaluation failed", { theme: "dark" });
      });
  }, [dispatch, submissionId, question?.id, language, code, canSubmit]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (question?.starterCode && question.starterCode[newLang]) {
      setCode(question.starterCode[newLang]);
    }
    setHasRun(false); // Reset run validation on language switch
    dispatch(resetExecution());
  };

  // Find the selected test case object for input/expected output display
  const activeTestCase = testCases.find(tc => tc.id === selectedTestCaseId);

  const submission = execution.submission;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300 font-mono text-xs bg-slate-100 dark:bg-[#0b0f17]">
        <Loader2 className="animate-spin mr-2 text-emerald-500" size={16} /> Loading Judge0 workspace...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4 p-4 md:p-6 bg-slate-100 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 transition-colors duration-300" style={{ fontFamily: "Inter, sans-serif" }}>
      
      {/* Top Header & Question Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-300 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Assignments
        </button>
        <h1 className="text-sm font-bold font-fraunces text-emerald-700 dark:text-emerald-400">
          {assessment?.title || "Coding Assessment"}
        </h1>
      </div>

      {question && (
        <div className="p-4 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              {question.difficulty || "EASY"} • {question.marks || 10} Marks
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">QID: {question.id}</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{question.questionText}</h2>
          {question.problemStatement && (
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-normal">
              {question.problemStatement}
            </p>
          )}

          {/* Render Active Test Case Input & Expected Output details */}
          {activeTestCase && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Test Case Input (Stdin):</span>
                <code className="text-amber-700 dark:text-amber-300 font-semibold">{activeTestCase.input || 'None'}</code>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Expected Output:</span>
                <code className="text-emerald-700 dark:text-emerald-300 font-semibold">{activeTestCase.expectedOutput}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
            Coding Sandbox Workspace
          </p>
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
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer shadow-sm"
            >
              {testCases.map((tc, i) => (
                <option 
                  key={tc.id} 
                  value={tc.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  Test case {i + 1} (Public)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRun}
            disabled={isRunning || !canRun}
            className="rounded-xl bg-slate-700 dark:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-50 transition cursor-pointer flex items-center gap-1 shadow-sm"
          >
            {isRunning && execution.mode === 'run' ? <Loader2 size={13} className="animate-spin" /> : null} Run Code
          </button>

          {/* Submit button appears only after successful Run */}
          {hasRun && (
            <button
              onClick={handleSubmit}
              disabled={isRunning || !canSubmit}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition cursor-pointer flex items-center gap-1 animate-fade-in"
            >
              {isRunning && execution.mode === 'submit' ? <Loader2 size={13} className="animate-spin" /> : null} Submit &amp; Evaluate
            </button>
          )}
        </div>
      </div>

      {/* Main Editor and Output Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-h-[320px] lg:min-h-0 overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md">
          <Editor
            height="100%"
            language={LANGUAGES.find((l) => l.id === language)?.monacoId}
            value={code}
            onChange={(value) => setCode(value ?? '')}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
          />
        </div>

        <div className="min-h-[240px] lg:min-h-0 flex flex-col overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <div className="border-b border-slate-300 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">Execution Output &amp; Verdict</span>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-800 dark:text-slate-200">
            {status === 'idle' && (
              <span className="text-slate-500 dark:text-slate-400">Click "Run Code" to test against the selected test case. Once executed successfully, the submit option will unlock.</span>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Loader2 size={16} className="animate-spin" /> Processing code through Judge0 sandbox...
              </div>
            )}

            {execution.mode === 'run' && execution.run && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{execution.run.status?.description}</div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 space-y-1">
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold block">Actual Output (Stdout):</span>
                  <pre className="whitespace-pre-wrap font-mono text-slate-900 dark:text-emerald-300">{execution.run.stdout || '(no output)'}</pre>
                </div>
                {execution.run.stderr && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/50 space-y-1">
                    <span className="text-red-600 dark:text-red-400 text-[10px] uppercase font-bold block">Error (Stderr):</span>
                    <pre className="whitespace-pre-wrap font-mono text-red-700 dark:text-red-300">{execution.run.stderr}</pre>
                  </div>
                )}
                {(execution.run.time || execution.run.memory) && (
                  <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Time: {execution.run.time}s · Memory: {execution.run.memory} KB
                  </div>
                )}
              </div>
            )}

            {execution.mode === 'submit' && submission && (
              <div className="space-y-3">
                <div className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  {submission.verdict === 'ACCEPTED' ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" /> : <XCircle size={16} className="text-red-600 dark:text-red-400" />}
                  Verdict: {submission.verdict}
                </div>
                {submission.autoGraded && (
                  <div className="inline-flex rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Auto graded after all test cases completed
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 space-y-1 font-mono text-xs">
                  <p>Passed Test Cases: <span className="font-bold text-emerald-700 dark:text-emerald-400">{submission.testCases?.passed ?? 0}/{submission.testCases?.total ?? 0}</span></p>
                  <p>Score Awarded: <span className="font-bold text-emerald-700 dark:text-emerald-400">{submission.score ?? 0} / {submission.totalMarks ?? 10}</span></p>
                  <p>Final Percentage: <span className="font-bold text-teal-700 dark:text-teal-400">{submission.percentage ?? 0}%</span></p>
                </div>

                {Array.isArray(submission.results) && submission.results.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Test Cases Breakdown:</span>
                    {submission.results.map((r, idx) => (
                      <div key={idx} className={`p-2 rounded-xl border text-[11px] flex justify-between items-center ${r.passed ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium' : 'bg-red-50 dark:bg-red-500/5 border-red-300 dark:border-red-500/20 text-red-800 dark:text-red-300 font-medium'}`}>
                        <span>{r.isHidden ? 'Hidden Test Case' : `Test Case #${r.testCaseId || idx + 1}`}</span>
                        <span className="font-bold">{r.passed ? 'Passed ✓' : (r.status || 'Failed ✗')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {status === 'error' && !execution.run && !submission && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 text-red-700 dark:text-red-400 font-medium">
                {execution.errorMessage || "An execution error occurred."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
