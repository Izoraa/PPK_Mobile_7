import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

export function useLocationService() {
  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkServiceEnabled = useCallback(async () => {
    setIsChecking(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setIsLocationEnabled(enabled);
      return enabled;
    } catch {
      setIsLocationEnabled(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkServiceEnabled();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkServiceEnabled();
      }
    });

    return () => subscription.remove();
  }, [checkServiceEnabled]);

  return {
    isLocationEnabled,
    isChecking,
    checkServiceEnabled,
  };
}