// In-memory audit log store.
// Resets on server restart — acceptable for today's scope.
// Each entry: { id, timestamp, actorRole, action, targetUserId, targetUserName, oldRole, newRole }

let auditLog = [];
let nextId = 1;

function logRoleChange({ actorRole, targetUserId, targetUserName, oldRole, newRole }) {
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

function getEntries({ role, action, from, to } = {}) {
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

module.exports = { logRoleChange, getEntries, toCSV };