import adminApiClient from '../../services/adminApiClient'

export const getUsersApi = () => {
  return adminApiClient.get('/admin/users')
}

export const getRolesApi = () => {
  return adminApiClient.get('/admin/roles')
}

export const updateUserRoleApi = (userId, role) => {
  return adminApiClient.put(`/admin/users/${userId}/role`, { role })
}