import api from "./axios";

// Fetch the role permission matrix
export const fetchRoleMatrix = () =>
  api.get("/roles/matrix").then((res) => res.data);

// Toggle a specific permission for a role
export const togglePermission = (role, permission, granted) =>
  api.patch(`/roles/${role}/permissions/${permission}`, { granted }).then((res) => res.data);

export const getRoleMatrix = fetchRoleMatrix;
export const updatePermission = togglePermission;