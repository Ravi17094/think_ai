/**
 * Default notification channel preferences (client-mandated).
 *
 * Event -> default channels:
 *   New reply        -> In-app only
 *   Mention          -> Email + in-app
 *   Moderator action -> Email only
 */

const notificationDefaults = {
  "new-reply": {
    email: false,
    inApp: true,
    sms: false,
    label: "New reply"
  },
  mention: {
    email: true,
    inApp: true,
    sms: false,
    label: "Mention"
  },
  "moderator-action": {
    email: true,
    inApp: false,
    sms: false,
    label: "Moderator action"
  }
};

/**
 * Returns a deep copy of the defaults for a single event so callers cannot
 * accidentally mutate the shared configuration.
 */
function getNotificationDefaults(event) {
  const defaults = notificationDefaults[event];
  if (!defaults) return null;
  return {
    email: Boolean(defaults.email),
    inApp: Boolean(defaults.inApp),
    sms: Boolean(defaults.sms)
  };
}

module.exports = { notificationDefaults, getNotificationDefaults };