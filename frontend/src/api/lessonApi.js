import axiosInstance from "../api/axios";

const BASE_URL = "/lessons";

export const getAllLessons = () => axiosInstance.get(BASE_URL);

export const getLessonsByModuleId = (moduleId) =>
  axiosInstance.get(`${BASE_URL}/module/${moduleId}`);

export const getLessonById = (id) => axiosInstance.get(`${BASE_URL}/${id}`);

export const createLesson = (payload) => axiosInstance.post(BASE_URL, payload);

export const updateLesson = (id, payload) =>
  axiosInstance.put(`${BASE_URL}/${id}`, payload);

export const deleteLesson = (id) => axiosInstance.delete(`${BASE_URL}/${id}`);

