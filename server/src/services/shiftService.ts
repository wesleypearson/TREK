import { db } from '../db/database';

export { verifyTripAccess } from './tripAccess';

/**
 * Shifts — the rostering timeclock (custom). One row per sign-on; ended_at
 * NULL means the member is on shift right now. A partial UNIQUE index
 * (trip_id, user_id WHERE ended_at IS NULL) makes double sign-on a constraint
 * violation, so "one open shift per member per event" is enforced by the DB,
 * not by racy application checks. Coordinates are optional at both ends —
 * consent-first, like the Capture tool.
 */

export interface ShiftRow {
  id: number;
  trip_id: number;
  user_id: number;
  started_at: string;
  ended_at: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  note: string | null;
  created_at: string;
  username: string;
  avatar: string | null;
}

export interface ShiftTotalRow {
  user_id: number;
  username: string;
  total_seconds: number;
  open: number;
}

// Guests carry their human name in display_name (username stays the synthetic
// guest handle), so every read resolves the name the crew actually knows.
const SHIFT_SELECT = `
  SELECT s.*, COALESCE(u.display_name, u.username) AS username, u.avatar
  FROM shifts s
  JOIN users u ON u.id = s.user_id
`;

export function listShifts(tripId: string | number): ShiftRow[] {
  return db.prepare(`${SHIFT_SELECT} WHERE s.trip_id = ? ORDER BY s.started_at DESC, s.id DESC`).all(tripId) as ShiftRow[];
}

export function getShift(id: string | number, tripId: string | number): ShiftRow | undefined {
  return db.prepare(`${SHIFT_SELECT} WHERE s.id = ? AND s.trip_id = ?`).get(id, tripId) as ShiftRow | undefined;
}

/**
 * Per-member hour totals. An open shift counts up to "now" so the totals card
 * matches the live roster; `open` flags members currently on shift.
 */
export function getTotals(tripId: string | number): ShiftTotalRow[] {
  return db.prepare(`
    SELECT s.user_id,
      COALESCE(u.display_name, u.username) AS username,
      CAST(SUM(strftime('%s', COALESCE(s.ended_at, CURRENT_TIMESTAMP)) - strftime('%s', s.started_at)) AS INTEGER) AS total_seconds,
      MAX(CASE WHEN s.ended_at IS NULL THEN 1 ELSE 0 END) AS open
    FROM shifts s
    JOIN users u ON u.id = s.user_id
    WHERE s.trip_id = ?
    GROUP BY s.user_id
    ORDER BY total_seconds DESC
  `).all(tripId) as ShiftTotalRow[];
}

/**
 * Sign on. The partial UNIQUE index turns a double sign-on into a constraint
 * error, mapped here to { error: 'already_on' } for the controller's 409.
 */
export function startShift(
  tripId: string | number,
  userId: number,
  data: { lat?: number | null; lng?: number | null; note?: string | null },
): { shift?: ShiftRow; error?: 'already_on' } {
  try {
    const result = db.prepare(
      'INSERT INTO shifts (trip_id, user_id, start_lat, start_lng, note) VALUES (?, ?, ?, ?, ?)',
    ).run(
      tripId,
      userId,
      typeof data.lat === 'number' ? data.lat : null,
      typeof data.lng === 'number' ? data.lng : null,
      data.note ? String(data.note).slice(0, 500) : null,
    );
    const shift = db.prepare(`${SHIFT_SELECT} WHERE s.id = ?`).get(result.lastInsertRowid) as ShiftRow;
    return { shift };
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code.startsWith('SQLITE_CONSTRAINT')) return { error: 'already_on' };
    throw err;
  }
}

/** Sign off: stamp ended_at + the optional end fix. Only open shifts change. */
export function stopShift(
  id: string | number,
  tripId: string | number,
  data: { lat?: number | null; lng?: number | null },
): ShiftRow | undefined {
  const result = db.prepare(
    'UPDATE shifts SET ended_at = CURRENT_TIMESTAMP, end_lat = ?, end_lng = ? WHERE id = ? AND trip_id = ? AND ended_at IS NULL',
  ).run(
    typeof data.lat === 'number' ? data.lat : null,
    typeof data.lng === 'number' ? data.lng : null,
    id,
    tripId,
  );
  if (result.changes === 0) return undefined;
  return getShift(id, tripId);
}

export function deleteShift(id: string | number, tripId: string | number): boolean {
  return db.prepare('DELETE FROM shifts WHERE id = ? AND trip_id = ?').run(id, tripId).changes > 0;
}

/** Worked seconds of a shift (open shifts count up to now). SQLite stores UTC. */
export function shiftSeconds(shift: Pick<ShiftRow, 'started_at' | 'ended_at'>): number {
  const start = parseSqliteUtc(shift.started_at);
  const end = shift.ended_at ? parseSqliteUtc(shift.ended_at) : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

/** 'YYYY-MM-DD HH:MM:SS' (SQLite CURRENT_TIMESTAMP, UTC) → epoch millis. */
function parseSqliteUtc(value: string): number {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Date.parse(value) : ms;
}
