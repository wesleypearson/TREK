/**
 * Per-user visibility integration tests (custom fork feature).
 *
 * Files: uploads are PRIVATE to the uploader by default and can be shared with
 * the trip group (PATCH /files/:id/visibility). Places: GROUP-visible by
 * default, with an is_private flag the creator can set. Private items must be
 * indistinguishable from missing ones (404) to other members and stay out of
 * lists, downloads, itinerary reads and public share links.
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

import { buildApp } from '../../src/bootstrap';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb, resetRateLimits } from '../helpers/test-db';
import { createUser, createTrip, addTripMember } from '../helpers/factories';
import { authCookie } from '../helpers/auth';

let nestApp: INestApplication;
let app: Application;
const FIXTURE_PDF = path.join(__dirname, '../fixtures/test.pdf');
const uploadsDir = path.join(__dirname, '../../uploads/files');

let owner: { id: number };
let member: { id: number };
let tripId: number;

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('allowed_file_types', '*')").run();
});

beforeEach(() => {
  resetTestDb(testDb);
  resetRateLimits(nestApp);
  testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('allowed_file_types', '*')").run();
  owner = createUser(testDb).user;
  member = createUser(testDb).user;
  const trip = createTrip(testDb, owner.id);
  tripId = trip.id;
  addTripMember(testDb, tripId, member.id);
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

async function upload(userId: number, fields: Record<string, string> = {}) {
  let req = request(app)
    .post(`/api/trips/${tripId}/files`)
    .set('Cookie', authCookie(userId));
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  return req.attach('file', FIXTURE_PDF);
}

const listFiles = (userId: number, trash = false) =>
  request(app).get(`/api/trips/${tripId}/files${trash ? '?trash=true' : ''}`).set('Cookie', authCookie(userId));

describe('File privacy (VIS-FILE)', () => {
  it('VIS-FILE-001: uploads are private by default — hidden from other members', async () => {
    const up = await upload(owner.id);
    expect(up.status).toBe(201);
    expect(up.body.file.is_private).toBe(1);

    const mine = await listFiles(owner.id);
    expect(mine.body.files).toHaveLength(1);

    const theirs = await listFiles(member.id);
    expect(theirs.body.files).toHaveLength(0);
  });

  it('VIS-FILE-002: uploading with is_private=0 shares with the group immediately', async () => {
    const up = await upload(owner.id, { is_private: '0' });
    expect(up.status).toBe(201);
    expect(up.body.file.is_private).toBe(0);

    const theirs = await listFiles(member.id);
    expect(theirs.body.files).toHaveLength(1);
  });

  it('VIS-FILE-003: private file download 404s for other members but works for the uploader', async () => {
    const up = await upload(owner.id);
    const fileId = up.body.file.id;

    const otherDownload = await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}/download`)
      .set('Cookie', authCookie(member.id));
    expect(otherDownload.status).toBe(404);

    const ownDownload = await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}/download`)
      .set('Cookie', authCookie(owner.id));
    expect(ownDownload.status).toBe(200);
  });

  it('VIS-FILE-004: uploader can share with the group and take it back', async () => {
    const up = await upload(owner.id);
    const fileId = up.body.file.id;

    const share = await request(app)
      .patch(`/api/trips/${tripId}/files/${fileId}/visibility`)
      .set('Cookie', authCookie(owner.id))
      .send({ is_private: false });
    expect(share.status).toBe(200);
    expect(share.body.file.is_private).toBe(0);
    expect((await listFiles(member.id)).body.files).toHaveLength(1);

    const unshare = await request(app)
      .patch(`/api/trips/${tripId}/files/${fileId}/visibility`)
      .set('Cookie', authCookie(owner.id))
      .send({ is_private: true });
    expect(unshare.status).toBe(200);
    expect((await listFiles(member.id)).body.files).toHaveLength(0);
  });

  it('VIS-FILE-005: only the uploader may change visibility (403 on shared, 404 on private)', async () => {
    const shared = await upload(owner.id, { is_private: '0' });
    const sharedId = shared.body.file.id;
    const forbidden = await request(app)
      .patch(`/api/trips/${tripId}/files/${sharedId}/visibility`)
      .set('Cookie', authCookie(member.id))
      .send({ is_private: true });
    expect(forbidden.status).toBe(403);

    const priv = await upload(owner.id);
    const privId = priv.body.file.id;
    const invisible = await request(app)
      .patch(`/api/trips/${tripId}/files/${privId}/visibility`)
      .set('Cookie', authCookie(member.id))
      .send({ is_private: false });
    expect(invisible.status).toBe(404);
  });

  it('VIS-FILE-006: mutations on another member\'s private file 404 (update/star/delete/links)', async () => {
    const up = await upload(owner.id);
    const fileId = up.body.file.id;
    const asMember = (fn: (r: request.Test) => request.Test, method: 'put' | 'patch' | 'delete' | 'get', url: string) =>
      fn(request(app)[method](url).set('Cookie', authCookie(member.id)));

    expect((await asMember(r => r.send({ description: 'x' }), 'put', `/api/trips/${tripId}/files/${fileId}`)).status).toBe(404);
    expect((await asMember(r => r, 'patch', `/api/trips/${tripId}/files/${fileId}/star`)).status).toBe(404);
    expect((await asMember(r => r, 'delete', `/api/trips/${tripId}/files/${fileId}`)).status).toBe(404);
    expect((await asMember(r => r, 'get', `/api/trips/${tripId}/files/${fileId}/links`)).status).toBe(404);
  });

  it('VIS-FILE-007: trash listing and empty-trash are scoped to the acting user\'s view', async () => {
    const up = await upload(owner.id);
    const fileId = up.body.file.id;
    await request(app).delete(`/api/trips/${tripId}/files/${fileId}`).set('Cookie', authCookie(owner.id));

    expect((await listFiles(member.id, true)).body.files).toHaveLength(0);
    expect((await listFiles(owner.id, true)).body.files).toHaveLength(1);

    const emptied = await request(app)
      .delete(`/api/trips/${tripId}/files/trash/empty`)
      .set('Cookie', authCookie(member.id));
    expect(emptied.status).toBe(200);
    // The owner's private trashed file survived the other member's empty-trash.
    expect((await listFiles(owner.id, true)).body.files).toHaveLength(1);
  });
});

describe('Place visibility (VIS-PLACE)', () => {
  const createPlaceAs = (userId: number, body: Record<string, unknown>) =>
    request(app).post(`/api/trips/${tripId}/places`).set('Cookie', authCookie(userId)).send(body);
  const listPlacesAs = (userId: number) =>
    request(app).get(`/api/trips/${tripId}/places`).set('Cookie', authCookie(userId));

  it('VIS-PLACE-001: places are group-visible by default', async () => {
    const res = await createPlaceAs(owner.id, { name: 'Group Cafe' });
    expect(res.status).toBe(201);
    expect(res.body.place.is_private).toBe(0);
    expect(res.body.place.created_by).toBe(owner.id);

    expect((await listPlacesAs(member.id)).body.places).toHaveLength(1);
  });

  it('VIS-PLACE-002: a private place is invisible to other members (list + GET 404)', async () => {
    const res = await createPlaceAs(owner.id, { name: 'Secret Spot', is_private: true });
    expect(res.body.place.is_private).toBe(1);
    const placeId = res.body.place.id;

    expect((await listPlacesAs(member.id)).body.places).toHaveLength(0);
    expect((await listPlacesAs(owner.id)).body.places).toHaveLength(1);

    const get = await request(app).get(`/api/trips/${tripId}/places/${placeId}`).set('Cookie', authCookie(member.id));
    expect(get.status).toBe(404);
  });

  it('VIS-PLACE-003: other members cannot update or delete a private place (404)', async () => {
    const res = await createPlaceAs(owner.id, { name: 'Secret Spot', is_private: true });
    const placeId = res.body.place.id;

    const upd = await request(app)
      .put(`/api/trips/${tripId}/places/${placeId}`)
      .set('Cookie', authCookie(member.id))
      .send({ name: 'Hijacked' });
    expect(upd.status).toBe(404);

    const del = await request(app)
      .delete(`/api/trips/${tripId}/places/${placeId}`)
      .set('Cookie', authCookie(member.id));
    expect(del.status).toBe(404);
  });

  it('VIS-PLACE-004: the creator can flip a place between private and group', async () => {
    const res = await createPlaceAs(owner.id, { name: 'Flip Spot', is_private: true });
    const placeId = res.body.place.id;

    const share = await request(app)
      .put(`/api/trips/${tripId}/places/${placeId}`)
      .set('Cookie', authCookie(owner.id))
      .send({ name: 'Flip Spot', is_private: false });
    expect(share.status).toBe(200);
    expect(share.body.place.is_private).toBe(0);
    expect((await listPlacesAs(member.id)).body.places).toHaveLength(1);
  });

  it('VIS-PLACE-005: a non-creator\'s is_private flag on a group place is ignored', async () => {
    const res = await createPlaceAs(owner.id, { name: 'Group Spot' });
    const placeId = res.body.place.id;

    const upd = await request(app)
      .put(`/api/trips/${tripId}/places/${placeId}`)
      .set('Cookie', authCookie(member.id))
      .send({ name: 'Group Spot', is_private: true });
    expect(upd.status).toBe(200);
    expect(upd.body.place.is_private).toBe(0);
    expect((await listPlacesAs(owner.id)).body.places).toHaveLength(1);
  });

  it('VIS-PLACE-006: itinerary reads hide assignments of another member\'s private place', async () => {
    const place = (await createPlaceAs(owner.id, { name: 'Secret Spot', is_private: true })).body.place;
    const dayRes = await request(app)
      .post(`/api/trips/${tripId}/days`)
      .set('Cookie', authCookie(owner.id))
      .send({ date: '2027-01-01' });
    const dayId = dayRes.body.day.id;
    const assign = await request(app)
      .post(`/api/trips/${tripId}/days/${dayId}/assignments`)
      .set('Cookie', authCookie(owner.id))
      .send({ place_id: place.id });
    expect(assign.status).toBe(201);

    const ownerDays = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie(owner.id));
    expect(ownerDays.body.days[0].assignments).toHaveLength(1);

    const memberDays = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie(member.id));
    expect(memberDays.body.days[0].assignments).toHaveLength(0);
  });

  it('VIS-PLACE-007: another member cannot assign an invisible private place (404)', async () => {
    const place = (await createPlaceAs(owner.id, { name: 'Secret Spot', is_private: true })).body.place;
    const dayRes = await request(app)
      .post(`/api/trips/${tripId}/days`)
      .set('Cookie', authCookie(owner.id))
      .send({ date: '2027-01-02' });
    const dayId = dayRes.body.day.id;

    const assign = await request(app)
      .post(`/api/trips/${tripId}/days/${dayId}/assignments`)
      .set('Cookie', authCookie(member.id))
      .send({ place_id: place.id });
    expect(assign.status).toBe(404);
  });

  it('VIS-PLACE-008: the offline bundle is scoped to the viewer', async () => {
    await createPlaceAs(owner.id, { name: 'Secret Spot', is_private: true });
    await createPlaceAs(owner.id, { name: 'Group Spot' });

    const ownerBundle = await request(app).get(`/api/trips/${tripId}/bundle`).set('Cookie', authCookie(owner.id));
    expect(ownerBundle.body.places).toHaveLength(2);

    const memberBundle = await request(app).get(`/api/trips/${tripId}/bundle`).set('Cookie', authCookie(member.id));
    expect(memberBundle.body.places).toHaveLength(1);
  });
});
