const BASE = '/api/roles';
const USE_MOCK = true;

export const ROLE_HIERARCHY = ['Admin', 'Instructor', 'TA', 'Learner',];

const PERMISSIONS = [
  'manage_users',
  'manage_courses',
  'manage_batches',
  'manage_enrollments',
  'manage_modules',
  'manage_lessons',
  'grade_assignments',
  'view_reports',
  'join_live_class',
  'view_own_progress',
];

let MOCK_GRANTS = {
  Admin: ['manage_users', 'manage_courses', 'manage_batches', 'manage_enrollments', 'view_reports'],
  Instructor: ['manage_modules', 'manage_lessons', 'grade_assignments'],
  TA: ['grade_assignments'],
  Learner: ['join_live_class', 'view_own_progress'],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonOrThrow(res, fallbackMessage) {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }
  return res.json();
}

export async function fetchRoleMatrix() {
  if (USE_MOCK) {
    await delay(300);
    return {
      roles: ROLE_HIERARCHY,
      permissions: PERMISSIONS,
      grants: MOCK_GRANTS,
    };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/matrix`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(res, 'Failed to load RBAC matrix.');
}

export async function togglePermission(role, permission, granted) {
  if (USE_MOCK) {
    await delay(200);
    const current = new Set(MOCK_GRANTS[role] || []);
    granted ? current.add(permission) : current.delete(permission);
    MOCK_GRANTS = { ...MOCK_GRANTS, [role]: Array.from(current) };
    return { role, permission, granted };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/${role}/permissions/${permission}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ granted }),
  });
  return parseJsonOrThrow(res, 'Failed to update permission.');
}
