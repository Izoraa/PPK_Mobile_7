import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import type { PermissionStatus, PermissionType } from './types';

export function useDevicePermissions(type: PermissionType) {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      if (type === 'camera') {
        const res = await Camera.getCameraPermissionsAsync();
        setStatus(res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked');
        setCanAskAgain(res.canAskAgain);
      } else if (type === 'location') {
        const res = await Location.getForegroundPermissionsAsync();
        setStatus(res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked');
        setCanAskAgain(res.canAskAgain);
      } else if (type === 'notification') {
        if (Platform.OS === 'web') {
          setStatus('blocked');
          setCanAskAgain(false);
        } else {
          const res = await Notifications.getPermissionsAsync();
          setStatus(res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked');
          setCanAskAgain(res.canAskAgain);
        }
      }
    } catch {
      setStatus('denied');
    } finally {
      setIsChecking(false);
    }
  }, [type]);

  const requestPermission = useCallback(async () => {
    setIsChecking(true);
    try {
      if (type === 'camera') {
        const res = await Camera.requestCameraPermissionsAsync();
        const nextStatus = res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked';
        setStatus(nextStatus);
        setCanAskAgain(res.canAskAgain);
        return res.granted;
      } else if (type === 'location') {
        const res = await Location.requestForegroundPermissionsAsync();
        const nextStatus = res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked';
        setStatus(nextStatus);
        setCanAskAgain(res.canAskAgain);
        return res.granted;
      } else if (type === 'notification') {
        if (Platform.OS === 'web') return false;
        const res = await Notifications.requestPermissionsAsync();
        const nextStatus = res.granted ? 'granted' : res.canAskAgain ? 'denied' : 'blocked';
        setStatus(nextStatus);
        setCanAskAgain(res.canAskAgain);
        return res.granted;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [type]);

  useEffect(() => {
    void checkStatus();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkStatus();
      }
    });

    return () => subscription.remove();
  }, [checkStatus]);

  return {
    status,
    isGranted: status === 'granted',
    isBlocked: status === 'blocked',
    canAskAgain,
    isChecking,
    checkStatus,
    requestPermission,
  };
}