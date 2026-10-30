import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMatrix,
  toggleRolePermission,
  selectRoles,
  selectPermissions,
  selectGrants,
  selectRbacLoading,
  selectRbacToggling,
  selectRbacError,
} from '../../features/rbac/rbacSlice';

const cellStyle = { border: '1px solid #2a2f3a', padding: '8px 12px', fontSize: 14 };

export default function RBACMatrix() {
  const dispatch = useDispatch();
  const roles = useSelector(selectRoles);
  const permissions = useSelector(selectPermissions);
  const grants = useSelector(selectGrants);
  const loading = useSelector(selectRbacLoading);
  const toggling = useSelector(selectRbacToggling);
  const error = useSelector(selectRbacError);

  useEffect(() => {
    dispatch(fetchMatrix());
  }, [dispatch]);

  const handleToggle = (role, permission, currentlyGranted) => {
    dispatch(toggleRolePermission({ role, permission, granted: !currentlyGranted }));
  };

  if (loading) return <div style={{ padding: 16, color: '#9ca3af' }}>Loading RBAC matrix…</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>Error: {error}</div>;
  if (!roles.length) return <div style={{ padding: 16, color: '#9ca3af' }}>No roles configured.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ color: 'white', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        RBAC Permission Matrix
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
        Toggle grants or revokes a permission for a role directly.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, color: '#9ca3af', textAlign: 'left' }}>Permission</th>
              {roles.map((role) => (
                <th key={role} style={{ ...cellStyle, color: 'white' }}>{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm}>
                <td style={{ ...cellStyle, color: '#d1d5db' }}>{perm}</td>
                {roles.map((role) => {
                  const direct = (grants[role] || []).includes(perm);
                  return (
                    <td key={role + perm} style={{ ...cellStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={direct}
                        disabled={toggling}
                        onChange={() => handleToggle(role, perm, direct)}
                        style={{ cursor: toggling ? 'wait' : 'pointer' }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}