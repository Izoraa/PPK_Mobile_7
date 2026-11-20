import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useApp } from '@/state/AppContext';
import { registerDeviceToken } from './tokenService';
import type { NotificationPayload } from './types';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export function useNotifications() {
  const { currentUser } = useApp();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // S3-SRS-21 & S3-SRS-22: Register device token whenever a user logs in
    void registerDeviceToken(currentUser.id);

    // Listener for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Notification received while app is in foreground
    });

    // Listener for when a user interacts with / taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationPayload['data'];

      if (!data || !data.eventType) return;

      try {
        if (data.eventType === 'SESSION_OPENED' && data.sessionId) {
          const detailPath =
            currentUser.role === 'assistant'
              ? `/(assistant)/assistant/sessions/${data.sessionId}`
              : `/(student)/sessions/${data.sessionId}`;
          router.push(detailPath as any);
        } else if (
          (data.eventType === 'LEAVE_APPROVED' || data.eventType === 'LEAVE_REJECTED') &&
          data.sessionId
        ) {
          router.push(`/(student)/leaves/${data.sessionId}` as any);
        } else if (data.eventType === 'SCHEDULE_CHANGED' && data.sessionId) {
          const detailPath =
            currentUser.role === 'assistant'
              ? `/(assistant)/assistant/sessions/${data.sessionId}`
              : `/(student)/sessions/${data.sessionId}`;
          router.push(detailPath as any);
        }
      } catch (err) {
        console.error('Error handling notification tap navigation:', err);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [currentUser, router]);
}
