const NOTIFICATION_KEY = 'thinkz_notifications';

function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications) {
  try {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
  } catch {
    // ignore
  }
}

let listeners = new Set();
let wsState = 'disconnected';
let reconnectTimer = null;

function notifyListeners(notifications) {
  listeners.forEach((fn) => {
    try {
      fn(notifications);
    } catch {
      // listener error — skip
    }
  });
}

function emitEvent(event) {
  listeners.forEach((fn) => {
    try {
      fn(null, event);
    } catch {
      // ignore
    }
  });
}

export const NotificationService = {
  get connectionState() {
    return wsState;
  },

  connect() {
    if (wsState === 'connected') return;

    wsState = 'connecting';
    emitEvent({ type: 'statechange', state: 'connecting' });

    // Simulate WebSocket connection handshake
    setTimeout(() => {
      wsState = 'connected';
      emitEvent({ type: 'statechange', state: 'connected' });
      emitEvent({ type: 'open' });
    }, 300);
  },

  disconnect() {
    wsState = 'disconnected';
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    emitEvent({ type: 'statechange', state: 'disconnected' });
    emitEvent({ type: 'close' });
  },

  subscribe(callback) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async getNotifications() {
    return loadNotifications();
  },

  async getUnreadCount() {
    return loadNotifications().filter((n) => !n.read).length;
  },

  async markAsRead(notificationId) {
    const notifications = loadNotifications();
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    notifyListeners(updated);
    return updated;
  },

  async markAllAsRead() {
    const notifications = loadNotifications().map((n) => ({ ...n, read: true }));
    saveNotifications(notifications);
    notifyListeners(notifications);
    return notifications;
  },

  async clearAll() {
    saveNotifications([]);
    notifyListeners([]);
    return [];
  },

  // Simulate incoming notification (used by bookmark toggle, assessment submit, etc.)
  pushNotification({ type, title, message, postId }) {
    const notification = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      postId: postId || null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const notifications = loadNotifications();
    notifications.unshift(notification);
    saveNotifications(notifications);

    // Notify all subscribers
    notifyListeners(notifications);

    // Emit WebSocket message event
    emitEvent({
      type: 'message',
      data: notification,
    });

    return notification;
  },

  // Simulate a server push with a delay (for demo purposes)
  async simulateServerPush({ type, title, message, postId, delayMs = 800 }) {
    await new Promise((r) => setTimeout(r, delayMs));
    return this.pushNotification({ type, title, message, postId });
  },
};

export function resetNotifications() {
  listeners.clear();
  wsState = 'disconnected';
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try {
    localStorage.removeItem(NOTIFICATION_KEY);
  } catch {
    // ignore
  }
}
