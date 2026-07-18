/**
 * Shifts (rostering timeclock) integration tests.
 * Covers SHF-001 to SHF-012.
 *
 * start → double-start 409 → stop → totals math → non-member 404 →
 * foreign stop denied → delete rules → Travla bot chat announcements.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { INestApplication } from '@nestjs/common';

const { testDb, dbMock } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  const mock = {
    db,
    closeDb: () => {},
    reinitialize: () => {},
    getPlaceWithTags: () => null,
    canAccessTrip: (tripId: any, userId: number) =>
      db.prepare(`SELECT t.id, t.user_id FROM trips t LEFT JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ? WHERE t.id = ? AND (t.user_id = ? OR m.user_id IS NOT NULL)`).get(userId, tripId, userId),
    isOwner: (tripId: any, userId: number) =>
      !!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
  };
  return { testDb: db, dbMock: mock };
});

vi.mock('../../src/db/database', () => dbMock);
vi.mock('../../src/config', () => ({
  JWT_SECRET: 'test-jwt-secret-for-trek-testing-only',
  ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2',
  updateJwtSecret: () => {},
  SESSION_DURATION: '24h',
  SESSION_DURATION_MS: 86400000,
  SESSION_DURATION_SECONDS: 86400,
  DEFAULT_LANGUAGE: 'en',
}));
vi.mock('../../src/websocket', () => ({ broadcast: vi.fn(), broadcastToUser: vi.fn() }));

import { buildApp } from '../../src/bootstrap';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb, resetRateLimits } from '../helpers/test-db';
import { createUser, createTrip, addTripMember } from '../helpers/factories';
import { authCookie } from '../helpers/auth';
import { broadcast } from '../../src/websocket';
import { ShiftsController } from '../../src/nest/shifts/shifts.controller';
import type { RateLimitService } from '../../src/nest/auth/rate-limit.service';

let nestApp: INestApplication;
let app: Application;

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
});

beforeEach(() => {
  resetTestDb(testDb);
  // shifts / schedule_changes are epic-new tables not in the shared RESET_TABLES
  // list — clear them here so a leftover open shift can't collide with a reused
  // trip/user rowid from an earlier test.
  testDb.exec('DELETE FROM shifts');
  testDb.exec('DELETE FROM schedule_changes');
  resetRateLimits(nestApp);
  // The timeclock throttle lives on the ShiftsModule's own RateLimitService
  // instance (buckets are per-module) — reset it so reused rowids across tests
  // can't inherit an exhausted user:trip bucket.
  (nestApp.get(ShiftsController, { strict: false }) as unknown as { rl: RateLimitService }).rl.reset();
  vi.mocked(broadcast).mockClear();
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
});

/** Insert a finished shift directly, with exact timestamps for totals math. */
function insertShift(
  tripId: number,
  userId: number,
  startedAt: string,
  endedAt: string | null,
): number {
  const res = testDb.prepare(
    'INSERT INTO shifts (trip_id, user_id, started_at, ended_at) VALUES (?, ?, ?, ?)',
  ).run(tripId, userId, startedAt, endedAt);
  return Number(res.lastInsertRowid);
}

