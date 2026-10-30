import React, { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AssessmentSubmission from './AssessmentSubmission';
import { selectUser } from '../../../features/auth/authSlice';
import { fetchMyEnrollments, selectMyEnrollments } from '../../../features/enrollments/enrollmentSlice';
import {
  fetchAssessmentById,
  submitAssessmentAnswers,
  selectCurrentAssessment,
  selectAssessmentLoading,
  selectAssessmentError,
} from '../../../features/assessments/assessmentSlice';

export default function AssessmentSubmissionPage() {
  const { assessmentId } = useParams();
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const enrollments = useSelector(selectMyEnrollments);
  const assessment = useSelector(selectCurrentAssessment);
  const loading = useSelector(selectAssessmentLoading);
  const error = useSelector(selectAssessmentError);

  const optionIdMapRef = useRef({});

  useEffect(() => {
    dispatch(fetchAssessmentById(assessmentId));
  }, [dispatch, assessmentId]);

  useEffect(() => {
    if (enrollments.length === 0 && user?.email) {
      dispatch(fetchMyEnrollments(user.email));
    }
  }, [dispatch, enrollments.length, user?.email]);

  // ASSUMPTION — unverified: GET /assessments/:id response includes
  // module.courseId or module.course.id. Confirm against the real
  // assessmentController/assessmentService response shape.
  const enrollmentId = useMemo(() => {
    const courseId = assessment?.module?.courseId || assessment?.module?.course?.id;
    if (!courseId) return null;
    const match = enrollments.find((e) => e.batch?.course?.id === courseId);
    return match?.id ?? null;
  }, [assessment, enrollments]);

  const transformedQuestions = useMemo(() => {
    if (!assessment?.questions) return [];
    return assessment.questions.map((q) => {
      const optionIds = (q.options || []).map((o) => o.id);
      optionIdMapRef.current[q.id] = optionIds;
      return {
        id: q.id,
        prompt: q.questionText,
        options: (q.options || []).map((o) => o.optionText),
      };
    });
  }, [assessment]);

  const handleSubmit = (answersByQuestionIndex) => {
    if (!enrollmentId) {
      console.error('Cannot submit — no enrollment resolved for this course.');
      return;
    }
    const answers = Object.entries(answersByQuestionIndex).map(([questionId, optionIndex]) => ({
      questionId: Number(questionId),
      selectedOptionId: optionIdMapRef.current[questionId]?.[optionIndex],
    }));
    dispatch(submitAssessmentAnswers({ assessmentId, enrollmentId, answers }));
  };

  // No autosave endpoint exists on this backend — local no-op only.
  const handleAutosave = (answersByQuestionIndex) => {
    console.log('[local-only autosave, no backend endpoint]', answersByQuestionIndex);
    return Promise.resolve();
  };

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (loading || !assessment) return <div className="p-6 text-sm text-neutral-400">Loading assessment…</div>;
  if (!enrollmentId) return <div className="p-6 text-sm text-red-600">You're not enrolled in this assessment's course.</div>;

  return (
    <AssessmentSubmission
      questions={transformedQuestions}
      durationSeconds={(assessment.duration || 30) * 60}
      onAutosave={handleAutosave}
      onSubmit={handleSubmit}
    />
  );
}