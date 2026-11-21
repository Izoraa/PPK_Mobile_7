import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase/client';
import type { DeviceTokenDoc, Result } from './types';

function sanitizeTokenKey(token: string): string {
  // Replace characters not allowed in Firestore document IDs
  return token.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Configure Android notification channel
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pemberitahuan Praktikum',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }
}

/**
 * S3-SRS-21 & S3-SRS-22:
 * Registers the device on FCM/Expo push notification service and saves the token to Firestore.
 */
export async function registerDeviceToken(uid: string): Promise<Result<{ token: string }>> {
  if (!uid) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'User belum terautentikasi.', retryable: false },
    };
  }

  // Web check
  if (Platform.OS === 'web') {
    return {
      ok: false,
      error: {
        code: 'DEVICE_NOT_SUPPORTED',
        message: 'Push notification tidak didukung langsung di platform Web.',
        retryable: false,
      },
    };
  }

  // Physical device check
  if (!Device.isDevice) {
    return {
      ok: false,
      error: {
        code: 'DEVICE_NOT_SUPPORTED',
        message: 'Push notification memerlukan perangkat fisik (bukan simulator/emulator).',
        retryable: false,
      },
    };
  }

  try {
    await setupNotificationChannel();

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Izin notifikasi ditolak oleh pengguna.',
          retryable: true,
        },
      };
    }

    // Retrieve Expo/FCM Project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'b2dd7991-661d-4e59-9e20-9598c9239adb';

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenResponse.data;

    if (!pushToken) {
      return {
        ok: false,
        error: {
          code: 'TOKEN_FETCH_FAILED',
          message: 'Gagal memperoleh token perangkat dari layanan push.',
          retryable: true,
        },
      };
    }

    // Save/update token in Firestore under `deviceTokens/{tokenId}`
    const db = getFirebaseFirestore();
    const tokenId = sanitizeTokenKey(pushToken);
    const tokenRef = doc(db, 'deviceTokens', tokenId);

    await setDoc(
      tokenRef,
      {
        id: tokenId,
        uid,
        token: pushToken,
        platform: Platform.OS,
        deviceName: Device.modelName ?? (`${Device.manufacturer ?? ''} ${Device.brand ?? ''}`.trim() || null),
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true, data: { token: pushToken } };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_FETCH_FAILED',
        message: error.message || 'Terjadi kesalahan saat registrasi push token.',
        retryable: true,
      },
    };
  }
}

/**
 * S3-SRS-22 & S3-SRS-28:
 * Unregisters / cleans up device token upon user logout so notifications aren't leaked.
 */
export async function unregisterDeviceToken(uid: string, token?: string): Promise<Result<void>> {
  try {
    const db = getFirebaseFirestore();

    if (token) {
      const tokenId = sanitizeTokenKey(token);
      await deleteDoc(doc(db, 'deviceTokens', tokenId));
    } else {
      // Find all tokens registered by this user on this device and remove
      const q = query(collection(db, 'deviceTokens'), where('uid', '==', uid));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }

    return { ok: true, data: undefined };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'FIRESTORE_ERROR',
        message: error.message || 'Gagal menghapus device token.',
        retryable: true,
      },
    };
  }
}

/**
 * Queries all registered device tokens for a given list of user IDs.
 */
export async function getDeviceTokensForUids(uids: string[]): Promise<string[]> {
  if (!uids || uids.length === 0) return [];

  const db = getFirebaseFirestore();
  const tokens: string[] = [];

  // Firestore `in` query supports up to 30 items per batch
  const batches: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) {
    batches.push(uids.slice(i, i + 30));
  }

  for (const batch of batches) {
    try {
      const q = query(collection(db, 'deviceTokens'), where('uid', 'in', batch));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.token && typeof data.token === 'string') {
          tokens.push(data.token);
        }
      });
    } catch (err) {
      console.error('Error fetching device tokens for batch:', err);
    }
  }

  // Deduplicate
  return Array.from(new Set(tokens));
}
