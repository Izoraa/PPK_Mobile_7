import { useCallback, useEffect, useState } from "react";

import {
  getLeaveReviewMetadata,
  subscribePendingLeaveReviews,
  subscribeSessionPendingLeaveReviews,
} from "./service";
import type {
  LeaveReviewMetadata,
  LeaveReviewQueueState,
  LeaveReviewRecord,
} from "./types";

function deferStateUpdate(update: () => void): void {
  void Promise.resolve().then(update);
}

export function usePendingLeaveReviews(enabled = true): LeaveReviewQueueState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<LeaveReviewQueueState, "retry">>({
    status: enabled ? "loading" : "ready",
    records: [],
    error: null,
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    let active = true;

    if (!enabled) {
      deferStateUpdate(() => {
        if (!active) return;

        setState({
          status: "ready",
          records: [],
          error: null,
          fromCache: false,
          hasPendingWrites: false,
        });
      });
      return () => {
        active = false;
      };
    }

    const unsubscribe = subscribePendingLeaveReviews(
      (records, metadata) => {
        if (active)
          setState({ status: "ready", records, error: null, ...metadata });
      },
      (error) => {
        if (active)
          setState((previous) => ({ ...previous, status: "error", error }));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading", error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}

export function useSessionPendingLeaveReviews(
  sessionId: string | null,
): LeaveReviewQueueState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<LeaveReviewQueueState, "retry">>({
    status: sessionId ? "loading" : "ready",
    records: [],
    error: null,
    fromCache: false,
    hasPendingWrites: false,
  });

  useEffect(() => {
    let active = true;

    if (!sessionId) {
      setState({
        status: "ready",
        records: [],
        error: null,
        fromCache: false,
        hasPendingWrites: false,
      });
      return () => {
        active = false;
      };
    }

    setState((previous) => ({
      ...previous,
      status: "loading",
      error: null,
    }));

    const unsubscribe = subscribeSessionPendingLeaveReviews(
      sessionId,
      (records, metadata) => {
        if (active) {
          setState({
            status: "ready",
            records,
            error: null,
            ...metadata,
          });
        }
      },
      (error) => {
        if (active) {
          setState((previous) => ({
            ...previous,
            status: "error",
            error,
          }));
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sessionId, attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({
      ...previous,
      status: "loading",
      error: null,
    }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}

export function useLeaveReviewMetadata(
  records: LeaveReviewRecord[],
): Record<string, LeaveReviewMetadata> {
  const [metadata, setMetadata] = useState<Record<string, LeaveReviewMetadata>>(
    {},
  );
  const metadataKey = records
    .map((record) => record.sessionId + ":" + record.classId)
    .join("|");

  useEffect(() => {
    let active = true;
    const uniqueRecords = (metadataKey ? metadataKey.split("|") : []).map(
      (key) => {
        const separatorIndex = key.indexOf(":");
        return {
          key,
          sessionId: key.slice(0, separatorIndex),
          classId: key.slice(separatorIndex + 1),
        };
      },
    );

    if (uniqueRecords.length === 0) {
      deferStateUpdate(() => {
        if (active) setMetadata({});
      });
      return () => {
        active = false;
      };
    }

    void Promise.all(
      uniqueRecords.map(async (record) => {
        const value = await getLeaveReviewMetadata(
          record.sessionId,
          record.classId,
        );
        return [record.key, value] as const;
      }),
    ).then((entries) => {
      if (active) setMetadata(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [metadataKey]);

  return metadata;
}
