/**
 * Expenses feature integration tests (personal vs group expenses + AI receipt
 * scanning). Covers EXP-001 to EXP-010.
 *
 * Budget items are GROUP expenses by default (is_private=0, visible to every
 * trip member). A PERSONAL expense (is_private=1) is visible only to its
 * creator, is indistinguishable from a missing item to everyone else (404 on
 * mutations), and never contributes to the settlement or per-person maths.
 * Receipt scanning stores the upload as a PRIVATE trip file and extracts the
 * line items via the configured LLM (mocked here).
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

// No live FX in tests: rates unavailable → identity conversion. The trip has no
// currency set (→ EUR) and all items are entered without one, so the settlement
// maths is exact either way; this just keeps the suite off the network.
vi.mock('../../src/services/exchangeRateService', () => ({
  getRates: vi.fn(async () => null),
  convertWithRates: (amount: number) => amount,
}));

// Receipt scanning: pretend an admin configured a vision-capable OpenAI model,
// and stub the LLM client so `extract` returns a canned parsed receipt.
vi.mock('../../src/nest/llm-parse/llm-config.resolver', () => ({
  resolveLlmConfig: vi.fn(() => ({ provider: 'openai', model: 'test', multimodal: true })),
}));
const extractMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/nest/llm-parse/llm-client.factory', () => ({
  createLlmClient: () => ({ extract: extractMock }),
}));

import { buildApp } from '../../src/bootstrap';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb, resetRateLimits } from '../helpers/test-db';
import { createUser, createTrip, addTripMember } from '../helpers/factories';
import { authCookie } from '../helpers/auth';
import { resolveLlmConfig } from '../../src/nest/llm-parse/llm-config.resolver';

let nestApp: INestApplication;
let app: Application;
const uploadsDir = path.join(__dirname, '../../uploads/files');

// A tiny-but-real single-part upload: multer only needs bytes + the PNG
// mimetype (inferred by supertest from the .png filename); the "pixels" go
// straight to the mocked LLM client, so magic bytes are plenty.
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const PARSED_RECEIPT = {
  merchant: 'Cafe X',
  date: '2026-07-01',
  currency: 'AUD',
  total: 30,
  items: [
    { name: 'Coffee', price: 10 },
    { name: 'Cake', price: 20 },
  ],
};

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
  extractMock.mockReset();
  extractMock.mockResolvedValue([PARSED_RECEIPT]);
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

const createItemAs = (userId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/trips/${tripId}/budget`).set('Cookie', authCookie(userId)).send(body);
const listItemsAs = (userId: number) =>
  request(app).get(`/api/trips/${tripId}/budget`).set('Cookie', authCookie(userId));
const listFilesAs = (userId: number) =>
  request(app).get(`/api/trips/${tripId}/files`).set('Cookie', authCookie(userId));
const scanReceiptAs = (userId: number) =>
  request(app)
    .post(`/api/trips/${tripId}/budget/receipt-scan`)
    .set('Cookie', authCookie(userId))
    .attach('file', PNG_BYTES, 'receipt.png');

describe('Personal vs group expenses (EXP)', () => {
  it('EXP-001: creating a budget item defaults to a GROUP expense', async () => {
    const res = await createItemAs(owner.id, { name: 'Group Dinner', total_price: 80 });
    expect(res.status).toBe(201);
    expect(res.body.item.is_private).toBe(0);
    expect(res.body.item.created_by).toBe(owner.id);
  });

  it('EXP-002: a personal expense is visible only to its creator in the list', async () => {
    const priv = await createItemAs(owner.id, { name: 'Solo Massage', total_price: 50, is_private: true });
    expect(priv.status).toBe(201);
    expect(priv.body.item.is_private).toBe(1);
    await createItemAs(owner.id, { name: 'Shared Taxi', total_price: 20 });

    const mine = await listItemsAs(owner.id);
    expect(mine.body.items).toHaveLength(2);

    const theirs = await listItemsAs(member.id);
    expect(theirs.body.items).toHaveLength(1);
    expect(theirs.body.items[0].name).toBe('Shared Taxi');
  });

  it('EXP-003: another member cannot update or delete a personal expense (404); the creator can', async () => {
    const res = await createItemAs(owner.id, { name: 'Secret Snack', total_price: 15, is_private: true });
    const itemId = res.body.item.id;

    const upd = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(member.id))
      .send({ name: 'Hijacked' });
    expect(upd.status).toBe(404);

    const del = await request(app)
      .delete(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(member.id));
    expect(del.status).toBe(404);

    const ownUpd = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(owner.id))
      .send({ name: 'Renamed Snack' });
    expect(ownUpd.status).toBe(200);
    expect(ownUpd.body.item.name).toBe('Renamed Snack');

    const ownDel = await request(app)
      .delete(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(owner.id));
    expect(ownDel.status).toBe(200);
    expect(ownDel.body.success).toBe(true);
  });

  it('EXP-004: a non-creator setting is_private on a GROUP item is ignored', async () => {
    const res = await createItemAs(owner.id, { name: 'Group Lunch', total_price: 40 });
    const itemId = res.body.item.id;

    const upd = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(member.id))
      .send({ name: 'Group Lunch', is_private: true });
    expect(upd.status).toBe(200);
    expect(upd.body.item.is_private).toBe(0);

    // Still visible to everyone.
    expect((await listItemsAs(owner.id)).body.items).toHaveLength(1);
  });

  it('EXP-005: the creator can flip a personal expense to group and the other member then sees it', async () => {
    const res = await createItemAs(owner.id, { name: 'Was Personal', total_price: 25, is_private: true });
    const itemId = res.body.item.id;
    expect((await listItemsAs(member.id)).body.items).toHaveLength(0);

    const share = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(owner.id))
      .send({ is_private: false });
    expect(share.status).toBe(200);
    expect(share.body.item.is_private).toBe(0);

    const theirs = await listItemsAs(member.id);
    expect(theirs.body.items).toHaveLength(1);
    expect(theirs.body.items[0].id).toBe(itemId);
  });

  it('EXP-006: settlement excludes personal expenses', async () => {
    // Group: owner paid 100, member owes the whole split.
    await createItemAs(owner.id, {
      name: 'Group Hotel',
      payers: [{ user_id: owner.id, amount: 100 }],
      member_ids: [member.id],
    });
    // Personal: same shape but private — must not add another 50 of debt.
    await createItemAs(owner.id, {
      name: 'Personal Spa',
      payers: [{ user_id: owner.id, amount: 50 }],
      member_ids: [member.id],
      is_private: true,
    });

    const res = await request(app)
      .get(`/api/trips/${tripId}/budget/settlement`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(200);

    expect(res.body.flows).toHaveLength(1);
    expect(res.body.flows[0].from.user_id).toBe(member.id);
    expect(res.body.flows[0].to.user_id).toBe(owner.id);
    expect(res.body.flows[0].amount).toBeCloseTo(100); // not 150

    const ownerBalance = res.body.balances.find((b: any) => b.user_id === owner.id);
    const memberBalance = res.body.balances.find((b: any) => b.user_id === member.id);
    expect(ownerBalance.balance).toBeCloseTo(100);
    expect(memberBalance.balance).toBeCloseTo(-100);
  });

  it('EXP-007: per-person summary excludes personal expenses', async () => {
    await createItemAs(owner.id, {
      name: 'Group Hotel',
      payers: [{ user_id: owner.id, amount: 100 }],
      member_ids: [member.id],
    });
    await createItemAs(owner.id, {
      name: 'Personal Spa',
      payers: [{ user_id: owner.id, amount: 50 }],
      member_ids: [member.id],
      is_private: true,
    });

    const res = await request(app)
      .get(`/api/trips/${tripId}/budget/summary/per-person`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveLength(1);
    const entry = res.body.summary[0];
    expect(entry.user_id).toBe(member.id);
    expect(entry.items_count).toBe(1);
    expect(entry.total_assigned).toBeCloseTo(100); // not 150
  });

  it('EXP-011: a personal expense is never split — foreign payers/members collapse to the owner', async () => {
    // Whatever split the client sends, a personal expense is lodged as the
    // owner's own spend: sole payer (full amount) and sole member.
    const res = await createItemAs(owner.id, {
      name: 'Solo Dinner',
      total_price: 60,
      is_private: true,
      payers: [{ user_id: member.id, amount: 60 }],
      members: [{ user_id: member.id, amount: 30 }, { user_id: owner.id, amount: 30 }],
    });
    expect(res.status).toBe(201);
    const item = res.body.item;
    expect(item.is_private).toBe(1);
    expect(item.payers).toEqual([expect.objectContaining({ user_id: owner.id, amount: 60 })]);
    expect(item.members).toEqual([expect.objectContaining({ user_id: owner.id })]);
    expect(item.total_price).toBe(60);
  });

  it('EXP-012: flipping a group expense to personal purges the other participants', async () => {
    const res = await createItemAs(owner.id, {
      name: 'Was Shared',
      payers: [{ user_id: member.id, amount: 90 }],
      members: [{ user_id: owner.id, amount: null }, { user_id: member.id, amount: null }],
    });
    const itemId = res.body.item.id;
    expect(res.body.item.members).toHaveLength(2);

    const flip = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}`)
      .set('Cookie', authCookie(owner.id))
      .send({ is_private: true });
    expect(flip.status).toBe(200);
    expect(flip.body.item.is_private).toBe(1);
    // Member is gone from both sides; the owner self-pays the frozen total.
    expect(flip.body.item.members).toEqual([expect.objectContaining({ user_id: owner.id })]);
    expect(flip.body.item.payers).toEqual([expect.objectContaining({ user_id: owner.id, amount: 90 })]);
  });

  it('EXP-013: the members and payers endpoints cannot attach others to a personal expense', async () => {
    const res = await createItemAs(owner.id, { name: 'Mine Alone', total_price: 40, is_private: true });
    const itemId = res.body.item.id;

    const mem = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}/members`)
      .set('Cookie', authCookie(owner.id))
      .send({ user_ids: [owner.id, member.id] });
    expect(mem.status).toBe(200);
    expect(mem.body.members).toEqual([expect.objectContaining({ user_id: owner.id })]);

    const pay = await request(app)
      .put(`/api/trips/${tripId}/budget/${itemId}/payers`)
      .set('Cookie', authCookie(owner.id))
      .send({ payers: [{ user_id: member.id, amount: 40 }] });
    expect(pay.status).toBe(200);
    expect(pay.body.item.payers).toEqual([expect.objectContaining({ user_id: owner.id, amount: 40 })]);
  });

  it('EXP-014: a personal expense never reads as unfinished nor leaks into settlement', async () => {
    // Created without any payers at all — the server self-pays it for the owner.
    const res = await createItemAs(owner.id, { name: 'Own Coffee', total_price: 12.5, is_private: true });
    expect(res.body.item.payers).toEqual([expect.objectContaining({ user_id: owner.id, amount: 12.5 })]);

    const settle = await request(app)
      .get(`/api/trips/${tripId}/budget/settlement`)
      .set('Cookie', authCookie(owner.id));
    expect(settle.status).toBe(200);
    expect(settle.body.flows).toEqual([]);
    expect((settle.body.balances || []).every((b: { balance: number }) => Math.abs(b.balance) < 0.005)).toBe(true);
  });
});

describe('Receipt scanning (EXP)', () => {
  it('EXP-008: scans a receipt via the mocked LLM and stores it as the uploader\'s private file', async () => {
    const res = await scanReceiptAs(owner.id);
    expect(res.status).toBe(200);

    expect(res.body.receipt.merchant).toBe('Cafe X');
    expect(res.body.receipt.date).toBe('2026-07-01');
    expect(res.body.receipt.currency).toBe('AUD');
    expect(res.body.receipt.total).toBe(30);
    expect(res.body.receipt.items).toHaveLength(2);
    expect(res.body.receipt.items[0]).toEqual({ name: 'Coffee', price: 10 });
    expect(res.body.receipt.items[1]).toEqual({ name: 'Cake', price: 20 });

    expect(res.body.file.id).toBeDefined();
    expect(res.body.file.is_private).toBe(1);

    // The stored receipt is PRIVATE to the uploader.
    expect((await listFilesAs(owner.id)).body.files).toHaveLength(1);
    expect((await listFilesAs(member.id)).body.files).toHaveLength(0);
  });

  it('EXP-009: 409 when no AI is configured — but the stored file is still returned', async () => {
    vi.mocked(resolveLlmConfig).mockReturnValueOnce(null);

    const res = await scanReceiptAs(owner.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
    expect(res.body.file).toBeDefined();
    expect(res.body.file.id).toBeDefined();

    // The upload survived for a manual expense to attach to.
    expect((await listFilesAs(owner.id)).body.files).toHaveLength(1);
  });

  it('EXP-010: creating an expense with receipt_file_id links the stored receipt', async () => {
    const scan = await scanReceiptAs(owner.id);
    expect(scan.status).toBe(200);
    const fileId = scan.body.file.id;

    const create = await createItemAs(owner.id, {
      name: 'Cafe X',
      total_price: 30,
      receipt_file_id: fileId,
    });
    expect(create.status).toBe(201);
    expect(create.body.item.receipt_file_id).toBe(fileId);

    const list = await listItemsAs(owner.id);
    const item = (list.body.items as any[]).find((i) => i.id === create.body.item.id);
    expect(item).toBeDefined();
    expect(item.receipt_file_id).toBe(fileId);
  });
});
