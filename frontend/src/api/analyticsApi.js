import api from "./axios";

export const getEnrollmentTrends = () =>
  api.get("/analytics/enrollments");

export const getCourseCompletionRates = () =>
  api.get("/analytics/course-completion");

export const getHeatmap = () =>
  api.get("/analytics/heatmap");