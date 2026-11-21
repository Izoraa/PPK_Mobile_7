jest.mock('@/lib/firebase/client', () => ({
  getFirebaseFirestore: jest.fn(),
}));

import { getLabActivitySummary, type LabSessionActivity } from '@/features/geotag/activityService';
import type { GeotagPoint } from '@/features/geotag/geotagService';

const point: GeotagPoint = {
  id: 'lab-b-doc',
  geotagId: 'B',
  name: 'Lab Informatika B',
  latitude: -7.0482375,
  longitude: 110.440765625,
  radiusMeters: 50,
};

const now = new Date('2026-11-21T03:00:00.000Z');

function session(
  id: string,
  room: string,
  status: LabSessionActivity['status'],
  startsAt: string,
  endsAt: string,
): LabSessionActivity {
  return {
    id,
    classId: 'class-1',
    className: 'Informatika A',
    classCode: 'IF-A',
    title: `Praktikum ${id}`,
    room,
    status,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    timeZone: 'Asia/Jakarta',
  };
}

describe('lab activity selection', () => {
  it('returns the open session in progress and the nearest upcoming non-closed session for the selected lab', () => {
    const sessions = [
      session('current', 'Lab Informatika B', 'open', '2026-11-21T02:30:00.000Z', '2026-11-21T04:00:00.000Z'),
      session('next-later', 'Lab Informatika B', 'not_open', '2026-11-21T06:00:00.000Z', '2026-11-21T07:00:00.000Z'),
      session('next', 'Lab Informatika B', 'not_open', '2026-11-21T04:00:00.000Z', '2026-11-21T05:00:00.000Z'),
      session('closed', 'Lab Informatika B', 'closed', '2026-11-21T03:30:00.000Z', '2026-11-21T04:30:00.000Z'),
      session('other-room', 'Lab Informatika C', 'open', '2026-11-21T02:00:00.000Z', '2026-11-21T05:00:00.000Z'),
    ];

    const summary = getLabActivitySummary(point, sessions, now);

    expect(summary.current?.id).toBe('current');
    expect(summary.next?.id).toBe('next');
  });

  it('returns no activity when the selected lab has no active or upcoming session', () => {
    const summary = getLabActivitySummary(
      point,
      [session('past', 'Lab Informatika B', 'closed', '2026-11-21T01:00:00.000Z', '2026-11-21T02:00:00.000Z')],
      now,
    );

    expect(summary).toEqual({ current: null, next: null });
  });
});
