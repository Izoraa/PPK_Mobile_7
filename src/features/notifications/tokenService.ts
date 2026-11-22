import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getRandomValues } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { User } from 'firebase/auth';
import { Platform } from 'react-native';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { requestLabCheckInApi } from '@/lib/labCheckInApi';
import type { Result as ApiResult } from '@/types';

import type { Result } from './types';

const INSTALLATION_ID_KEY = '@labcheckin/notification-installation-id';

type Registration = {
  paused: boolean;
  token?: string;
  pending?: Promise<Result<void>>;
  request?: Promise<ApiResult<unknown>>;
};

const registrations = new WeakMap<User, Registration>();
let installationIdPromise: Promise<string> | undefined;

function getRegistration(user: User): Registration {
  let registration = registrations.get(user);
  if (!registration) {
    registration = { paused: false };
    registrations.set(user, registration);
  }
  return registration;
}

function getOrCreateInstallationId(): Promise<string> {
  installationIdPromise ??= (async () => {
    const existingId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
    if (existingId) return existingId;

    const bytes = getRandomValues(new Uint8Array(16));
    const installationId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
    return installationId;
  })().catch((error: unknown) => {
    installationIdPromise = undefined;
    throw error;
  });
  return installationIdPromise;
}

export function supportsPushNotifications(): boolean {
  return (Platform.OS === 'android' || Platform.OS === 'ios') && Device.isDevice;
}

async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pemberitahuan Praktikum',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  const allowsNotifications = (settings: Notifications.NotificationPermissionsStatus) =>
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  const settings = await Notifications.getPermissionsAsync();
  return allowsNotifications(settings)
    || (settings.canAskAgain && allowsNotifications(await Notifications.requestPermissionsAsync()));
}

function inactiveRegistration(): Result<never> {
  return { ok: false, error: { code: 'UNAUTHENTICATED', retryable: false } };
}

export async function registerDeviceToken(
  uid: string,
  devicePushToken?: Notifications.DevicePushToken,
): Promise<Result<void>> {
  if (!supportsPushNotifications()) {
    return { ok: false, error: { code: 'DEVICE_NOT_SUPPORTED', retryable: false } };
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return inactiveRegistration();

  const registration = getRegistration(user);
  if (registration.paused) return inactiveRegistration();

  async function register(): Promise<Result<void>> {
    if (registration.paused || auth.currentUser !== user) return inactiveRegistration();
    try {
      if (!await requestNotificationPermissions()) {
        return { ok: false, error: { code: 'PERMISSION_DENIED', retryable: false } };
      }
      if (registration.paused || auth.currentUser !== user) return inactiveRegistration();

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        return { ok: false, error: { code: 'TOKEN_FETCH_FAILED', retryable: false } };
      }

      // Supplying the rotated native token avoids triggering the native listener again.
      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
        projectId,
        devicePushToken,
      });
      if (!expoPushToken) {
        return { ok: false, error: { code: 'TOKEN_FETCH_FAILED', retryable: true } };
      }
      if (registration.paused || auth.currentUser !== user) return inactiveRegistration();
      if (registration.token === expoPushToken) return { ok: true, data: undefined };

      const installationId = await getOrCreateInstallationId();
      if (registration.paused || auth.currentUser !== user) return inactiveRegistration();

      registration.token = undefined;
      registration.request = requestLabCheckInApi('/api/device-tokens', {
        method: 'POST',
        body: { installationId, expoPushToken },
        successStatus: 204,
        user,
      });
      const result = await registration.request;
      if (!result.ok) return result;
      if (!registration.paused) registration.token = expoPushToken;
      return { ok: true, data: undefined };
    } catch {
      return { ok: false, error: { code: 'TOKEN_FETCH_FAILED', retryable: true } };
    } finally {
      registration.request = undefined;
    }
  }

  // Register tokens in discovery order so an older result cannot overwrite a rotation.
  const pending = (registration.pending ?? Promise.resolve()).then(register);
  registration.pending = pending;
  try {
    return await pending;
  } finally {
    if (registration.pending === pending) registration.pending = undefined;
  }
}

export function pauseDeviceTokenRegistration(user: User): () => void {
  const registration = getRegistration(user);
  registration.paused = true;
  return () => {
    registration.paused = false;
    void registerDeviceToken(user.uid);
  };
}

export async function unregisterDeviceToken(
  user: User,
): Promise<Result<'unregistered' | 'no-installation'>> {
  if (!supportsPushNotifications()) return { ok: true, data: 'no-installation' };

  const registration = getRegistration(user);
  registration.token = undefined;

  try {
    // Logout pauses new registrations. Only an API request already in flight needs to finish.
    await registration.request;
    const installationId = await (installationIdPromise ?? AsyncStorage.getItem(INSTALLATION_ID_KEY));
    if (!installationId) return { ok: true, data: 'no-installation' };

    const result = await requestLabCheckInApi('/api/device-tokens', {
      method: 'DELETE',
      body: { installationId },
      successStatus: 204,
      user,
    });
    if (!result.ok) return result;
    return { ok: true, data: 'unregistered' };
  } catch {
    return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', retryable: true } };
  }
}
