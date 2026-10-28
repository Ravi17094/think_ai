const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

export const isApiConfigured = () => Boolean(API_URL);

function requireApiUrl() {
  if (!API_URL) throw new Error("Phone API address is not configured.");
  return API_URL;
}

async function request(path, options = {}) {
  const response = await fetch(`${requireApiUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    method: options.method || "GET",
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || payload.error || "Request failed");
  return payload;
}

export function login(email, password) {
  return request("/api/auth/login", { method: "POST", body: { email, password } });
}

export function getAttendanceRegister(token, sessionDate, sessionTitle) {
  return request(`/api/attendance/ta/register?sessionDate=${encodeURIComponent(sessionDate)}&sessionTitle=${encodeURIComponent(sessionTitle)}`, { token });
}

export function saveAttendanceRecord(token, record) {
  return request("/api/attendance/ta/record", { method: "PUT", token, body: record });
}

export function getTAReport(token) {
  return request("/api/attendance/ta/report", { token });
}

export function getLiveSession(token, sessionId) {
  return request(`/api/studio/sessions/${encodeURIComponent(sessionId)}`, { token });
}

export function getRoleMatrix(token) {
  return request("/api/roles/matrix", { token });
}

export function updateRolePermission(token, role, permission, granted) {
  return request(`/api/roles/${encodeURIComponent(role)}/permissions/${encodeURIComponent(permission)}`, { method: "PATCH", token, body: { granted } });
}

export function getGradingQueue(token) {
  return request("/api/assessments/ta/grading-queue", { token });
}

export function submitGrade(token, submissionId, score, feedback) {
  return request(`/api/assessments/submissions/${submissionId}/grade`, { method: "PATCH", token, body: { score: Number(score), feedback } });
}

export function submitBulkGrades(token, grades) {
  return request("/api/assessments/ta/grading-queue/bulk", { method: "PATCH", token, body: { grades } });
}

export function registerDevice(token, device) {
  return request("/api/devices/register", { method: "POST", token, body: device });
}

export function getSessionChecklist(token, sessionId) {
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/prep-checklist`, { token });
}

export function saveSessionChecklist(token, sessionId, checklist) {
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/prep-checklist`, { method: "PATCH", token, body: { checklist } });
}
