import {
  collection,
  doc,
  GeoPoint,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirestoreError,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/client";

export type GeotagId = "A" | "B" | "C" | "D";

export interface GeotagPoint {
  id: string; // Firestore document ID
  geotagId: GeotagId;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export type GeotagErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NETWORK_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export type GeotagError = {
  code: GeotagErrorCode;
  retryable: boolean;
  message: string;
};

export type GeotagResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GeotagError };

const ORDER: GeotagId[] = ["A", "B", "C", "D"];

function isGeotagId(value: unknown): value is GeotagId {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function mapFirestoreError(error: unknown): GeotagErrorCode {
  const code = (error as FirestoreError | undefined)?.code;

  if (code === "permission-denied") return "FORBIDDEN";
  if (code === "unauthenticated") return "UNAUTHENTICATED";
  if (code === "unavailable" || code === "deadline-exceeded")
    return "NETWORK_ERROR";
  return "SERVICE_UNAVAILABLE";
}

function parseGeotagSnapshot(
  snapshot: QuerySnapshot,
): GeotagResult<GeotagPoint[]> {
  if (snapshot.empty) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        retryable: false,
        message: "Tidak ada titik laboratorium aktif.",
      },
    };
  }

  const points: GeotagPoint[] = [];
  const seen = new Set<GeotagId>();

  for (const document of snapshot.docs) {
    const data = document.data();

    if (data.geotagId === undefined) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          retryable: false,
          message: `Dokumen laboratorium aktif "${document.id}" belum memiliki geotagId.`,
        },
      };
    }

    if (
      !isGeotagId(data.geotagId) ||
      typeof data.name !== "string" ||
      !data.name.trim() ||
      !(data.geoPoint instanceof GeoPoint) ||
      typeof data.radiusMeters !== "number" ||
      !Number.isFinite(data.radiusMeters) ||
      data.radiusMeters <= 0
    ) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          retryable: false,
          message: `Data geotag pada dokumen "${document.id}" tidak valid atau belum lengkap.`,
        },
      };
    }

    if (seen.has(data.geotagId)) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          retryable: false,
          message: `Identitas geotag ${data.geotagId} terduplikasi.`,
        },
      };
    }

    seen.add(data.geotagId);
    points.push({
      id: document.id,
      geotagId: data.geotagId,
      name: data.name.trim(),
      latitude: data.geoPoint.latitude,
      longitude: data.geoPoint.longitude,
      radiusMeters: data.radiusMeters,
    });
  }

  if (points.length !== 4 || ORDER.some((id) => !seen.has(id))) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        retryable: false,
        message:
          "Harus tersedia tepat satu titik aktif untuk tiap identitas A, B, C, dan D.",
      },
    };
  }

  points.sort((a, b) => ORDER.indexOf(a.geotagId) - ORDER.indexOf(b.geotagId));

  return { ok: true, data: points };
}

export async function getActiveGeotagPoints(): Promise<
  GeotagResult<GeotagPoint[]>
> {
  try {
    const db = getFirebaseFirestore();
    const snapshot = await getDocs(
      query(collection(db, "laboratories"), where("isActive", "==", true)),
    );

    return parseGeotagSnapshot(snapshot);
  } catch (error) {
    const code = mapFirestoreError(error);
    return {
      ok: false,
      error: {
        code,
        retryable: code === "NETWORK_ERROR" || code === "SERVICE_UNAVAILABLE",
        message: "Gagal membaca titik laboratorium dari Firestore.",
      },
    };
  }
}

export function subscribeActiveGeotagPoints(
  onChange: (points: GeotagPoint[]) => void,
  onError: (error: GeotagError) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const pointsQuery = query(
    collection(db, "laboratories"),
    where("isActive", "==", true),
  );

  return onSnapshot(
    pointsQuery,
    (snapshot) => {
      const result = parseGeotagSnapshot(snapshot);

      if (result.ok) {
        onChange(result.data);
      } else {
        onError(result.error);
      }
    },
    (error) => {
      const code = mapFirestoreError(error);
      onError({
        code,
        retryable: code === "NETWORK_ERROR" || code === "SERVICE_UNAVAILABLE",
        message: "Gagal membaca titik laboratorium dari Firestore.",
      });
    },
  );
}

export async function updateGeotagPoint(
  laboratoryDocumentId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<GeotagResult<void>> {
  if (
    !laboratoryDocumentId.trim() ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        retryable: false,
        message: "Koordinat harus berada dalam rentang valid dan radius harus lebih dari 0 meter.",
      },
    };
  }

  try {
    const db = getFirebaseFirestore();
    await updateDoc(doc(db, "laboratories", laboratoryDocumentId), {
      geoPoint: new GeoPoint(latitude, longitude),
      radiusMeters,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, data: undefined };
  } catch (error) {
    const code = mapFirestoreError(error);
    return {
      ok: false,
      error: {
        code,
        retryable: code === "NETWORK_ERROR" || code === "SERVICE_UNAVAILABLE",
        message:
          code === "FORBIDDEN"
            ? "Hanya coordinator yang dapat mengubah titik geotag."
            : "Gagal menyimpan perubahan titik geotag.",
      },
    };
  }
}
