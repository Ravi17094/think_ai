const { retentionDays } = require("../config/audit.config");

// In-memory audit log store.
// Resets on server restart — production persistence is a separate migration task.
// Each entry: { id, timestamp, actorRole, action, targetUserId, targetUserName, oldRole, newRole }

let auditLog = [];
let nextId = 1;

function removeExpiredEntries() {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  auditLog = auditLog.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff);
}

function logRoleChange({ actorRole, targetUserId, targetUserName, oldRole, newRole }) {
  removeExpiredEntries();
  const entry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    actorRole,
    action: "ROLE_CHANGE",
    targetUserId,
    targetUserName,
    oldRole,
    newRole,
  };
  auditLog.push(entry);
  return entry;
}

function logPermissionChange({ actorRole, role, permission, granted }) {
  removeExpiredEntries();
  const entry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    actorRole,
    action: "PERMISSION_CHANGE",
    targetUserId: role,
    targetUserName: `${role} - ${permission}`,
    oldRole: granted ? "Denied" : "Granted",
    newRole: granted ? "Granted" : "Denied",
  };
  auditLog.push(entry);
  return entry;
}

function toJSON(entries) {
  return JSON.stringify(entries, null, 2);
}

function getEntries({ role, action, from, to } = {}) {
  removeExpiredEntries();
  return auditLog.filter((entry) => {
    if (role && entry.actorRole !== role && entry.newRole !== role) return false;
    if (action && entry.action !== action) return false;
    if (from && new Date(entry.timestamp) < new Date(from)) return false;
    if (to && new Date(entry.timestamp) > new Date(to)) return false;
    return true;
  });
}

function toCSV(entries) {
  const header = "id,timestamp,actorRole,action,targetUserId,targetUserName,oldRole,newRole";
  const rows = entries.map((e) =>
    [e.id, e.timestamp, e.actorRole, e.action, e.targetUserId, e.targetUserName, e.oldRole, e.newRole].join(",")
  );
  return [header, ...rows].join("\n");
}

module.exports = { logRoleChange, logPermissionChange, getEntries, toCSV, toJSON };
