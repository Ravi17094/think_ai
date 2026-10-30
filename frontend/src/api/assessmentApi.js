import api from "./axios";

export const createAssessment = (data) =>
  api.post("/assessments", data);

export const getAssessmentById = (id) =>
  api.get(`/assessments/${id}`);

export const submitAssessment = (id, data) =>
  api.post(`/assessments/${id}/submit`, data);

export const getAssessmentAnalytics = (id) =>
  api.get(`/assessments/${id}/analytics`);