describe('Shifts timeclock', () => {
  it('SHF-001 — POST /shifts/start signs the member on and broadcasts', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/start`)
      .set('Cookie', authCookie(user.id))
      .send({ lat: -33.8688, lng: 151.2093, note: 'load in' });
    expect(res.status).toBe(201);
    expect(res.body.shift.user_id).toBe(user.id);
    expect(res.body.shift.ended_at).toBeNull();
    expect(res.body.shift.start_lat).toBeCloseTo(-33.8688);
    expect(res.body.shift.start_lng).toBeCloseTo(151.2093);
    expect(res.body.shift.note).toBe('load in');
    expect(res.body.shift.username).toBe(user.username);
    expect(vi.mocked(broadcast)).toHaveBeenCalledWith(
      String(trip.id), 'shift:started', expect.objectContaining({ shift: expect.anything() }), undefined,
    );
  });

  it('SHF-002 — starting twice returns 409 Already on shift', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/start`)
      .set('Cookie', authCookie(user.id))
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Already on shift');
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM shifts WHERE trip_id = ?').get(trip.id)).toEqual({ c: 1 });
  });

  it('SHF-003 — POST /shifts/:id/stop signs off with end coords and broadcasts', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const start = await request(app)
      .post(`/api/trips/${trip.id}/shifts/start`)
      .set('Cookie', authCookie(user.id))
      .send({});
    const shiftId = start.body.shift.id;

    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/${shiftId}/stop`)
      .set('Cookie', authCookie(user.id))
      .send({ lat: -33.9, lng: 151.21 });
    expect(res.status).toBe(200);
    expect(res.body.shift.ended_at).not.toBeNull();
    expect(res.body.shift.end_lat).toBeCloseTo(-33.9);
    expect(res.body.shift.end_lng).toBeCloseTo(151.21);
    expect(vi.mocked(broadcast)).toHaveBeenCalledWith(
      String(trip.id), 'shift:stopped', expect.objectContaining({ shift: expect.anything() }), undefined,
    );

    // A member can sign on again after signing off (partial index only guards open shifts).
    const again = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
    expect(again.status).toBe(201);
  });

  it('SHF-004 — stopping an already-ended shift returns 409', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = insertShift(trip.id, user.id, '2026-07-01 10:00:00', '2026-07-01 12:00:00');

    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/${id}/stop`)
      .set('Cookie', authCookie(user.id))
      .send({});
    expect(res.status).toBe(409);
  });

  it('SHF-005 — GET /shifts lists newest first with usernames and totals math', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);

    // owner: 2h30m + 1h  = 12600 s; member: 45m = 2700 s
    insertShift(trip.id, owner.id, '2026-07-01 10:00:00', '2026-07-01 12:30:00');
    insertShift(trip.id, owner.id, '2026-07-02 09:00:00', '2026-07-02 10:00:00');
    insertShift(trip.id, member.id, '2026-07-02 11:00:00', '2026-07-02 11:45:00');

    const res = await request(app)
      .get(`/api/trips/${trip.id}/shifts`)
      .set('Cookie', authCookie(member.id));
    expect(res.status).toBe(200);
    expect(res.body.shifts).toHaveLength(3);
    // Newest first
    expect(res.body.shifts[0].started_at).toBe('2026-07-02 11:00:00');
    expect(res.body.shifts[0].username).toBe(member.username);
    expect(res.body.shifts[2].started_at).toBe('2026-07-01 10:00:00');

    const totals = res.body.totals as { user_id: number; username: string; total_seconds: number; open: number }[];
    const ownerTotal = totals.find(t => t.user_id === owner.id)!;
    const memberTotal = totals.find(t => t.user_id === member.id)!;
    expect(ownerTotal.total_seconds).toBe(12600);
    expect(ownerTotal.open).toBe(0);
    expect(ownerTotal.username).toBe(owner.username);
    expect(memberTotal.total_seconds).toBe(2700);
    // Biggest total first
    expect(totals[0].user_id).toBe(owner.id);
  });

  it('SHF-006 — an open shift counts toward its member total and flags open', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});

    const res = await request(app).get(`/api/trips/${trip.id}/shifts`).set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    const total = res.body.totals.find((t: { user_id: number }) => t.user_id === user.id);
    expect(total.open).toBe(1);
    expect(total.total_seconds).toBeGreaterThanOrEqual(0);
    expect(total.total_seconds).toBeLessThan(60);
  });

  it('SHF-007 — non-members get 404 on every endpoint', async () => {
    const { user: owner } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const id = insertShift(trip.id, owner.id, '2026-07-01 10:00:00', null);

    const list = await request(app).get(`/api/trips/${trip.id}/shifts`).set('Cookie', authCookie(stranger.id));
    expect(list.status).toBe(404);
    const start = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(stranger.id)).send({});
    expect(start.status).toBe(404);
    const stop = await request(app).post(`/api/trips/${trip.id}/shifts/${id}/stop`).set('Cookie', authCookie(stranger.id)).send({});
    expect(stop.status).toBe(404);
    const del = await request(app).delete(`/api/trips/${trip.id}/shifts/${id}`).set('Cookie', authCookie(stranger.id));
    expect(del.status).toBe(404);
  });

  it('SHF-008 — a member cannot stop someone else\'s shift (member_manage)', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const id = insertShift(trip.id, owner.id, '2026-07-01 10:00:00', null);

    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/${id}/stop`)
      .set('Cookie', authCookie(member.id))
      .send({});
    expect(res.status).toBe(403);
    expect(testDb.prepare('SELECT ended_at FROM shifts WHERE id = ?').get(id)).toEqual({ ended_at: null });
  });

  it('SHF-009 — the event owner CAN stop a member\'s shift', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const id = insertShift(trip.id, member.id, '2026-07-01 10:00:00', null);

    const res = await request(app)
      .post(`/api/trips/${trip.id}/shifts/${id}/stop`)
      .set('Cookie', authCookie(owner.id))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.shift.ended_at).not.toBeNull();
  });

  it('SHF-010 — delete: own shift OK, foreign shift 403 for members, owner OK, missing 404', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const own = insertShift(trip.id, member.id, '2026-07-01 08:00:00', '2026-07-01 09:00:00');
    const foreign = insertShift(trip.id, owner.id, '2026-07-01 10:00:00', '2026-07-01 11:00:00');
    const memberShift2 = insertShift(trip.id, member.id, '2026-07-02 08:00:00', '2026-07-02 09:00:00');

    // member deletes own → 200
    const delOwn = await request(app).delete(`/api/trips/${trip.id}/shifts/${own}`).set('Cookie', authCookie(member.id));
    expect(delOwn.status).toBe(200);
    // member deletes owner's → 403
    const delForeign = await request(app).delete(`/api/trips/${trip.id}/shifts/${foreign}`).set('Cookie', authCookie(member.id));
    expect(delForeign.status).toBe(403);
    // owner deletes the member's → 200 (member_manage default: trip owner)
    const delAsOwner = await request(app).delete(`/api/trips/${trip.id}/shifts/${memberShift2}`).set('Cookie', authCookie(owner.id));
    expect(delAsOwner.status).toBe(200);
    // gone → 404
    const delMissing = await request(app).delete(`/api/trips/${trip.id}/shifts/${own}`).set('Cookie', authCookie(member.id));
    expect(delMissing.status).toBe(404);
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM shifts WHERE trip_id = ?').get(trip.id)).toEqual({ c: 1 });
  });

  it('SHF-011 — a shift id from another trip is not addressable (404)', async () => {
    const { user } = createUser(testDb);
    const tripA = createTrip(testDb, user.id);
    const tripB = createTrip(testDb, user.id);
    const idInB = insertShift(tripB.id, user.id, '2026-07-01 10:00:00', null);

    const stop = await request(app)
      .post(`/api/trips/${tripA.id}/shifts/${idInB}/stop`)
      .set('Cookie', authCookie(user.id))
      .send({});
    expect(stop.status).toBe(404);
    const del = await request(app).delete(`/api/trips/${tripA.id}/shifts/${idInB}`).set('Cookie', authCookie(user.id));
    expect(del.status).toBe(404);
  });

  it('SHF-012 — sign-on and sign-off are announced by the Travla bot in chat', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    const start = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
    // Backdate past the sub-minute announcement floor so the sign-off speaks too.
    testDb.prepare("UPDATE shifts SET started_at = datetime('now', '-2 minutes') WHERE id = ?").run(start.body.shift.id);
    await request(app).post(`/api/trips/${trip.id}/shifts/${start.body.shift.id}/stop`).set('Cookie', authCookie(user.id)).send({});

    const bot = testDb.prepare("SELECT id FROM users WHERE username = 'travla-bot'").get() as { id: number } | undefined;
    expect(bot).toBeDefined();
    const messages = testDb.prepare(
      'SELECT text FROM collab_messages WHERE trip_id = ? AND user_id = ? ORDER BY id',
    ).all(trip.id, bot!.id) as { text: string }[];
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe(`🕐 ${user.username} signed on`);
    expect(messages[1].text).toMatch(new RegExp(`^🕐 ${user.username} signed off after \\d+h \\d+m$`));
  });

  it('SHF-013 — a sub-minute shift announces the sign-on only (no sign-off spam)', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    const start = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
    const stop = await request(app).post(`/api/trips/${trip.id}/shifts/${start.body.shift.id}/stop`).set('Cookie', authCookie(user.id)).send({});
    expect(stop.status).toBe(200);
    expect(stop.body.shift.ended_at).not.toBeNull(); // the roster still records it

    const messages = testDb.prepare('SELECT text FROM collab_messages WHERE trip_id = ? ORDER BY id').all(trip.id) as { text: string }[];
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe(`🕐 ${user.username} signed on`);
  });

  it('SHF-014 — the timeclock is throttled per member+event (429 beyond the bucket)', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    // 5 start→stop cycles = 10 clock actions: the whole bucket.
    for (let i = 0; i < 5; i++) {
      const start = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
      expect(start.status).toBe(201);
      const stop = await request(app).post(`/api/trips/${trip.id}/shifts/${start.body.shift.id}/stop`).set('Cookie', authCookie(user.id)).send({});
      expect(stop.status).toBe(200);
    }
    const blocked = await request(app).post(`/api/trips/${trip.id}/shifts/start`).set('Cookie', authCookie(user.id)).send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);

    // The whole loop produced only the 5 sign-on lines — every sub-minute
    // sign-off was suppressed, so the chat cannot be flooded through the bot.
    const messages = testDb.prepare('SELECT text FROM collab_messages WHERE trip_id = ?').all(trip.id) as { text: string }[];
    expect(messages).toHaveLength(5);
    expect(messages.every(m => m.text.endsWith('signed on'))).toBe(true);
  });
});
