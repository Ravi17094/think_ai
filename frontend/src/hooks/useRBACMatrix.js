import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRoleMatrix, togglePermission } from "../api/rolesApi";

function cloneGrants(grants = {}) {
  return Object.fromEntries(
    Object.entries(grants).map(([role, permissions]) => [role, [...permissions]])
  );
}

function findChanges(baseline, draft, roles, permissions) {
  return roles.flatMap((role) => permissions.flatMap((permission) => {
    const before = (baseline[role] || []).includes(permission);
    const after = (draft[role] || []).includes(permission);
    return before === after ? [] : [{ role, permission, granted: after }];
  }));
}

/** Keeps RBAC edits local until an administrator explicitly saves them. */
export default function useRBACMatrix() {
  const [matrix, setMatrix] = useState({ roles: [], permissions: [], inheritance: [] });
  const [baseline, setBaseline] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchRoleMatrix();
      const nextGrants = cloneGrants(response.grants);
      setMatrix({ roles: response.roles || [], permissions: response.permissions || [], inheritance: response.inheritance || [] });
      setBaseline(nextGrants);
      setDraft(cloneGrants(nextGrants));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to load RBAC matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changes = useMemo(() => findChanges(baseline, draft, matrix.roles, matrix.permissions), [baseline, draft, matrix.roles, matrix.permissions]);
  const isDirty = changes.length > 0;

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "You have unsaved RBAC changes.";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  const toggle = useCallback((role, permission) => {
    setDraft((current) => {
      const rolePermissions = new Set(current[role] || []);
      rolePermissions.has(permission) ? rolePermissions.delete(permission) : rolePermissions.add(permission);
      return { ...current, [role]: [...rolePermissions] };
    });
    setLastSaved("");
  }, []);

  const discard = useCallback(() => {
    setDraft(cloneGrants(baseline));
    setError("");
    setLastSaved("");
  }, [baseline]);

  const save = useCallback(async () => {
    if (!changes.length) return;
    setSaving(true);
    setError("");
    try {
      await Promise.all(changes.map((change) => togglePermission(change.role, change.permission, change.granted)));
      setBaseline(cloneGrants(draft));
      setLastSaved(`${changes.length} permission change${changes.length === 1 ? "" : "s"} saved.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not save RBAC changes.");
    } finally {
      setSaving(false);
    }
  }, [changes, draft]);

  return { ...matrix, grants: draft, loading, saving, error, lastSaved, isDirty, changes, toggle, discard, save, reload: load };
}
