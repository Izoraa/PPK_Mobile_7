jest.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: jest.fn(),
}));

jest.mock("firebase/firestore", () => {
  const actual = jest.requireActual("firebase/firestore");
  return {
    ...actual,
    doc: jest.fn(),
    serverTimestamp: jest.fn(),
    updateDoc: jest.fn(),
  };
});

import { doc, GeoPoint, serverTimestamp, updateDoc } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/client";
import { updateGeotagPoint } from "@/features/geotag/geotagService";

const database = {} as ReturnType<typeof getFirebaseFirestore>;
const documentReference = {};

describe("updateGeotagPoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFirebaseFirestore as jest.Mock).mockReturnValue(database);
    (doc as jest.Mock).mockReturnValue(documentReference);
    (serverTimestamp as jest.Mock).mockReturnValue("server-timestamp");
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
  });

  it.each([
    ["latitude out of range", 90.1, 110.4, 50],
    ["longitude out of range", -7, 180.1, 50],
    ["zero radius", -7, 110.4, 0],
    ["empty document id", -7, 110.4, 50, ""],
  ])("rejects %s without writing", async (_caseName, latitude, longitude, radiusMeters, id = "lab-a") => {
    const result = await updateGeotagPoint(id, latitude, longitude, radiusMeters);

    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("writes only the geotag fields and update timestamp", async () => {
    const result = await updateGeotagPoint("lab-a", -7.0490375, 110.441484375, 50);

    expect(result).toEqual({ ok: true, data: undefined });
    expect(doc).toHaveBeenCalledWith(database, "laboratories", "lab-a");
    expect(updateDoc).toHaveBeenCalledWith(documentReference, {
      geoPoint: expect.any(GeoPoint),
      radiusMeters: 50,
      updatedAt: "server-timestamp",
    });
    const writtenGeoPoint = (updateDoc as jest.Mock).mock.calls[0][1].geoPoint as GeoPoint;
    expect(writtenGeoPoint.latitude).toBe(-7.0490375);
    expect(writtenGeoPoint.longitude).toBe(110.441484375);
  });
});
