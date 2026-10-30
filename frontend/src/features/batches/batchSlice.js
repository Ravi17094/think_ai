import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  getBatchesApi,
  createBatchApi,
  updateBatchApi,
  deleteBatchApi,
} from './batchService'

const initialState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchBatches = createAsyncThunk(
  'batches/fetchBatches',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getBatchesApi()
      const payload = response.data?.data
      return Array.isArray(payload) ? payload : []
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load batches')
    }
  }
)

export const createBatch = createAsyncThunk(
  'batches/createBatch',
  async (batchData, { rejectWithValue }) => {
    try {
      const response = await createBatchApi(batchData)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create batch')
    }
  }
)

export const updateBatch = createAsyncThunk(
  'batches/updateBatch',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateBatchApi(id, updates)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update batch')
    }
  }
)

export const deleteBatch = createAsyncThunk(
  'batches/deleteBatch',
  async (id, { rejectWithValue }) => {
    try {
      await deleteBatchApi(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete batch')
    }
  }
)

const batchSlice = createSlice({
  name: 'batches',
  initialState,
  reducers: {
    clearBatchError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading = false
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createBatch.fulfilled, (state, action) => {
        if (action.payload) {
          state.items.push(action.payload)
        }
      })
      .addCase(updateBatch.fulfilled, (state, action) => {
        if (!action.payload) return
        const index = state.items.findIndex((b) => b.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteBatch.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload)
      })
  },
})

export const { clearBatchError } = batchSlice.actions

export const selectBatches = (state) => state.batches.items
export const selectBatchesLoading = (state) => state.batches.loading
export const selectBatchesError = (state) => state.batches.error

export default batchSlice.reducer