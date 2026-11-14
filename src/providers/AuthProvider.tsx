import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { restoreIdentity, type AccountIdentity } from '@/features/auth/authService';
import { useApp } from '@/state/AppContext';
import type { AppErrorCode } from '@/types';

type ProfileNotice = Exclude<AccountIdentity['status'], 'ready'>;

type RestorationState =
  | { status: 'initializing' }
  | { status: 'complete' }
  | { status: 'profileIncomplete'; notice: ProfileNotice }
  | { status: 'error'; code: AppErrorCode };

interface AuthRestoration {
  state: RestorationState;
  retry: () => void;
  continueToLogin: () => void;
}

const AuthRestorationContext = createContext<AuthRestoration | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuthenticatedUser } = useApp();
  const [state, setState] = useState<RestorationState>({ status: 'initializing' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void restoreIdentity().then((result) => {
      if (!active) return;

      if (!result.ok) {
        setState({ status: 'error', code: result.error.code });
        return;
      }

      const identity = result.data;
      if (identity.status === 'ready') {
        setAuthenticatedUser(identity.user);
        setState({ status: 'complete' });
      } else if (identity.status === 'signedOut') {
        setState({ status: 'complete' });
      } else {
        setState({ status: 'profileIncomplete', notice: identity.status });
      }
    });

    return () => {
      active = false;
    };
  }, [attempt, setAuthenticatedUser]);

  function retry() {
    setState({ status: 'initializing' });
    setAttempt((previous) => previous + 1);
  }

  function continueToLogin() {
    setState({ status: 'complete' });
  }

  return (
    <AuthRestorationContext.Provider value={{ state, retry, continueToLogin }}>
      {children}
    </AuthRestorationContext.Provider>
  );
}

export function useAuthRestoration(): AuthRestoration {
  const restoration = useContext(AuthRestorationContext);
  if (!restoration) throw new Error('useAuthRestoration must be used inside AuthProvider');
  return restoration;
}
