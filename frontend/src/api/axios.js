import axios from "axios";

// Keep all legacy API modules on the same backend as the newer portal code.
// Vite runs on 5173 in development while Express runs on 5000, so a relative
// URL (or the old port 3000) cannot reliably reach the backend.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = configuredApiBaseUrl?.startsWith("http")
  ? configuredApiBaseUrl
  : "http://localhost:5000/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
