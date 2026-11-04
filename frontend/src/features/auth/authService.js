import apiClient from '../../services/apiClient'

/** Authentication must use the running API; do not substitute browser-only demo users. */
export const loginApi = (credentials) => apiClient.post('/auth/login', credentials)

export const registerApi = (formData) => apiClient.post('/auth/register', formData)

export const getCurrentUserApi = () => apiClient.get('/auth/me')

// There is no server-side logout endpoint because a JWT is stateless. The
// caller clears the local token after this resolves.
export const logoutApi = () => Promise.resolve({ data: { message: 'Logged out' } })
