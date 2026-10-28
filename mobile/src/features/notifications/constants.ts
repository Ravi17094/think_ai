import { NotificationPrefs } from './types';

export const DEFAULT_PREFS: NotificationPrefs = {
  replies: { email: true, inApp: true, sms: false },
  mentions: { email: true, inApp: true, sms: false },
  sessions: { email: false, inApp: true, sms: false },
  payments: { email: true, inApp: true, sms: false },
};
