import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as notificationsApi from '../../api/preferencesApi'; 

export const fetchPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getPreferences(userId);
      return response.data?.data || response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch preferences');
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async ({ userId, updates }, { rejectWithValue }) => {
    try {
      const response = await notificationApi.updatePreferences(userId, updates);
      return response.data?.data || response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preferences');
    }
  }
);

export const fetchQueueStatus = createAsyncThunk(
  'notifications/fetchQueueStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getQueueStatus();
      return response.data?.data || response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch queue status');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    preferences: null,
    queueStatus: null,
    activeToasts: [],
    notificationsList: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    showToast: (state, action) => {
      const newToast = {
        id: Date.now(),
        title: action.payload.title || 'Notification',
        message: action.payload.message,
        type: action.payload.type || 'success',
        link: action.payload.link || null,
        linkLabel: action.payload.linkLabel || null,
      };
      state.activeToasts.push(newToast);
    },
    removeToast: (state, action) => {
      state.activeToasts = state.activeToasts.filter(toast => toast.id !== action.payload);
    },
    notificationReceived: (state, action) => {
      state.notificationsList.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAllAsRead: (state) => {
      state.unreadCount = 0;
      state.notificationsList = state.notificationsList.map(n => ({ ...n, read: true }));
    },
    markNotificationRead: (state, action) => {
      const notif = state.notificationsList.find(n => n.id === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    loadNotifications: (state) => {
      // Local sync trigger if needed
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Preferences
      .addCase(fetchPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      // Queue Status
      .addCase(fetchQueueStatus.fulfilled, (state, action) => {
        state.queueStatus = action.payload;
      });
  },
});

// Exported actions
export const { 
  showToast, 
  removeToast, 
  notificationReceived, 
  markAllAsRead, 
  markNotificationRead,
  loadNotifications 
} = notificationSlice.actions;

// Exported selectors
export const selectNotifications = (state) => state.notifications?.notificationsList || [];
export const selectUnreadCount = (state) => state.notifications?.unreadCount || 0;
export const selectNotificationsLoading = (state) => state.notifications?.loading || false;

export default notificationSlice.reducer;