/**
 * Production report (SM/PM digest) integration tests.
 * Covers RPT-001 to RPT-007.
 *
 * report shape with seeded rows → days window → cap 100 → private files
 * hidden from non-owners → upcoming 48h window → non-member 404 →
 * share posts a bot chat message.
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
import { ReportsController } from '../../src/nest/reports/reports.controller';
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
  // list — clear them here so leftover rows can't collide with reused rowids.
  testDb.exec('DELETE FROM shifts');
  testDb.exec('DELETE FROM schedule_changes');
  resetRateLimits(nestApp);
  // The share throttle lives on the ReportsModule's own RateLimitService
  // instance (buckets are per-module) — reset it so reused rowids across
  // tests can't inherit an exhausted user:trip bucket.
  (nestApp.get(ReportsController, { strict: false }) as unknown as { rl: RateLimitService }).rl.reset();
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
});

// ── Seed helpers ─────────────────────────────────────────────────────────────

function insertChange(
  tripId: number,
  actorId: number | null,
  label: string,
  oldValue: string | null,
  newValue: string | null,
  createdAt?: string,
): void {
  testDb.prepare(`
    INSERT INTO schedule_changes (trip_id, actor_user_id, entity, label, field, old_value, new_value, created_at)
    VALUES (?, ?, 'reservation', ?, 'reservation_time', ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(tripId, actorId, label, oldValue, newValue, createdAt ?? null);
}

function insertFile(tripId: number, uploadedBy: number, name: string, isPrivate: 0 | 1): number {
  const res = testDb.prepare(`
    INSERT INTO trip_files (trip_id, filename, original_name, uploaded_by, is_private)
    VALUES (?, ?, ?, ?, ?)
  `).run(tripId, `stored-${name}`, name, uploadedBy, isPrivate);
  return Number(res.lastInsertRowid);
}

function insertShift(tripId: number, userId: number, startedAt: string, endedAt: string | null): void {
  testDb.prepare('INSERT INTO shifts (trip_id, user_id, started_at, ended_at) VALUES (?, ?, ?, ?)')
    .run(tripId, userId, startedAt, endedAt);
}

/** ISO-ish local-naive datetime ('YYYY-MM-DDTHH:MM') offset from now in hours. */
function isoIn(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString().slice(0, 16);
}

