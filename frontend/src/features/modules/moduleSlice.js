import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getModules,
  getModuleById,
  getModulesByCourseId,
} from '../../api/moduleApi';

const initialState = {
  items: [],
  loading: false,
  error: null,
  currentModule: null,
};

export const fetchModulesByCourseId = createAsyncThunk(
  'modules/fetchModulesByCourseId',
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await getModulesByCourseId(courseId);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load modules');
    }
  }
);

export const fetchModuleById = createAsyncThunk(
  'modules/fetchModuleById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getModuleById(id);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load module');
    }
  }
);

const moduleSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    clearModuleError: (state) => { state.error = null; },
    clearModules: (state) => { state.items = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModulesByCourseId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModulesByCourseId.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload?.data;
        state.items = Array.isArray(data) ? data : (Array.isArray(data?.modules) ? data.modules : []);
      })
      .addCase(fetchModulesByCourseId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.items = [];
      })
      .addCase(fetchModuleById.fulfilled, (state, action) => {
        state.currentModule = action.payload;
      });
  },
});

export const { clearModuleError, clearModules } = moduleSlice.actions;

export const selectModules = (state) => state.modules.items;
export const selectModulesLoading = (state) => state.modules.loading;
export const selectModulesError = (state) => state.modules.error;
export const selectCurrentModule = (state) => state.modules.currentModule;

export default moduleSlice.reducer;