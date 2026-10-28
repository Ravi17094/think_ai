import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import { useLiveSessionNotifications } from '../../hooks/useLiveSessionNotifications';

/**
 * Global provider for the Live Session Notification Center.
 *
 * Opens one socket per mounted instance (i.e. per browser tab). Because each
 * tab connects independently, a single `session:started` / `session:ended`
 * event from the backend reaches every open tab in real time.
 *
 * Mount next to the routed pages (see LearnerLayout).
 */
export default function LiveSessionNotificationListener() {
  const user = useSelector(selectUser);

  useLiveSessionNotifications({ user });

  return null;
}
