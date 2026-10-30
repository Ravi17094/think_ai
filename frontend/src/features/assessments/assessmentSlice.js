import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAssessmentById, submitAssessment } from '../../api/assessmentApi';

const initialState = {
  currentAssessment: null,
  loading: false,
  submitting: false,
  submitResult: null,
  error: null,
};

export const fetchAssessmentById = createAsyncThunk(
  'assessments/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await getAssessmentById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load assessment');
    }
  }
);

export const submitAssessmentAnswers = createAsyncThunk(
  'assessments/submit',
  async ({ assessmentId, enrollmentId, answers }, { rejectWithValue }) => {
    try {
      const res = await submitAssessment(assessmentId, { enrollmentId, answers });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit assessment');
    }
  }
);

const assessmentSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {
    clearAssessmentError: (state) => { state.error = null; },
    clearCurrentAssessment: (state) => {
      state.currentAssessment = null;
      state.submitResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssessmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssessmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAssessment = action.payload;
      })
      .addCase(fetchAssessmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(submitAssessmentAnswers.pending, (state) => {
        state.submitting = true;
      })
      .addCase(submitAssessmentAnswers.fulfilled, (state, action) => {
        state.submitting = false;
        state.submitResult = action.payload;
      })
      .addCase(submitAssessmentAnswers.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearAssessmentError, clearCurrentAssessment } = assessmentSlice.actions;

export const selectCurrentAssessment = (state) => state.assessments.currentAssessment;
export const selectAssessmentLoading = (state) => state.assessments.loading;
export const selectAssessmentSubmitting = (state) => state.assessments.submitting;
export const selectSubmitResult = (state) => state.assessments.submitResult;
export const selectAssessmentError = (state) => state.assessments.error;

export default assessmentSlice.reducer;