import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type DeviceLocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'services-disabled' | 'error';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function useDeviceLocation() {
  const [status, setStatus] = useState<DeviceLocationStatus>('idle');
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);

  const start = useCallback(async () => {
    setStatus('loading');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (!permission.granted) {
        setCanAskAgain(permission.canAskAgain);
        setStatus('denied');
        return;
      }
      setCanAskAgain(true);

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!mountedRef.current) return;
      if (!servicesEnabled) {
        setStatus('services-disabled');
        return;
      }

      const firstPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mountedRef.current) return;

      setLocation({
        latitude: firstPosition.coords.latitude,
        longitude: firstPosition.coords.longitude,
        accuracy: firstPosition.coords.accuracy,
      });
      setStatus('ready');

      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (position) => {
          if (!mountedRef.current) return;
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setStatus('ready');
        },
        () => {
          if (mountedRef.current) setStatus('error');
        },
      );
      if (!mountedRef.current) watchRef.current?.remove();
    } catch {
      if (mountedRef.current) setStatus('error');
    }
  }, []);

  const enableLocationServices = useCallback(async () => {
    setStatus('loading');
    try {
      await Location.enableNetworkProviderAsync();
      await start();
    } catch {
      if (mountedRef.current) setStatus('services-disabled');
    }
  }, [start]);

  useEffect(() => () => {
    mountedRef.current = false;
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  return { status, location, canAskAgain, start, enableLocationServices };
}
