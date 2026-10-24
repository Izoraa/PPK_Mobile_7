import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { Attendance, Session, CheckInResult, User } from '../types';
import { USERS, SESSIONS, ATTENDANCES } from '../data/dummy';

interface State {
  users: User[];
  sessions: Session[];
  attendances: Attendance[];
  currentUserId: string | null;
}

type Action =
  | { type: 'SELECT_USER'; userId: string }
  | { type: 'SWITCH_ROLE' }
  | { type: 'OPEN_SESSION'; sessionId: string; at: string }
  | { type: 'CLOSE_SESSION'; sessionId: string; at: string }
  | { type: 'ADD_ATTENDANCE'; attendance: Attendance };

const initialState: State = {
  users: USERS,
  sessions: SESSIONS,
  attendances: ATTENDANCES,
  currentUserId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_USER':
      return { ...state, currentUserId: action.userId };
    case 'SWITCH_ROLE':
      return { ...state, currentUserId: null };
    case 'OPEN_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId && s.status === 'not_open'
            ? { ...s, status: 'open', openedAt: action.at }
            : s
        ),
      };
    case 'CLOSE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId && s.status === 'open'
            ? { ...s, status: 'closed', closedAt: action.at }
            : s
        ),
      };
    case 'ADD_ATTENDANCE':
      return { ...state, attendances: [...state.attendances, action.attendance] };
    default:
      return state;
  }
}

export interface AppContextValue {
  // data
  currentUser: User | null;
  users: User[];
  sessions: Session[];
  // actions
  selectUser: (userId: string) => void;
  switchRole: () => void; // kembali ke RolePicker tanpa reset data
  openSession: (sessionId: string) => boolean; // true jika berhasil
  closeSession: (sessionId: string) => boolean; // true jika berhasil
  checkIn: (sessionId: string) => CheckInResult; // memakai currentUser
  // helpers (selectors)
  getSession: (sessionId: string) => Session | undefined;
  getAttendancesBySession: (sessionId: string) => Attendance[]; // urut waktu naik
  getAttendancesByStudent: (studentId: string) => Attendance[];
  hasCheckedIn: (sessionId: string, studentId: string) => boolean;
  getUserById: (userId: string) => User | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<AppContextValue>(() => {
    const getSession = (id: string) => state.sessions.find((s) => s.id === id);
    const getUserById = (id: string) => state.users.find((u) => u.id === id);
    const hasCheckedIn = (sessionId: string, studentId: string) =>
      state.attendances.some((a) => a.sessionId === sessionId && a.studentId === studentId);
    const currentUser = state.currentUserId ? getUserById(state.currentUserId) ?? null : null;

    return {
      currentUser,
      users: state.users,
      sessions: state.sessions,

      selectUser: (userId) => dispatch({ type: 'SELECT_USER', userId }),
      switchRole: () => dispatch({ type: 'SWITCH_ROLE' }),

      openSession: (sessionId) => {
        const s = getSession(sessionId);
        if (!s || s.status !== 'not_open') return false;
        dispatch({ type: 'OPEN_SESSION', sessionId, at: new Date().toISOString() });
        return true;
      },
      closeSession: (sessionId) => {
        const s = getSession(sessionId);
        if (!s || s.status !== 'open') return false;
        dispatch({ type: 'CLOSE_SESSION', sessionId, at: new Date().toISOString() });
        return true;
      },

      checkIn: (sessionId): CheckInResult => {
        const s = getSession(sessionId);
        if (!currentUser || currentUser.role !== 'student' || !s) {
          return { ok: false, reason: 'NOT_A_STUDENT' };
        }
        if (s.status === 'not_open') return { ok: false, reason: 'SESSION_NOT_OPEN' };
        if (s.status === 'closed') return { ok: false, reason: 'SESSION_CLOSED' };
        if (hasCheckedIn(sessionId, currentUser.id)) return { ok: false, reason: 'ALREADY_CHECKED_IN' };

        const attendance: Attendance = {
          id: `att${Date.now()}`,
          sessionId,
          studentId: currentUser.id,
          checkedInAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_ATTENDANCE', attendance });
        return { ok: true, attendance };
      },

      getSession,
      getUserById,
      hasCheckedIn,
      getAttendancesBySession: (sessionId) =>
        state.attendances
          .filter((a) => a.sessionId === sessionId)
          .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)),
      getAttendancesByStudent: (studentId) =>
        state.attendances.filter((a) => a.studentId === studentId),
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
