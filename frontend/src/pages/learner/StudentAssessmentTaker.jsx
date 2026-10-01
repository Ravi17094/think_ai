import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Award, CheckCircle, Loader2, RotateCcw, Code, Clock, Flag, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`;

export default function StudentAssessmentTaker() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [codingAnswers, setCodingAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  // Storage key for auto-save draft persistence
  const storageKey = `assessment_draft_${assessmentId}`;

  // 1. Fetch assessment data & load local draft backup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/assessments/${assessmentId}`);
        const asm = res.data?.data || res.data;
        if (isMounted) {
          setAssessment(asm);
          if (asm?.duration) {
            setTimeLeft(asm.duration * 60);
          }
          const savedDraft = localStorage.getItem(storageKey);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              setSelectedAnswers(parsed.selectedAnswers || {});
              setCodingAnswers(parsed.codingAnswers || {});
              setFlaggedQuestions(parsed.flaggedQuestions || {});
            } catch (e) {
              console.error("Failed to parse draft", e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load assessment", err);
        toast.error("Failed to load assessment questions", { theme: "dark" });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [assessmentId, storageKey]);

  // 2. Auto-save draft changes to localStorage
  useEffect(() => {
    if (assessment) {
      const draftData = {
        selectedAnswers,
        codingAnswers,
        flaggedQuestions
      };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [selectedAnswers, codingAnswers, flaggedQuestions, assessment, storageKey]);

  // Submit Handler memoized for timer auto-submit
  const handleSubmitQuiz = useCallback(async () => {
    if (!assessment || !assessment.questions) return;

    const enrollmentId = localStorage.getItem("activeEnrollmentId") || 1;

    const answersPayload = assessment.questions.map((q) => {
      if (q.questionType === "CODING") {
        return {
          questionId: Number(q.id),
          code: codingAnswers[q.id] || ""
        };
      }
      return {
        questionId: Number(q.id),
        selectedOptionId: selectedAnswers[q.id] ? Number(selectedAnswers[q.id]) : null
      };
    });

    try {
      setSubmitting(true);
      const payload = {
        enrollmentId: Number(enrollmentId),
        answers: answersPayload
      };

      const response = await api.post(`/assessments/${assessmentId}/submit`, payload);
      const submissionData = response.data?.data || response.data;

      const score = submissionData.score ?? 0;
      const totalMarks = submissionData.totalMarks ?? assessment.totalMarks ?? 10;
      
      const rawPct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const safePercentage = Math.min(Math.max(rawPct, 0), 100);

      setResult({
        score: score,
        totalMarks: totalMarks,
        percentage: safePercentage,
        status: submissionData.status || "SUBMITTED",
        autoGraded: submissionData.gradedBy === "AUTO_GRADER"
      });

      localStorage.removeItem(storageKey);
      toast.success(
        submissionData.gradedBy === "AUTO_GRADER"
          ? "Assessment submitted and auto graded successfully!"
          : "Assessment submitted successfully!",
        { theme: "dark" }
      );
    } catch (err) {
      console.error("Failed to submit assessment", err);
      toast.error(err.response?.data?.message || "Failed to submit assessment", { theme: "dark" });
    } finally {
      setSubmitting(false);
    }
  }, [assessment, codingAnswers, selectedAnswers, assessmentId, storageKey]);

  // 3. Countdown Timer Handler
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.info("Time's up! Auto-submitting assessment.", { theme: "dark" });
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, handleSubmitQuiz]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSelectOption = (questionId, optionId) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionId });
  };

  const handleCodingChange = (questionId, codeText) => {
    setCodingAnswers({ ...codingAnswers, [questionId]: codeText });
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions({
      ...flaggedQuestions,
      [questionId]: !flaggedQuestions[questionId]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-mono text-xs bg-slate-950">
        <Loader2 className="animate-spin mr-2 text-emerald-500" size={16} /> Loading assessment questions...
      </div>
    );
  }

  const questions = assessment?.questions || [];
  const currentQ = questions[currentIndex];

  return (
    <div 
      className="min-h-screen w-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE6] to-[#E5E2D9] dark:from-[#0b0f17] dark:via-[#111827] dark:to-[#0f172a] text-slate-900 dark:text-[#f1f3f9] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-500"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {result ? (
          <div className="p-6 sm:p-8 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 text-center space-y-6 shadow-2xl animate-fade-in relative">
            <div className="absolute top-6 left-6">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Attempt #{attemptNumber}
              </span>
            </div>
            {result.autoGraded && (
              <div className="absolute top-6 right-6">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                  Auto graded from answer key
                </span>
              </div>
            )}

            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold mt-4">
              <Award size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-fraunces">Assessment Graded Result</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{assessment?.title}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Marks Obtained</span>
                <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{result.score} / {result.totalMarks}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Percentage</span>
                <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">{Number(result.percentage).toFixed(1)}%</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Result Status</span>
                <p className={`text-xs font-bold font-mono mt-2 uppercase ${Number(result.percentage) >= 40 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {Number(result.percentage) >= 40 ? 'Passed' : 'Needs Improvement'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => navigate("/learner/assessments")}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer shadow-lg"
              >
                Back to Assignments
              </button>
              <button
                onClick={() => { 
                  setResult(null); 
                  setSelectedAnswers({}); 
                  setCodingAnswers({}); 
                  setFlaggedQuestions({});
                  setCurrentIndex(0);
                  setAttemptNumber(c => c + 1); 
                  localStorage.removeItem(storageKey);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> Retake Quiz
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mobile Toggle Button for Question Palette */}
            <div className="mb-4 flex lg:hidden items-center justify-between">
              <button
                onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center gap-2 cursor-pointer"
              >
                {mobilePaletteOpen ? <X size={15} /> : <Menu size={15} />}
                {mobilePaletteOpen ? "Hide Question Palette" : "Open Question Palette"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Main Question Card (8 Cols on Desktop) */}
              <div className="lg:col-span-8 p-5 sm:p-8 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 space-y-6 shadow-2xl relative">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
                  <div>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <h1 className="text-lg sm:text-xl font-bold font-fraunces mt-2 text-slate-900 dark:text-white">{assessment?.title}</h1>
                  </div>

                  {/* Timer Display */}
                  {timeLeft !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-bold w-max">
                      <Clock size={14} /> {formatTime(timeLeft)}
                    </div>
                  )}
                </div>

                {currentQ && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                        {currentQ.questionText}
                      </h3>
                      <button
                        onClick={() => toggleFlag(currentQ.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1 transition cursor-pointer shrink-0 self-start ${
                          flaggedQuestions[currentQ.id]
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                            : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        <Flag size={13} /> {flaggedQuestions[currentQ.id] ? "Flagged" : "Flag for Review"}
                      </button>
                    </div>

                    {currentQ.questionType === "CODING" ? (
                      <div className="space-y-3 pt-2">
                        {currentQ.problemStatement && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line bg-slate-100 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">{currentQ.problemStatement}</p>
                        )}
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1 pb-1">
                            <Code size={13} /> Solution Code (Python / Java / JavaScript / C++)
                          </label>
                          <textarea
                            value={codingAnswers[currentQ.id] || ""}
                            onChange={(e) => handleCodingChange(currentQ.id, e.target.value)}
                            placeholder="// Write your solution here..."
                            rows={8}
                            className="w-full p-4 rounded-xl font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 pt-2">
                        {currentQ.options?.map((opt) => {
                          const isSelected = selectedAnswers[currentQ.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectOption(currentQ.id, opt.id)}
                              className={`text-left px-4 py-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-3 shadow-sm ${
                                isSelected 
                                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-2 ring-emerald-500/20" 
                                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${
                                isSelected 
                                  ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/30' 
                                  : 'border-slate-300 dark:border-slate-600 bg-transparent'
                              }`}>
                                {isSelected && <span className="w-2 h-2 rounded-full bg-white animate-scaleIn" />}
                              </span>
                              <span className="text-xs sm:text-sm">{opt.optionText}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex(c => Math.min(questions.length - 1, c + 1))}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/20"
                    >
                      Next <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      disabled={submitting}
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting && <Loader2 size={14} className="animate-spin" />} Submit Assessment
                    </button>
                  )}
                </div>
              </div>

              {/* Question Navigator Drawer / Sidebar (4 Cols on Desktop, toggleable drawer on Mobile) */}
              <div className={`lg:col-span-4 p-6 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 shadow-2xl space-y-4 h-max ${mobilePaletteOpen ? 'block' : 'hidden lg:block'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">Question Palette</h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] != null || (codingAnswers[q.id] && codingAnswers[q.id].trim() !== "");
                    const isFlagged = flaggedQuestions[q.id];
                    const isCurrent = currentIndex === idx;

                    let btnBg = "bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300";
                    if (isAnswered) btnBg = "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold";
                    if (isFlagged) btnBg = "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-bold";
                    if (isCurrent) btnBg += " ring-2 ring-purple-600";

                    return (
                      <button
                        key={q.id || idx}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setMobilePaletteOpen(false); // auto-close palette drawer on mobile selection
                        }}
                        className={`h-10 rounded-xl text-xs font-mono transition border border-slate-300/40 dark:border-slate-700 flex items-center justify-center relative cursor-pointer ${btnBg}`}
                      >
                        {idx + 1}
                        {isFlagged && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500 inline-block" /> Answered
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 inline-block" /> Flagged for Review
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-slate-400 inline-block" /> Unvisited / Unanswered
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
