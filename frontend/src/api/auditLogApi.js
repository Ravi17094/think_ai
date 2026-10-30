import api from './axios';

export const createAuditLog = (entry) =>
  api.post('/audit-logs', {
    action: entry.action,          // e.g. "PERMISSION_TOGGLE"
    targetRole: entry.targetRole,
    targetPermission: entry.targetPermission,
    granted: entry.granted,
    performedBy: entry.performedBy, // logged-in admin's id/email
    timestamp: new Date().toISOString(),
  });

export const getAuditLogs = () => api.get('/audit-logs');