import { useCallback, useEffect, useState } from "react";

import { subscribeActiveGeotagPoints, type GeotagPoint } from "./geotagService";

type GeotagError = {
  code:
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NETWORK_ERROR"
    | "SERVICE_UNAVAILABLE"
    | "NOT_FOUND"
    | "VALIDATION_ERROR";
  retryable: boolean;
  message: string;
};

export type GeotagPointsState = {
  status: "loading" | "ready" | "error";
  points: GeotagPoint[];
  error: GeotagError | null;
  retry: () => void;
};

export function useGeotagPoints(): GeotagPointsState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<GeotagPointsState, "retry">>({
    status: "loading",
    points: [],
    error: null,
  });

  useEffect(() => {
    let active = true;

    setState({
      status: "loading",
      points: [],
      error: null,
    });

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeActiveGeotagPoints(
        (points) => {
          if (!active) return;

          setState({
            status: "ready",
            points,
            error: null,
          });
        },
        (error) => {
          if (!active) return;

          setState((previous) => ({
            status: "error",
            points: previous.points,
            error,
          }));
        },
      );
    } catch {
      if (active) {
        setState({
          status: "error",
          points: [],
          error: {
            code: "SERVICE_UNAVAILABLE",
            retryable: true,
            message: "Listener lokasi gagal dimulai.",
          },
        });
      }
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({
      status: "loading",
      points: [],
      error: null,
    });
    setAttempt((value) => value + 1);
  }, []);

  return {
    ...state,
    retry,
  };
}
