import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigationContainerRef, useRouter, type Href } from 'expo-router';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { useAuthRestoration } from '@/providers/AuthProvider';
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

type PaymentNotification = {
  identifier: string;
  sessionId: string;
  fineId: string;
  path: '/(student)/payments' | '/(student)/payments/history';
};

function readPaymentNotification(response: Notifications.NotificationResponse | null): PaymentNotification | null {
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;

  const { identifier, content } = response.notification.request;
  const { eventType, sessionId, fineId, orderId } = content.data ?? {};
  if (typeof sessionId !== 'string' || !sessionId || typeof fineId !== 'string' || !fineId) return null;

  if (eventType === 'FINE_CREATED') {
    return { identifier, sessionId, fineId, path: '/(student)/payments' };
  }
  if ((eventType === 'PAYMENT_SUCCEEDED' || eventType === 'PAYMENT_FAILED')
    && typeof orderId === 'string' && orderId.trim()) {
    return { identifier, sessionId, fineId, path: '/(student)/payments/history' };
  }
  return null;
}

export function useNotifications() {
  const { currentUser } = useApp();
  const { state } = useAuthRestoration();
  const router = useRouter();
  const navigation = useNavigationContainerRef();
  const restoring = state.status === 'initializing' || state.status === 'error';
  const uid = currentUser?.id;
  const pendingPayment = useRef<PaymentNotification | null>(null);
  const handledPaymentId = useRef<string | null>(null);

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
    if (Platform.OS === 'web') return;

    function openPendingPayment() {
      const payment = pendingPayment.current;
      if (!payment || !currentUser || restoring) return;

      try {
        const isRecipient = currentUser.role === 'student'
          && payment.fineId === `${payment.sessionId}_${currentUser.id}`
          && getFirebaseAuth().currentUser?.uid === currentUser.id;

        if (isRecipient) {
          const currentRoute = navigation.isReady() ? navigation.getCurrentRoute() : undefined;
          // The auth screen can still be redirecting after the identity is restored.
          if (!currentRoute || currentRoute.name.startsWith('(auth)/')) return;
          router.push(payment.path as Href);
        }

        pendingPayment.current = null;
        handledPaymentId.current = payment.identifier;

        const lastResponse = readPaymentNotification(Notifications.getLastNotificationResponse());
        if (lastResponse?.identifier === payment.identifier) Notifications.clearLastNotificationResponse();
      } catch (err) {
        console.error('Error handling payment notification tap:', err);
      }
    }

    function rememberPayment(payment: PaymentNotification) {
      if (handledPaymentId.current === payment.identifier) return;
      pendingPayment.current = payment;
      openPendingPayment();
    }

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const payment = readPaymentNotification(response);
      if (payment) {
        rememberPayment(payment);
        return;
      }

      if (!currentUser) return;
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

    const removeNavigationListener = navigation.addListener('state', openPendingPayment);

    try {
      const initialPayment = readPaymentNotification(Notifications.getLastNotificationResponse());
      if (initialPayment) rememberPayment(initialPayment);
      else openPendingPayment();
    } catch (err) {
      console.error('Error reading the initial payment notification response:', err);
    }

    return () => {
      responseListener.remove();
      removeNavigationListener();
    };
  }, [currentUser, navigation, restoring, router]);
}
