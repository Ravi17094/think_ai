import { useEffect, useState, useCallback } from 'react';
import { AssessmentApi } from '../services/assessmentApi.js';
import { NotificationService } from '../services/notificationService.js';

export default function AssessmentPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    AssessmentApi.getQuestions().then(setQuestions);
    AssessmentApi.getSubmissionsByUser('u4').then(setHistory);
  }, []);

  const handleStart = () => {
    setPhase('quiz');
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
    setError(null);
  };

  const handleAnswer = (questionIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const answerArray = questions.map((_, i) => answers[i] ?? -1);
      const submission = await AssessmentApi.submitAssessment({
        userId: 'u4',
        answers: answerArray,
      });
      setResult(submission);
      setPhase('result');

      NotificationService.pushNotification({
        type: 'assessment',
        title: submission.passed ? 'Assessment passed!' : 'Assessment completed',
        message: `You scored ${submission.score}% (${submission.correct}/${submission.total}).`,
      });
    } catch (err) {
      setError(err.message ?? 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [questions, answers]);

  const answeredCount = Object.keys(answers).length;

  if (phase === 'intro') {
    return (
      <div className="assessment-page">
        <header className="forum-hero">
          <h1 className="forum-title">Skill Assessment</h1>
          <p className="forum-subtitle">
            Test your knowledge across React, Java, Spring Boot, JavaScript, CSS, SQL, and Docker.
          </p>
        </header>

        <div className="assessment-intro-card">
          <div className="assessment-intro-stats">
            <div className="assessment-stat">
              <span className="assessment-stat-value">{questions.length}</span>
              <span className="assessment-stat-label">Questions</span>
            </div>
            <div className="assessment-stat">
              <span className="assessment-stat-value">70%</span>
              <span className="assessment-stat-label">Pass Score</span>
            </div>
            <div className="assessment-stat">
              <span className="assessment-stat-value">{new Set(questions.map((q) => q.topic)).size}</span>
              <span className="assessment-stat-label">Topics</span>
            </div>
          </div>
          <button className="btn" onClick={handleStart}>
            Start Assessment
          </button>
        </div>

        {history.length > 0 && (
          <section className="assessment-history">
            <h2 className="assessment-history-title">Previous Attempts</h2>
            <div className="assessment-history-list">
              {history.map((sub) => (
                <div key={sub.id} className="assessment-history-item">
                  <span className="assessment-history-date">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </span>
                  <span className={`assessment-history-score ${sub.passed ? 'passed' : 'failed'}`}>
                    {sub.score}%
                  </span>
                  <span className={`badge ${sub.passed ? 'badge-solved' : 'badge-pinned'}`}>
                    {sub.passed ? 'Passed' : 'Failed'}
                  </span>
                  <span className="assessment-history-detail">
                    {sub.correct}/{sub.total} correct
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="assessment-page">
        <header className="forum-hero">
          <h1 className="forum-title">Assessment Result</h1>
        </header>

        <div className="assessment-result-card">
          <div className={`assessment-score-ring ${result.passed ? 'passed' : 'failed'}`}>
            <span className="assessment-score-value">{result.score}%</span>
            <span className="assessment-score-label">
              {result.passed ? 'Passed' : 'Not Passed'}
            </span>
          </div>

          <div className="assessment-result-stats">
            <div className="assessment-stat">
              <span className="assessment-stat-value">{result.correct}</span>
              <span className="assessment-stat-label">Correct</span>
            </div>
            <div className="assessment-stat">
              <span className="assessment-stat-value">{result.total - result.correct}</span>
              <span className="assessment-stat-label">Incorrect</span>
            </div>
            <div className="assessment-stat">
              <span className="assessment-stat-value">{result.total}</span>
              <span className="assessment-stat-label">Total</span>
            </div>
          </div>
        </div>

        <section className="assessment-details">
          <h2 className="assessment-details-title">Question Review</h2>
          {result.details.map((detail, i) => (
            <div
              key={detail.questionId}
              className={`assessment-question-review ${detail.isCorrect ? 'is-correct' : 'is-incorrect'}`}
            >
              <div className="assessment-q-header">
                <span className="assessment-q-number">Q{i + 1}</span>
                <span className="badge badge-solved">{detail.topic}</span>
                <span className={`assessment-q-verdict ${detail.isCorrect ? 'is-correct' : 'is-incorrect'}`}>
                  {detail.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className="assessment-q-text">{detail.question}</p>
              <div className="assessment-q-options">
                {detail.options.map((opt, j) => {
                  let cls = 'assessment-option';
                  if (j === detail.correctIndex) cls += ' is-correct-answer';
                  if (j === detail.selectedIndex && !detail.isCorrect) cls += ' is-wrong-answer';
                  return (
                    <div key={j} className={cls}>
                      <span className="assessment-option-marker">
                        {String.fromCharCode(65 + j)}
                      </span>
                      {opt}
                      {j === detail.correctIndex && <span className="assessment-option-check">&#10003;</span>}
                      {j === detail.selectedIndex && !detail.isCorrect && <span className="assessment-option-x">&#10007;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="assessment-actions">
          <button className="btn" onClick={handleStart}>
            Retake Assessment
          </button>
          <a className="btn btn-ghost" href="#/">
            Back to Forum
          </a>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="assessment-page">
      <header className="forum-hero">
        <h1 className="forum-title">Skill Assessment</h1>
        <p className="forum-subtitle">
          Question {currentQ + 1} of {questions.length}
        </p>
      </header>

      <div className="assessment-progress">
        <div
          className="assessment-progress-bar"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {q && (
        <div className="assessment-quiz-card">
          <div className="assessment-q-header">
            <span className="assessment-q-number">Q{currentQ + 1}</span>
            <span className="badge badge-solved">{q.topic}</span>
          </div>
          <p className="assessment-q-text">{q.question}</p>

          <div className="assessment-q-options">
            {q.options.map((opt, j) => (
              <button
                key={j}
                type="button"
                className={`assessment-option ${answers[currentQ] === j ? 'is-selected' : ''}`}
                onClick={() => handleAnswer(currentQ, j)}
              >
                <span className="assessment-option-marker">
                  {String.fromCharCode(65 + j)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          <div className="assessment-nav">
            <button
              className="btn btn-ghost"
              onClick={handlePrev}
              disabled={currentQ === 0}
            >
              Previous
            </button>
            <span className="assessment-answered-count">
              {answeredCount}/{questions.length} answered
            </span>
            {currentQ < questions.length - 1 ? (
              <button className="btn" onClick={handleNext}>
                Next
              </button>
            ) : (
              <button
                className="btn"
                onClick={handleSubmit}
                disabled={submitting || answeredCount < questions.length}
              >
                {submitting ? 'Submitting\u2026' : 'Submit Assessment'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="assessment-question-dots">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`assessment-dot ${i === currentQ ? 'is-current' : ''} ${answers[i] !== undefined ? 'is-answered' : ''}`}
            onClick={() => setCurrentQ(i)}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
