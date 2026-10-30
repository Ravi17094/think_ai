import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  getCoursesApi,
  createCourseApi,
  updateCourseApi,
  deleteCourseApi,
} from './courseService'

const initialState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCoursesApi()
      const payload = response.data?.data
      return Array.isArray(payload) ? payload : []
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load courses')
    }
  }
)

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (courseData, { rejectWithValue }) => {
    try {
      const response = await createCourseApi(courseData)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create course')
    }
  }
)

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await updateCourseApi(id, updates)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update course')
    }
  }
)

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (id, { rejectWithValue }) => {
    try {
      await deleteCourseApi(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete course')
    }
  }
)

const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearCourseError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        if (action.payload) {
          state.items.push(action.payload)
        }
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        if (!action.payload) return
        const index = state.items.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload)
      })
  },
})

export const { clearCourseError } = courseSlice.actions

export const selectCourses = (state) => state.courses.items
export const selectCoursesLoading = (state) => state.courses.loading
export const selectCoursesError = (state) => state.courses.error

export default courseSlice.reducer
