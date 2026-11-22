import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useApp } from '@/state/AppContext';
import { registerDeviceToken, supportsPushNotifications } from './tokenService';
import type { NotificationPayload } from './types';

// Configure foreground notification presentation (native mobile only)
if (Platform.OS !== 'web') {
  try {
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
  } catch {
    // Ignored in test / headless environments where native event emitters are unmocked
  }
}

export function useNotifications() {
  const { currentUser } = useApp();
  const router = useRouter();
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid || !supportsPushNotifications()) return;

    let active = true;
    let shouldRetry = true;
    let pending = 0;
    const register = (devicePushToken?: Notifications.DevicePushToken) => {
      pending++;
      void registerDeviceToken(uid, devicePushToken).then((result) => {
        pending--;
        if (!active) return;

        shouldRetry = !result.ok && (result.error.retryable || result.error.code === 'PERMISSION_DENIED');
        if (!result.ok && result.error.code !== 'PERMISSION_DENIED' && result.error.code !== 'UNAUTHENTICATED') {
          console.warn('Failed to register device token:', result.error.code);
        }
      });
    };

    const tokenListener = Notifications.addPushTokenListener(register);
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && shouldRetry && pending === 0) register();
    });
    register();

    return () => {
      active = false;
      tokenListener.remove();
      appStateListener.remove();
    };
  }, [uid]);

  useEffect(() => {
    if (!currentUser || Platform.OS === 'web') return;

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
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

    return () => responseListener.remove();
  }, [currentUser, router]);
}
