import api from "./axios";

export const getCourses = (
  search = "",
  page = 1,
  limit = 5
) =>
  api.get(
    `/courses?search=${search}&page=${page}&limit=${limit}`
  );

export const getCourseById = (id) => api.get(`/courses/${id}`);

export const createCourse = (data) => api.post("/courses", data);

export const updateCourse = (id, data) =>
  api.put(`/courses/${id}`, data);

export const deleteCourse = (id) =>
  api.delete(`/courses/${id}`);