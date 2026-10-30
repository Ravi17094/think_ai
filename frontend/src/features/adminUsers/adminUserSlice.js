import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getUsersApi, updateUserRoleApi } from './adminUserService'

const initialState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getUsersApi()
      const payload = response.data?.data
      return Array.isArray(payload) ? payload : []
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load users')
    }
  }
)

export const updateUserRole = createAsyncThunk(
  'adminUsers/updateUserRole',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await updateUserRoleApi(userId, role)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update role')
    }
  }
)

const adminUserSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    clearAdminUserError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        if (!action.payload) return
        const index = state.items.findIndex((u) => u.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
  },
})

export const { clearAdminUserError } = adminUserSlice.actions

export const selectAdminUsers = (state) => state.adminUsers.items
export const selectAdminUsersLoading = (state) => state.adminUsers.loading
export const selectAdminUsersError = (state) => state.adminUsers.error

export default adminUserSlice.reducer