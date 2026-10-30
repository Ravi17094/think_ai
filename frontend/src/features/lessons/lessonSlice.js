import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getLessonById,
  getLessonsByModuleId,
} from '../../api/lessonApi';

const initialState = {
  byModuleId: {}, // { [moduleId]: Lesson[] }
  loading: false,
  error: null,
  currentLesson: null,
};

export const fetchLessonsByModuleId = createAsyncThunk(
  'lessons/fetchLessonsByModuleId',
  async (moduleId, { rejectWithValue }) => {
    try {
      const response = await getLessonsByModuleId(moduleId);
      const data = response.data?.data;
      const lessons = Array.isArray(data) ? data : (Array.isArray(data?.lessons) ? data.lessons : []);
      return { moduleId, lessons };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load lessons');
    }
  }
);

export const fetchLessonById = createAsyncThunk(
  'lessons/fetchLessonById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getLessonById(id);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load lesson');
    }
  }
);

const lessonSlice = createSlice({
  name: 'lessons',
  initialState,
  reducers: {
    clearLessonError: (state) => { state.error = null; },
    setCurrentLesson: (state, action) => { state.currentLesson = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonsByModuleId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLessonsByModuleId.fulfilled, (state, action) => {
        state.loading = false;
        state.byModuleId[action.payload.moduleId] = action.payload.lessons;
      })
      .addCase(fetchLessonsByModuleId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLessonById.fulfilled, (state, action) => {
        state.currentLesson = action.payload;
      });
  },
});

export const { clearLessonError, setCurrentLesson } = lessonSlice.actions;

export const selectLessonsByModuleId = (moduleId) => (state) => state.lessons.byModuleId[moduleId] || [];
export const selectLessonsLoading = (state) => state.lessons.loading;
export const selectLessonsError = (state) => state.lessons.error;
export const selectCurrentLesson = (state) => state.lessons.currentLesson;

export default lessonSlice.reducer;