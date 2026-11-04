import axios from 'axios'

const configuredApiBaseUrl = import.meta.env.VITE_COURSE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
const apiBaseUrl = configuredApiBaseUrl?.startsWith('http')
  ? configuredApiBaseUrl
  : 'http://localhost:5000/api'

const courseApiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

courseApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

courseApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)

export default courseApiClient
