import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase/client';
import { getDeviceTokensForUids, unregisterDeviceToken } from './tokenService';
import type {
  NotificationEventType,
  NotificationPayload,
} from './types';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * S3-SRS-27:
 * Resolves targeted recipient student UIDs based on class, session, or specific student identity.
 */
export async function resolveRecipientUids(
  eventType: NotificationEventType,
  context: {
    classId?: string;
    sessionId?: string;
    studentId?: string;
  }
): Promise<string[]> {
  const db = getFirebaseFirestore();

  // 1. Direct student target (e.g. Leave approved or rejected)
  if (context.studentId) {
    return [context.studentId];
  }

  // 2. Resolve classId from sessionId if only sessionId was provided
  let classId = context.classId;
  if (!classId && context.sessionId) {
    try {
      const sessionSnap = await getDoc(doc(db, 'sessions', context.sessionId));
      if (sessionSnap.exists()) {
        classId = sessionSnap.data()?.classId;
      }
    } catch (err) {
      console.error('Error finding classId for session:', err);
    }
  }

  // 3. For session/schedule events: target all active enrolled students of the class
  if (classId) {
    try {
      const q = query(
        collection(db, 'memberships'),
        where('classId', '==', classId),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      const studentIds = snap.docs.map((d) => d.data()?.studentId).filter(Boolean);
      return Array.from(new Set(studentIds));
    } catch (err) {
      console.error('Error resolving class members for notification:', err);
    }
  }

  return [];
}

/**
 * S3-SRS-28:
 * Dispatches push notifications to Expo/FCM push service with dead-token cleanup and failure isolation.
 */
export async function sendPushNotification(
  tokens: string[],
  payload: NotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  // Expo push API handles up to 100 messages per chunk
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: 'high',
      channelId: 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.warn(`Expo push endpoint responded with HTTP ${response.status}`);
        failureCount += chunk.length;
        continue;
      }

      const result = await response.json();
      const receipts = result.data;

      if (Array.isArray(receipts)) {
        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          const token = chunk[i];

          if (receipt.status === 'ok') {
            successCount++;
          } else {
            failureCount++;
            // S3-SRS-28: Handle invalid or unregistered tokens by pruning them from Firestore
            if (
              receipt.details &&
              receipt.details.error === 'DeviceNotRegistered' &&
              token
            ) {
              console.log(`Pruning inactive device token: ${token}`);
              void unregisterDeviceToken('', token);
            }
          }
        }
      } else {
        successCount += chunk.length;
      }
    } catch (err) {
      console.error('Error sending push notification chunk:', err);
      failureCount += chunk.length;
    }
  }

  return { successCount, failureCount };
}

/**
 * Top-level non-blocking dispatcher.
 * Resolves recipients, acquires tokens, and delivers push notifications safely.
 */
export async function dispatchNotification(
  eventType: NotificationEventType,
  context: {
    classId?: string;
    sessionId?: string;
    studentId?: string;
    title: string;
    body: string;
    extraData?: Record<string, any>;
  }
): Promise<void> {
  try {
    // S3-SRS-27: Resolve recipient student UIDs
    const recipientUids = await resolveRecipientUids(eventType, {
      classId: context.classId,
      sessionId: context.sessionId,
      studentId: context.studentId,
    });

    if (recipientUids.length === 0) {
      return;
    }

    // Acquire registered device tokens
    const tokens = await getDeviceTokensForUids(recipientUids);
    if (tokens.length === 0) {
      return;
    }

    const payload: NotificationPayload = {
      title: context.title,
      body: context.body,
      data: {
        eventType,
        sessionId: context.sessionId,
        classId: context.classId,
        studentId: context.studentId,
        timestamp: Date.now(),
        ...(context.extraData || {}),
      },
    };

    // S3-SRS-28: Resilient delivery
    await sendPushNotification(tokens, payload);
  } catch (error) {
    // Non-blocking: never crash or disrupt the main flow
    console.error('Push notification dispatch error (handled):', error);
  }
}
