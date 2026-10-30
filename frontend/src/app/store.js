import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import courseReducer from '../features/courses/courseSlice'
import batchReducer from '../features/batches/batchSlice'
import adminUserReducer from '../features/adminUsers/adminUserSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: courseReducer,
    batches: batchReducer,
    adminUsers: adminUserReducer,
  },
})