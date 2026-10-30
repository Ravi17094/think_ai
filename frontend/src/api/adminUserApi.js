import api from './axios'

export const getUsers = () => api.get('/admin/users')

export const createUser = (data) => api.post('/admin/users', data)

export const updateUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role })