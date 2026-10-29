import { selectUser } from '../../features/auth/authSlice';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { notificationReceived, showToast } from '../../features/preferenceNotification/preferenceNotificationSlice';
import { useLiveSessionNotifications } from '../../hooks/useLiveSessionNotifications';
import { useForumSocket } from '../../hooks/useForumSocket';

/**
 * Global provider for the Live Session Notification Center.
 *
 * Opens one socket per mounted instance (i.e. per browser tab). Because each
 * tab connects independently, a single `session:started` / `session:ended`
 * event from the backend reaches every open tab in real time.
 *
 * Mount next to the routed pages (see LearnerLayout).
 */
function LiveSessionLifecycleListener() {
  const user = useSelector(selectUser);

  useLiveSessionNotifications({ user });

  return null;
}

function ForumLiveSessionListener() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);

  const userId = user?.id || user?.userId;

  const { subscribe } = useForumSocket({ userId });

  useEffect(() => {
    const unsubscribe = subscribe('notification:new', (notification) => {
      if (!notification) return;

      const isLiveSession =
        notification.type === 'live-session' ||
        notification.type === 'live_session' ||
        notification.type === 'liveSession' ||
        notification.event === 'live-session' ||
        notification.event === 'live_session' ||
        notification.category === 'live-session';

      if (!isLiveSession) return;

      dispatch(notificationReceived(notification));

      dispatch(
        showToast({
          title: notification.title || 'Live Session',
          message:
            notification.message ||
            'A live session is starting soon.',
          type: 'success',
          link: notification.link || null,
          linkLabel: notification.linkLabel || 'Open session',
        })
      );
    });

    return unsubscribe;
  }, [subscribe, dispatch]);

  return null;
}

export default function LiveSessionNotificationListener() {
  return (
    <>
      <LiveSessionLifecycleListener />
      <ForumLiveSessionListener />
    </>
  );
}
