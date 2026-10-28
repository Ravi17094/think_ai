import axios from "axios";

const api = axios.create({
  // Vite supplies this in deployed environments. The fallback keeps the
  // local web app from mistakenly sending API requests to the Vite server.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/login')) {
        localStorage.removeItem('token');
        window.location.replace('/login?expired=1');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
