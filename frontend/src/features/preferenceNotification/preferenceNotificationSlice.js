import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as preferencesApi from '../../api/preferencesApi';
import { fetchNotifications, markNotificationRead as markNotificationReadRequest, markAllNotificationsRead } from '../../services/moderationApi';

export const fetchPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await preferencesApi.getPreferences(userId);
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
      const response = await preferencesApi.updatePreferences(userId, updates);
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
      const response = await preferencesApi.getQueueStatus();
      return response.data?.data || response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch queue status');
    }
  }
);

export const loadForumNotifications = createAsyncThunk(
  'notifications/loadForumNotifications',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await fetchNotifications(userId);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load notifications');
    }
  }
);

export const markForumNotificationRead = createAsyncThunk(
  'notifications/markForumNotificationRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const updated = await markNotificationReadRequest(notificationId);
      return updated;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllForumNotificationsRead = createAsyncThunk(
  'notifications/markAllForumNotificationsRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const unreadNotifications = (state.notifications?.notificationsList || []).filter(n => !n.read);
      await Promise.all(unreadNotifications.map(n => markNotificationReadRequest(n.id)));
      return true;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark all as read');
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
      })
      // Forum notifications load
      .addCase(loadForumNotifications.fulfilled, (state, action) => {
        const forumNotifs = action.payload || [];
        const existingIds = new Set(state.notificationsList.map(n => n.id));
        const newNotifs = forumNotifs.filter(n => !existingIds.has(n.id));
        if (newNotifs.length > 0) {
          state.notificationsList = [...newNotifs, ...state.notificationsList];
        } else if (state.notificationsList.length === 0) {
          state.notificationsList = forumNotifs;
        }
        state.unreadCount = state.notificationsList.filter(n => !n.read).length;
      })
      // Mark single forum notification read
      .addCase(markForumNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated && updated.id) {
          const notif = state.notificationsList.find(n => n.id === updated.id);
          if (notif && !notif.read) {
            notif.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      // Mark all forum notifications read
      .addCase(markAllForumNotificationsRead.fulfilled, (state) => {
        state.notificationsList = state.notificationsList.map(n => ({ ...n, read: true }));
        state.unreadCount = 0;
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
export const selectForumNotifications = (state) => {
  const list = state.notifications?.notificationsList || [];
  return list.filter(n => n.type === 'reply' || n.type === 'mention' || n.type === 'solved' || n.type === 'moderation' || n.type === 'system');
};

export default notificationSlice.reducer;