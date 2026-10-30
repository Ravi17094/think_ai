import courseApiClient from '../../services/courseApiClient'

export const getCoursesApi = () => {
  return courseApiClient.get('/courses')
}

export const getCourseByIdApi = (id) => {
  return courseApiClient.get(`/courses/${id}`)
}

export const createCourseApi = (courseData) => {
  return courseApiClient.post('/courses', courseData)
}

export const updateCourseApi = (id, courseData) => {
  return courseApiClient.put(`/courses/${id}`, courseData)
}

export const patchCourseApi = (id, courseData) => {
  return courseApiClient.patch(`/courses/${id}`, courseData)
}

export const deleteCourseApi = (id) => {
  return courseApiClient.delete(`/courses/${id}`)
}