/** SQLite UTC timestamp offset from now in hours (for shift math). */
function sqlIn(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function insertReservation(tripId: number, title: string, time: string | null, status = 'pending'): void {
  testDb.prepare('INSERT INTO reservations (trip_id, title, reservation_time, status) VALUES (?, ?, ?, ?)')
    .run(tripId, title, time, status);
}

describe('Production report', () => {
  it('RPT-001 — GET /report returns the full digest with seeded rows', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);

    insertChange(trip.id, owner.id, 'Soundcheck', '2026-07-18T16:00', '2026-07-18T17:00');
    insertFile(trip.id, owner.id, 'stage-plot.pdf', 0);
    // finished 2h + open shift for the member
    insertShift(trip.id, owner.id, sqlIn(-5), sqlIn(-3));
    insertShift(trip.id, member.id, sqlIn(-1), null);
    insertReservation(trip.id, 'Doors', isoIn(6));

    const res = await request(app)
      .get(`/api/trips/${trip.id}/report`)
      .set('Cookie', authCookie(member.id));
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(7);

    expect(res.body.changes).toHaveLength(1);
    expect(res.body.changes[0]).toMatchObject({
      label: 'Soundcheck',
      old_value: '2026-07-18T16:00',
      new_value: '2026-07-18T17:00',
      actor_name: owner.username,
    });

    expect(res.body.files).toHaveLength(1);
    expect(res.body.files[0]).toMatchObject({ original_name: 'stage-plot.pdf', uploaded_by_name: owner.username });

    const totals = res.body.shifts as { user_id: number; username: string; total_seconds: number; open: number }[];
    const ownerTotal = totals.find(t => t.user_id === owner.id)!;
    const memberTotal = totals.find(t => t.user_id === member.id)!;
    expect(ownerTotal.total_seconds).toBe(2 * 3600);
    expect(ownerTotal.open).toBe(0);
    expect(memberTotal.open).toBe(1);
    expect(memberTotal.total_seconds).toBeGreaterThanOrEqual(3600 - 60);

    expect(res.body.upcoming).toHaveLength(1);
    expect(res.body.upcoming[0]).toMatchObject({ kind: 'reservation', title: 'Doors' });
  });

  it('RPT-002 — ?days windows changes and shift hours', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    insertChange(trip.id, user.id, 'Recent', '1', '2');
    insertChange(trip.id, user.id, 'Ancient', '3', '4', sqlIn(-10 * 24));
    insertShift(trip.id, user.id, sqlIn(-9 * 24), sqlIn(-9 * 24 + 1));

    const week = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(user.id));
    expect(week.status).toBe(200);
    expect(week.body.changes.map((c: { label: string }) => c.label)).toEqual(['Recent']);
    expect(week.body.shifts).toHaveLength(0);

    const month = await request(app).get(`/api/trips/${trip.id}/report?days=30`).set('Cookie', authCookie(user.id));
    expect(month.body.days).toBe(30);
    expect(month.body.changes).toHaveLength(2);
    expect(month.body.shifts).toHaveLength(1);
  });

  it('RPT-003 — changes are capped at 100, newest first', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    for (let i = 0; i < 105; i++) insertChange(trip.id, user.id, `Change ${i}`, null, String(i));

    const res = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(100);
    // Same created_at second for the whole burst → id DESC tiebreak = newest first.
    expect(res.body.changes[0].label).toBe('Change 104');
  });

  it('RPT-004 — private files are visible to their uploader only', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    insertFile(trip.id, owner.id, 'group-rider.pdf', 0);
    insertFile(trip.id, owner.id, 'private-notes.pdf', 1);

    const asMember = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(member.id));
    expect(asMember.status).toBe(200);
    expect(asMember.body.files.map((f: { original_name: string }) => f.original_name)).toEqual(['group-rider.pdf']);

    const asOwner = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(owner.id));
    const names = asOwner.body.files.map((f: { original_name: string }) => f.original_name);
    expect(names).toContain('group-rider.pdf');
    expect(names).toContain('private-notes.pdf');
  });

  it('RPT-005 — upcoming lists the next 48h only (reservations + timed assignments), soonest first', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    insertReservation(trip.id, 'Doors', isoIn(6));
    insertReservation(trip.id, 'Next week', isoIn(100));
    insertReservation(trip.id, 'Already done', isoIn(-3));
    insertReservation(trip.id, 'Cancelled thing', isoIn(5), 'cancelled');
    insertReservation(trip.id, 'Undated', null);

    // A timed day assignment inside the window (own reservation_datetime)…
    const dayRes = testDb.prepare('INSERT INTO days (trip_id, day_number, date) VALUES (?, 1, ?)')
      .run(trip.id, isoIn(24).slice(0, 10));
    const placeRes = testDb.prepare('INSERT INTO places (trip_id, name) VALUES (?, ?)').run(trip.id, 'Load in');
    testDb.prepare('INSERT INTO day_assignments (day_id, place_id, reservation_datetime) VALUES (?, ?, ?)')
      .run(dayRes.lastInsertRowid, placeRes.lastInsertRowid, isoIn(3));
    // …and an untimed assignment that must not appear.
    const silent = testDb.prepare('INSERT INTO places (trip_id, name) VALUES (?, ?)').run(trip.id, 'Untimed venue');
    testDb.prepare('INSERT INTO day_assignments (day_id, place_id) VALUES (?, ?)')
      .run(dayRes.lastInsertRowid, silent.lastInsertRowid);

    const res = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.upcoming.map((u: { kind: string; title: string }) => [u.kind, u.title])).toEqual([
      ['assignment', 'Load in'],
      ['reservation', 'Doors'],
    ]);
  });

  it('RPT-006 — non-members get 404 on GET and share', async () => {
    const { user: owner } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);

    const get = await request(app).get(`/api/trips/${trip.id}/report`).set('Cookie', authCookie(stranger.id));
    expect(get.status).toBe(404);
    const share = await request(app).post(`/api/trips/${trip.id}/report/share`).set('Cookie', authCookie(stranger.id)).send({});
    expect(share.status).toBe(404);
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM collab_messages WHERE trip_id = ?').get(trip.id)).toEqual({ c: 0 });
  });

  it('RPT-007 — POST /report/share posts the summary to chat as the Travla bot', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    insertChange(trip.id, user.id, 'Bus call', '08:00', '07:30');
    insertFile(trip.id, user.id, 'runsheet.pdf', 0);
    insertShift(trip.id, user.id, sqlIn(-2), null);
    insertReservation(trip.id, 'Doors', isoIn(4));

    const res = await request(app)
      .post(`/api/trips/${trip.id}/report/share`)
      .set('Cookie', authCookie(user.id))
      .send({ days: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shared: true });

    const bot = testDb.prepare("SELECT id FROM users WHERE username = 'travla-bot'").get() as { id: number } | undefined;
    expect(bot).toBeDefined();
    const messages = testDb.prepare(
      'SELECT text FROM collab_messages WHERE trip_id = ? AND user_id = ? ORDER BY id',
    ).all(trip.id, bot!.id) as { text: string }[];
    expect(messages).toHaveLength(1);
    const text = messages[0].text;
    expect(text).toContain('Production report — last 48h');
    expect(text).toContain('Bus call: 08:00 → 07:30');
    expect(text).toContain('Files loaded: 1');
    expect(text).toContain(`On shift now: ${user.username}`);
    expect(text).toContain('Doors');
    // Bot-voiced posts stay attributable to the member who triggered them.
    expect(text).toContain(`Shared by ${user.username}`);
  });

  it('RPT-008 — ?now anchors the 48h window to the caller\'s local wall clock', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    // Fixed local-naive times: only the two inside [08:00, +48h) may appear.
    insertReservation(trip.id, 'Tonight', '2030-05-01T22:00');
    insertReservation(trip.id, 'Late load-out', '2030-05-03T07:59');
    insertReservation(trip.id, 'Just missed', '2030-05-01T07:30');
    insertReservation(trip.id, 'Beyond', '2030-05-03T09:00');

    const res = await request(app)
      .get(`/api/trips/${trip.id}/report?now=2030-05-01T08:00`)
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.upcoming.map((u: { title: string }) => u.title)).toEqual(['Tonight', 'Late load-out']);

    // The shared summary's "Next up" uses the same caller-anchored window.
    const share = await request(app)
      .post(`/api/trips/${trip.id}/report/share`)
      .set('Cookie', authCookie(user.id))
      .send({ days: 2, now: '2030-05-01T08:00' });
    expect(share.status).toBe(200);
    const text = (testDb.prepare('SELECT text FROM collab_messages WHERE trip_id = ? ORDER BY id DESC LIMIT 1')
      .get(trip.id) as { text: string }).text;
    expect(text).toContain('Tonight');
    expect(text).not.toContain('Just missed');
    expect(text).not.toContain('Beyond');
  });

  it('RPT-009 — shifts overlapping the window count, clamped to the window start', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    // owner: STILL OPEN, signed on 26h ago — must appear in the 24h report
    // with ~24h of clamped hours and the `open` badge (matches buildSummary).
    insertShift(trip.id, owner.id, sqlIn(-26), null);
    // member: 30h shift that ended 1h ago — ~23h of it was inside the window.
    insertShift(trip.id, member.id, sqlIn(-31), sqlIn(-1));

    const res = await request(app)
      .get(`/api/trips/${trip.id}/report?days=1`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(200);
    const totals = res.body.shifts as { user_id: number; total_seconds: number; open: number }[];
    const ownerTotal = totals.find(t => t.user_id === owner.id)!;
    const memberTotal = totals.find(t => t.user_id === member.id)!;
    expect(ownerTotal.open).toBe(1);
    expect(Math.abs(ownerTotal.total_seconds - 24 * 3600)).toBeLessThan(120);
    expect(memberTotal.open).toBe(0);
    expect(Math.abs(memberTotal.total_seconds - 23 * 3600)).toBeLessThan(120);
  });

  it('RPT-010 — share is throttled per member+event (429 beyond the bucket)', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    for (let i = 0; i < 3; i++) {
      const ok = await request(app)
        .post(`/api/trips/${trip.id}/report/share`)
        .set('Cookie', authCookie(user.id))
        .send({});
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app)
      .post(`/api/trips/${trip.id}/report/share`)
      .set('Cookie', authCookie(user.id))
      .send({});
    expect(blocked.status).toBe(429);
    // Nothing beyond the allowed three landed in the chat.
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM collab_messages WHERE trip_id = ?').get(trip.id)).toEqual({ c: 3 });
  });

  it('RPT-011 — a failed bot post is a 502, never a silent { shared: true }', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    // Force the REAL failure path postBotMessage swallows: the chat insert dies.
    testDb.exec('ALTER TABLE collab_messages RENAME TO collab_messages_hidden');
    try {
      const res = await request(app)
        .post(`/api/trips/${trip.id}/report/share`)
        .set('Cookie', authCookie(user.id))
        .send({ days: 1 });
      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/chat/i);
    } finally {
      testDb.exec('ALTER TABLE collab_messages_hidden RENAME TO collab_messages');
    }
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM collab_messages WHERE trip_id = ?').get(trip.id)).toEqual({ c: 0 });
  });
});
