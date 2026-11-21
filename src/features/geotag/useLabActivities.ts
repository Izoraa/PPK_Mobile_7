import { useCallback, useEffect, useState } from 'react';

import type { Role } from '@/types';

import { subscribeAccessibleLabSessions, type LabSessionActivity } from './activityService';
import type { GeotagError } from './geotagService';

export type LabActivitiesState = {
  status: 'loading' | 'ready' | 'error';
  sessions: LabSessionActivity[];
  error: GeotagError | null;
  retry: () => void;
};

export function useLabActivities(uid: string | null, role: Role | null): LabActivitiesState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<LabActivitiesState, 'retry'>>({
    status: 'loading',
    sessions: [],
    error: null,
  });

  useEffect(() => {
    let active = true;
    let receivedData = false;
    setState({ status: 'loading', sessions: [], error: null });

    if (!uid || !role) {
      setState({
        status: 'error',
        sessions: [],
        error: {
          code: 'UNAUTHENTICATED',
          retryable: false,
          message: 'Silakan masuk untuk melihat aktivitas praktikum.',
        },
      });
      return () => { active = false; };
    }

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeAccessibleLabSessions(
        uid,
        role,
        (sessions) => {
          if (!active) return;
          receivedData = true;
          setState({ status: 'ready', sessions, error: null });
        },
        (error) => {
          if (!active) return;
          setState((previous) => ({
            status: 'error',
            sessions: receivedData ? previous.sessions : [],
            error,
          }));
        },
      );
    } catch {
      setState({
        status: 'error',
        sessions: [],
        error: {
          code: 'SERVICE_UNAVAILABLE',
          retryable: true,
          message: 'Listener aktivitas praktikum gagal dimulai.',
        },
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, role, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', sessions: [], error: null });
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
