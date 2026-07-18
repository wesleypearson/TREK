/**
 * Integrity watcher integration tests (custom). Covers INT-001 to INT-006.
 *
 * Timing-relevant writes land in schedule_changes and are debounced per trip
 * into ONE crew-wide announcement: a Travla-bot message in the event chat,
 * an in-app 'schedule_change' notification to every crew member, and a direct
 * email to each GUEST member with a real contact_email (guests are excluded
 * from the regular notification fanout by design). Group-visible file loads
 * are announced by the bot immediately; private files never are.
 *
 * The 5s debounce is bypassed with __flushNowForTests for determinism.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { INestApplication } from '@nestjs/common';
import path from 'path';
import fs from 'fs';

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
    getPlaceWithTags: (placeId: number) => {
      const place: any = db.prepare(`SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon FROM places p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(placeId);
      if (!place) return null;
      const tags = db.prepare(`SELECT t.* FROM tags t JOIN place_tags pt ON t.id = pt.tag_id WHERE pt.place_id = ?`).all(placeId);
      return { ...place, category: place.category_id ? { id: place.category_id, name: place.category_name, color: place.category_color, icon: place.category_icon } : null, tags };
    },
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

// Guest emails go out over nodemailer — capture sendMail instead of the network.
const sendMailMock = vi.hoisted(() => vi.fn(async () => ({ accepted: [] })));
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}));

import { buildApp } from '../../src/bootstrap';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb, resetRateLimits } from '../helpers/test-db';
import { createUser, createTrip, addTripMember } from '../helpers/factories';
import { authCookie } from '../helpers/auth';
import { __flushNowForTests, sweepPendingScheduleChanges, postBotMessage } from '../../src/services/integrityService';

let nestApp: INestApplication;
let app: Application;
const uploadsDir = path.join(__dirname, '../../uploads/files');

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let owner: { id: number; username: string };
let member: { id: number };
let tripId: number;

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
});

beforeEach(() => {
  resetTestDb(testDb);
  resetRateLimits(nestApp);
  // schedule_changes carries FK'd audit rows across resets — clear explicitly
  // so a reused trip id can never inherit another test's pending changes.
  testDb.prepare('DELETE FROM schedule_changes').run();
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('allowed_file_types', '*')").run();
  owner = createUser(testDb).user;
  member = createUser(testDb).user;
  const trip = createTrip(testDb, owner.id);
  tripId = trip.id;
  addTripMember(testDb, tripId, member.id);
  sendMailMock.mockClear();
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

// ── Helpers ────────────────────────────────────────────────────────────────

const createReservation = async (title: string, time: string): Promise<number> => {
  const res = await request(app)
    .post(`/api/trips/${tripId}/reservations`)
    .set('Cookie', authCookie(owner.id))
    .send({ title, type: 'activity', reservation_time: time });
  expect(res.status).toBe(201);
  return res.body.reservation.id;
};

const editReservationTime = async (id: number, title: string, time: string) => {
  const res = await request(app)
    .put(`/api/trips/${tripId}/reservations/${id}`)
    .set('Cookie', authCookie(owner.id))
    .send({ title, reservation_time: time });
  expect(res.status).toBe(200);
};

const scheduleChangeRows = () =>
  testDb.prepare('SELECT * FROM schedule_changes WHERE trip_id = ? ORDER BY id').all(tripId) as any[];

const botMessages = () =>
  testDb.prepare('SELECT * FROM collab_messages WHERE trip_id = ? ORDER BY id').all(tripId) as any[];

const scheduleNotifs = () =>
  testDb.prepare("SELECT * FROM notifications WHERE title_key = 'notif.schedule_change.title'").all() as any[];

const configureSmtp = () => {
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('smtp_host', 'smtp.test.example.com')").run();
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('smtp_port', '587')").run();
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('smtp_from', 'travla@test.example.com')").run();
};

const addGuestWithContactEmail = (contactEmail: string): number => {
  const res = testDb.prepare(
    "INSERT INTO users (username, email, password_hash, role, is_guest, contact_email) VALUES (?, ?, '', 'user', 1, ?)"
  ).run(`guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, `guest-${Math.random().toString(36).slice(2, 10)}@guests.invalid`, contactEmail);
  const guestId = Number(res.lastInsertRowid);
  addTripMember(testDb, tripId, guestId);
  return guestId;
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Integrity watcher (INT)', () => {
  it('INT-001: a reservation timing edit records a schedule change and flushes as ONE bot message + crew notifications', async () => {
    const resId = await createReservation('Soundcheck', '2026-07-01 15:00');
    await editReservationTime(resId, 'Soundcheck', '2026-07-01 16:30');

    // The audit row lands synchronously, un-broadcast.
    let rows = scheduleChangeRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entity: 'reservation',
      entity_id: resId,
      label: 'Soundcheck',
      field: 'reservation_time',
      old_value: '2026-07-01 15:00',
      new_value: '2026-07-01 16:30',
      source: 'edit',
      actor_user_id: owner.id,
      broadcast_at: null,
    });
    expect(botMessages()).toHaveLength(0); // debounced — nothing until flush

    await __flushNowForTests(tripId);

    // ONE bot chat message listing the change.
    const messages = botMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('⚠ Timings changed');
    expect(messages[0].text).toContain('Soundcheck: 2026-07-01 15:00 → 2026-07-01 16:30');
    const botUser = testDb.prepare("SELECT id FROM users WHERE username = 'travla-bot'").get() as any;
    expect(messages[0].user_id).toBe(botUser.id);

    // The flushed row is stamped.
    rows = scheduleChangeRows();
    expect(rows[0].broadcast_at).not.toBeNull();

    // In-app notification rows reach ALL crew (owner AND member — no actor exclusion).
    const notifs = scheduleNotifs();
    const recipients = notifs.map((n: any) => n.recipient_id).sort();
    expect(recipients).toEqual([owner.id, member.id].sort());

    // A second flush must not re-announce already-broadcast changes.
    await __flushNowForTests(tripId);
    expect(botMessages()).toHaveLength(1);
    expect(scheduleNotifs()).toHaveLength(notifs.length);
  });

  it('INT-002: a 3-edit burst flushes as ONE bot message listing all three changes', async () => {
    const a = await createReservation('Soundcheck', '2026-07-01 15:00');
    const b = await createReservation('Doors', '2026-07-01 18:00');
    const c = await createReservation('Load-in', '2026-07-01 10:00');

    await editReservationTime(a, 'Soundcheck', '2026-07-01 16:30');
    await editReservationTime(b, 'Doors', '2026-07-01 19:00');
    await editReservationTime(c, 'Load-in', '2026-07-01 11:00');

    expect(scheduleChangeRows()).toHaveLength(3);
    await __flushNowForTests(tripId);

    const messages = botMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('Soundcheck: 2026-07-01 15:00 → 2026-07-01 16:30');
    expect(messages[0].text).toContain('Doors: 2026-07-01 18:00 → 2026-07-01 19:00');
    expect(messages[0].text).toContain('Load-in: 2026-07-01 10:00 → 2026-07-01 11:00');
    // Every row stamped in the same flush.
    expect(scheduleChangeRows().every((r: any) => r.broadcast_at !== null)).toBe(true);
  });

  it('INT-003: a non-timing reservation edit records nothing', async () => {
    const resId = await createReservation('Soundcheck', '2026-07-01 15:00');
    const res = await request(app)
      .put(`/api/trips/${tripId}/reservations/${resId}`)
      .set('Cookie', authCookie(owner.id))
      .send({ title: 'Soundcheck (main hall)', reservation_time: '2026-07-01 15:00' });
    expect(res.status).toBe(200);
    expect(scheduleChangeRows()).toHaveLength(0);
    await __flushNowForTests(tripId);
    expect(botMessages()).toHaveLength(0);
  });

  it('INT-004: a GROUP-visible file load is announced by the bot; a private one never is', async () => {
    const shared = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .set('Cookie', authCookie(owner.id))
      .field('is_private', '0')
      .attach('file', PNG_BYTES, 'stageplot.png');
    expect(shared.status).toBe(201);

    let messages = botMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('📎');
    expect(messages[0].text).toContain(owner.username);
    expect(messages[0].text).toContain('stageplot.png');
    // No schedule_changes row for file loads — chat announcement only.
    expect(scheduleChangeRows()).toHaveLength(0);

    // Default upload is PRIVATE — it must not be announced.
    const priv = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .set('Cookie', authCookie(owner.id))
      .attach('file', PNG_BYTES, 'secret-notes.png');
    expect(priv.status).toBe(201);
    messages = botMessages();
    expect(messages).toHaveLength(1);
    expect(messages.some((m: any) => m.text.includes('secret-notes.png'))).toBe(false);
  });

  it('INT-005: a guest member with contact_email gets a direct email on flush', async () => {
    configureSmtp();
    const guestId = addGuestWithContactEmail('roadie@example.com');

    const resId = await createReservation('Soundcheck', '2026-07-01 15:00');
    await editReservationTime(resId, 'Soundcheck', '2026-07-01 16:30');
    await __flushNowForTests(tripId);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0] as any;
    expect(mail.to).toBe('roadie@example.com');
    expect(mail.subject).toContain('Timings changed');
    expect(mail.text).toContain('Soundcheck');
    expect(mail.html).toContain('Soundcheck');

    // The guest must NOT appear in the in-app fanout (guests have no inbox).
    const guestNotifs = scheduleNotifs().filter((n: any) => n.recipient_id === guestId);
    expect(guestNotifs).toHaveLength(0);
  });

  it('INT-006: without SMTP the guest email is silently skipped (announcement still posts)', async () => {
    addGuestWithContactEmail('roadie@example.com');

    const resId = await createReservation('Soundcheck', '2026-07-01 15:00');
    await editReservationTime(resId, 'Soundcheck', '2026-07-01 16:30');
    await __flushNowForTests(tripId);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(botMessages()).toHaveLength(1); // the rest of the flush is unaffected
  });

  /** Pending row inserted directly, as if its debounce timer died with a restart. */
  const insertPendingChange = (label: string, ageSql: string): void => {
    testDb.prepare(`
      INSERT INTO schedule_changes (trip_id, actor_user_id, entity, label, field, old_value, new_value, created_at)
      VALUES (?, ?, 'reservation', ?, 'reservation_time', '18:00', '19:00', datetime('now', ?))
    `).run(tripId, owner.id, label, ageSql);
  };

  it('INT-007: the boot/periodic sweep announces changes orphaned by a restart', async () => {
    insertPendingChange('Doors', '-5 minutes');
    // A second trip with a FRESH pending row (a live debounce timer would still
    // own it) must be left alone by the sweep.
    const otherTrip = createTrip(testDb, owner.id);
    testDb.prepare(`
      INSERT INTO schedule_changes (trip_id, actor_user_id, entity, label, field, old_value, new_value)
      VALUES (?, ?, 'reservation', 'Fresh', 'reservation_time', '10:00', '11:00')
    `).run(otherTrip.id, owner.id);

    await sweepPendingScheduleChanges();

    const messages = botMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('⚠ Timings changed');
    expect(messages[0].text).toContain('Doors: 18:00 → 19:00');
    expect(scheduleChangeRows()[0].broadcast_at).not.toBeNull();
    // Crew notifications went out exactly like a normal flush.
    expect(scheduleNotifs().length).toBeGreaterThan(0);
    // The fresh row on the other trip is untouched (still pending, unannounced).
    const fresh = testDb.prepare('SELECT broadcast_at FROM schedule_changes WHERE trip_id = ?').get(otherTrip.id) as { broadcast_at: string | null };
    expect(fresh.broadcast_at).toBeNull();
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM collab_messages WHERE trip_id = ?').get(otherTrip.id)).toEqual({ c: 0 });
  });

  it('INT-008: stale pending changes are stamped WITHOUT announcing (no time-warp)', async () => {
    insertPendingChange('Ancient move', '-2 days');

    await sweepPendingScheduleChanges();

    // Stamped so it can never flush later as a fresh "Timings changed"…
    expect(scheduleChangeRows()[0].broadcast_at).not.toBeNull();
    // …but nothing was announced: no chat message, no notifications, no email.
    expect(botMessages()).toHaveLength(0);
    expect(scheduleNotifs()).toHaveLength(0);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('INT-009: the bot username is reserved — registration and rename are rejected', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      username: 'travla-bot',
      email: 'attacker@example.com',
      password: 'Str0ng!Pass',
    });
    expect(reg.status).toBe(400);
    expect(reg.body.error).toMatch(/reserved/i);

    // Synthetic guest/bot namespaces are reserved too.
    const guestReg = await request(app).post('/api/auth/register').send({
      username: 'guest-roadie',
      email: 'attacker2@example.com',
      password: 'Str0ng!Pass',
    });
    expect(guestReg.status).toBe(400);

    // Renaming an existing real account into the bot identity is blocked.
    const rename = await request(app)
      .put('/api/auth/me/settings')
      .set('Cookie', authCookie(member.id))
      .send({ username: 'Travla-Bot' });
    expect(rename.status).toBe(400);
    expect(rename.body.error).toMatch(/reserved/i);
    const unchanged = testDb.prepare('SELECT username FROM users WHERE id = ?').get(member.id) as { username: string };
    expect(unchanged.username).not.toBe('Travla-Bot');
  });

  it('INT-010: a real account carrying the bot username can never author bot messages', async () => {
    // Simulate a legacy squatter: a non-guest row already owns 'travla-bot'
    // (possible only on databases from before the reserved-name guard).
    const res = testDb.prepare(
      "INSERT INTO users (username, email, password_hash, role, is_guest) VALUES ('travla-bot', 'squatter@example.com', 'x', 'user', 0)"
    ).run();
    const squatterId = Number(res.lastInsertRowid);

    // ensureBotUser refuses to resolve the non-guest row; the announcement
    // fails safe instead of speaking as the squatter.
    expect(postBotMessage(tripId, 'system says hi')).toBe(false);
    const authored = testDb.prepare('SELECT COUNT(*) AS c FROM collab_messages WHERE user_id = ?').get(squatterId) as { c: number };
    expect(authored.c).toBe(0);
    expect(botMessages()).toHaveLength(0);
  });
});
