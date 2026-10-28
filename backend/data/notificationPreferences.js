let notificationPreferences = [
  {
    userId: 1,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    categories: {
      courseUpdates: true,
      forumReplies: true,
      paymentAlerts: true,
      systemAnnouncements: true,
      liveSessions: true,
    },
    updatedAt: new Date().toISOString(),
  },
];

module.exports = { notificationPreferences };