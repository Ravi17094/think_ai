import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  generateCertificate as generateCertificateApi,
  getCertificateByEnrollment,
} from '../../api/certificateApi';

const initialState = {
  byEnrollmentId: {},
  loading: false,
  generating: false,
  error: null,
};

export const fetchCertificateByEnrollment = createAsyncThunk(
  'certificates/fetchByEnrollment',
  async (enrollmentId, { rejectWithValue }) => {
    try {
      const response = await getCertificateByEnrollment(enrollmentId);
      return { enrollmentId, certificate: response.data.data };
    } catch (err) {
      if (err.response?.status === 404) return { enrollmentId, certificate: null }; // not earned yet — not an error
      return rejectWithValue(err.response?.data?.message || 'Failed to load certificate');
    }
  }
);

export const generateCertificate = createAsyncThunk(
  'certificates/generate',
  async (enrollmentId, { rejectWithValue }) => {
    try {
      const response = await generateCertificateApi(enrollmentId);
      return { enrollmentId, certificate: response.data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Certificate not available yet');
    }
  }
);

const certificateSlice = createSlice({
  name: 'certificates',
  initialState,
  reducers: {
    clearCertificateError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCertificateByEnrollment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCertificateByEnrollment.fulfilled, (state, action) => {
        state.loading = false;
        state.byEnrollmentId[action.meta.arg] = action.payload;
      })
      .addCase(fetchCertificateByEnrollment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateCertificate.pending, (state) => {
        state.generating = true;
      })
      .addCase(generateCertificate.fulfilled, (state, action) => {
        state.generating = false;
        state.byEnrollmentId[action.meta.arg] = action.payload;
      })
      .addCase(generateCertificate.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload;
      });
  },
});

export const { clearCertificateError } = certificateSlice.actions;

// Selectors
export const selectCertificateForEnrollment = (enrollmentId) => (state) =>
  state.certificates.byEnrollmentId[enrollmentId] || null;

export const selectCertificateLoading = (state) => state.certificates.loading;
export const selectGeneratingCertificate = (state) => state.certificates.generating;
export const selectCertificateError = (state) => state.certificates.error;

export default certificateSlice.reducer;