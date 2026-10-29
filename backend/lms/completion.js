function completion(course, progress, submissions) {
  const lessons = course.modules.flatMap((m) => m.lessons);
  const completedLessons = lessons.filter((l) =>
    progress.some((p) => p.lessonId === l.id && p.completed),
  ).length;
  const percentage = lessons.length
    ? Math.round((completedLessons / lessons.length) * 10000) / 100
    : 0;
  const assessments = course.modules
    .flatMap((m) => m.assessments || [])
    .filter((a) => a.status === "ACTIVE");
  const passedAssessments = assessments.filter((a) =>
    submissions.some(
      (s) =>
        s.assessmentId === a.id &&
        s.status === "GRADED" &&
        s.percentage >= a.passPercentage,
    ),
  ).length;
  return {
    totalLessons: lessons.length,
    completedLessons,
    percentage,
    totalAssessments: assessments.length,
    passedAssessments,
    eligible:
      lessons.length > 0 &&
      percentage >= course.completionThreshold &&
      passedAssessments === assessments.length,
  };
}
function gradeMcq(question, answer) {
  const correct = question.options.filter((o) => o.isCorrect);
  const isCorrect =
    correct.length === 1 && answer?.selectedOptionId === correct[0].id;
  return { isCorrect, marksObtained: isCorrect ? question.marks : 0 };
}
module.exports = { completion, gradeMcq };
