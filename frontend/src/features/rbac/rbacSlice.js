import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchRoleMatrix, togglePermission } from '../../api/rolesApi';

const initialState = {
  roles: [],
  permissions: [],
  grants: {},
  inheritance: [],
  lastUpdated: null,
  loading: false,
  toggling: false,
  error: null,
};

export const fetchMatrix = createAsyncThunk(
  'rbac/fetchMatrix',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchRoleMatrix();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load RBAC matrix');
    }
  }
);

export const toggleRolePermission = createAsyncThunk(
  'rbac/togglePermission',
  async ({ role, permission, granted }, { rejectWithValue }) => {
    try {
      return await togglePermission(role, permission, granted);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to toggle permission');
    }
  }
);

const rbacSlice = createSlice({
  name: 'rbac',
  initialState,
  reducers: {
    clearRbacError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatrix.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMatrix.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.grants = action.payload.grants;
        state.inheritance = action.payload.inheritance || [];
      })
      .addCase(fetchMatrix.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleRolePermission.pending, (state) => {
        state.toggling = true;
      })
      .addCase(toggleRolePermission.fulfilled, (state, action) => {
        state.toggling = false;
        const { role, permission, granted } = action.payload;
        const current = new Set(state.grants[role] || []);
        granted ? current.add(permission) : current.delete(permission);
        state.grants[role] = Array.from(current);
        state.lastUpdated = {
          role,
          permission,
          granted,
          timestamp: action.payload.auditEntry?.timestamp || new Date().toISOString(),
        };
      })
      .addCase(toggleRolePermission.rejected, (state, action) => {
        state.toggling = false;
        state.error = action.payload;
      });
  },
});

export const { clearRbacError } = rbacSlice.actions;

export const selectRoles = (state) => state.rbac.roles;
export const selectPermissions = (state) => state.rbac.permissions;
export const selectGrants = (state) => state.rbac.grants;
export const selectRbacLoading = (state) => state.rbac.loading;
export const selectRbacToggling = (state) => state.rbac.toggling;
export const selectRbacError = (state) => state.rbac.error;
export const selectRbacInheritance = (state) => state.rbac.inheritance;
export const selectRbacLastUpdated = (state) => state.rbac.lastUpdated;

export default rbacSlice.reducer;
