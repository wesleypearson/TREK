/**
 * Public expense tabs integration tests (custom). Covers TAB-001 to TAB-014.
 *
 * A tab is a per-person running balance the owner shares as an unguessable
 * public link (/api/public/tabs/:token — no account needed). Owner-side CRUD
 * lives under /api/trips/:tripId/expense-tabs and is strictly personal: every
 * query is scoped to the calling user, so a foreign tab id 404s. Items freeze
 * label/amount/currency/date (and optionally the receipt) at share time;
 * payments the owner records reduce the balance; the visitor may claim their
 * name exactly once. Creating a tab also mints a one-use trip-bound
 * invite_tokens row surfaced as join_url on the public page.
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

// No live FX in tests: rates unavailable → identity conversion. Budget items
// entered with a foreign currency would otherwise hit the network to freeze a
// rate at entry time; this keeps the suite offline (tab items freeze the raw
// amount anyway, so no math here depends on FX).
vi.mock('../../src/services/exchangeRateService', () => ({
  getRates: vi.fn(async () => null),
  convertWithRates: (amount: number) => amount,
}));

// Receipt scanning: pretend an admin configured a vision-capable OpenAI model,
// and stub the LLM client — the scan endpoint is only used here as the
// canonical way to create a REAL receipt file on disk + its trip_files row.
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
import { invalidatePermissionsCache } from '../../src/services/permissions';
import { PublicExpenseTabController } from '../../src/nest/expense-tabs/public-expense-tab.controller';
import type { RateLimitService } from '../../src/nest/auth/rate-limit.service';

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
  items: [{ name: 'Coffee', price: 10 }],
};

let owner: { id: number; username: string };
let member: { id: number };
let outsider: { id: number };
let tripId: number;
let tripTitle: string;

/**
 * The expense tab tables are newer than RESET_TABLES in helpers/test-db.ts, so
 * resetTestDb does not clear them (and its FK-off deletes suppress the CASCADE
 * from trips/users) — clear them explicitly for per-test isolation.
 */
function resetTabTables(): void {
  testDb.exec('DELETE FROM expense_tab_payments; DELETE FROM expense_tab_items; DELETE FROM expense_tabs;');
}

/**
 * The ExpenseTabsModule provides its OWN RateLimitService instance (distinct
 * from the AuthModule one that resetRateLimits clears), so resolve it through
 * the public controller — same trick resetRateLimits uses for auth.
 */
function resetTabRateLimits(): void {
  const ctrl = nestApp.get(PublicExpenseTabController, { strict: false }) as unknown as { rl: RateLimitService };
  ctrl.rl.reset();
}

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
});

beforeEach(() => {
  resetTestDb(testDb);
  resetTabTables();
  resetRateLimits(nestApp);
  resetTabRateLimits();
  invalidatePermissionsCache();
  owner = createUser(testDb).user;
  member = createUser(testDb).user;
  outsider = createUser(testDb).user;
  const trip = createTrip(testDb, owner.id);
  tripId = trip.id;
  tripTitle = trip.title;
  addTripMember(testDb, tripId, member.id);
  extractMock.mockReset();
  extractMock.mockResolvedValue([PARSED_RECEIPT]);
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

const createTabAs = (userId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/trips/${tripId}/expense-tabs`).set('Cookie', authCookie(userId)).send(body);
const listTabsAs = (userId: number) =>
  request(app).get(`/api/trips/${tripId}/expense-tabs`).set('Cookie', authCookie(userId));
const addItemAs = (userId: number, tabId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/trips/${tripId}/expense-tabs/${tabId}/items`).set('Cookie', authCookie(userId)).send(body);
const addPaymentAs = (userId: number, tabId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/trips/${tripId}/expense-tabs/${tabId}/payments`).set('Cookie', authCookie(userId)).send(body);
const revokeAs = (userId: number, tabId: number, body: Record<string, unknown> = {}) =>
  request(app).post(`/api/trips/${tripId}/expense-tabs/${tabId}/revoke`).set('Cookie', authCookie(userId)).send(body);
const publicGet = (token: string) => request(app).get(`/api/public/tabs/${token}`);
const claim = (token: string, body: Record<string, unknown>) =>
  request(app).post(`/api/public/tabs/${token}/claim`).send(body);

const createBudgetItemAs = (userId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/trips/${tripId}/budget`).set('Cookie', authCookie(userId)).send(body);
const scanReceiptAs = (userId: number) =>
  request(app)
    .post(`/api/trips/${tripId}/budget/receipt-scan`)
    .set('Cookie', authCookie(userId))
    .attach('file', PNG_BYTES, 'receipt.png');

/** Create a tab as the trip owner and hand back the created tab object. */
async function makeTab(body: Record<string, unknown> = { first_name: 'Guest' }) {
  const res = await createTabAs(owner.id, body);
  expect(res.status).toBe(201);
  return res.body.tab as {
    id: number; token: string; join_token: string; first_name: string; last_name: string;
    currency: string | null; charged: number; paid: number; balance: number;
  };
}

/** Fetch a single tab back through the owner list endpoint (recomputed totals). */
async function ownerTab(tabId: number) {
  const res = await listTabsAs(owner.id);
  expect(res.status).toBe(200);
  return (res.body.tabs as any[]).find((t) => t.id === tabId);
}

/** Store a real receipt on disk + trip_files row via the scan endpoint (mocked AI). */
async function makeReceiptFile(): Promise<number> {
  const res = await scanReceiptAs(owner.id);
  expect(res.status).toBe(200);
  return res.body.file.id as number;
}

/** superagent buffers text/JSON only — collect the raw stream for byte asserts. */
function binaryParser(res: any, callback: (err: Error | null, body: Buffer) => void): void {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => { data += chunk; });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

const receiptGet = (token: string, itemId: number) =>
  request(app).get(`/api/public/tabs/${token}/items/${itemId}/receipt`).buffer(true).parse(binaryParser);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Public expense tabs (TAB)', () => {
  it('TAB-001: create tab — 403 without budget_edit, 400 without first_name, success mints token + one-use trip-bound invite', async () => {
    // A member demoted below budget_edit (admin set the action to trip_owner) is refused.
    testDb.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('perm_budget_edit', 'trip_owner')").run();
    invalidatePermissionsCache();
    const forbidden = await createTabAs(member.id, { first_name: 'Nope' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe('No permission');
    testDb.prepare("DELETE FROM app_settings WHERE key = 'perm_budget_edit'").run();
    invalidatePermissionsCache();

    // Validation: first_name is mandatory and must not be blank.
    expect((await createTabAs(owner.id, {})).status).toBe(400);
    const blank = await createTabAs(owner.id, { first_name: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('first_name is required');

    // Success shape: fresh tab with zeroed totals and both tokens.
    const res = await createTabAs(owner.id, { first_name: 'Poppy', last_name: 'Nguyen', currency: 'aud' });
    expect(res.status).toBe(201);
    const tab = res.body.tab;
    expect(tab.id).toBeGreaterThan(0);
    expect(tab.trip_id).toBe(tripId);
    expect(tab.owner_user_id).toBe(owner.id);
    expect(tab.first_name).toBe('Poppy');
    expect(tab.last_name).toBe('Nguyen');
    expect(tab.currency).toBe('AUD'); // normalized upper-case
    expect(tab.token).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes, base64url
    expect(tab.join_token).toMatch(/^[0-9a-f]{32}$/); // 16 random bytes, hex
    expect(tab.revoked_at).toBeNull();
    expect(tab.claimed_at).toBeNull();
    expect(tab.charged).toBe(0);
    expect(tab.paid).toBe(0);
    expect(tab.balance).toBe(0);
    expect(tab.items).toEqual([]);
    expect(tab.payments).toEqual([]);

    // Creating the tab also inserted a one-use, non-expiring, trip-bound invite.
    const invite = testDb.prepare('SELECT * FROM invite_tokens WHERE token = ?').get(tab.join_token) as any;
    expect(invite).toBeDefined();
    expect(invite.trip_id).toBe(tripId);
    expect(invite.max_uses).toBe(1);
    expect(invite.used_count).toBe(0);
    expect(invite.expires_at).toBeNull();
    expect(invite.created_by).toBe(owner.id);
  });

  it('TAB-002: tabs are strictly per-owner — another member neither sees nor can touch them (404)', async () => {
    const tab = await makeTab({ first_name: 'Ana' });
    const item = (await addItemAs(owner.id, tab.id, { label: 'Kayak', amount: 30 })).body.item;

    // The member has budget_edit (default trip_member level) but the tab isn't theirs.
    const mine = await listTabsAs(owner.id);
    expect(mine.body.tabs).toHaveLength(1);
    const theirs = await listTabsAs(member.id);
    expect(theirs.status).toBe(200);
    expect(theirs.body.tabs).toEqual([]);

    // Every mutation and the export answer 404 for a foreign tab id.
    expect((await addItemAs(member.id, tab.id, { label: 'Hijack', amount: 5 })).status).toBe(404);
    expect((await addPaymentAs(member.id, tab.id, { amount: 5 })).status).toBe(404);
    expect((await revokeAs(member.id, tab.id)).status).toBe(404);
    const delItem = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}/items/${item.id}`)
      .set('Cookie', authCookie(member.id));
    expect(delItem.status).toBe(404);
    const delTab = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}`)
      .set('Cookie', authCookie(member.id));
    expect(delTab.status).toBe(404);
    const csv = await request(app)
      .get(`/api/trips/${tripId}/expense-tabs/${tab.id}/export.csv`)
      .set('Cookie', authCookie(member.id));
    expect(csv.status).toBe(404);

    // Nothing leaked or changed on the owner's tab.
    const after = await ownerTab(tab.id);
    expect(after.items).toHaveLength(1);
    expect(after.charged).toBeCloseTo(30, 2);
  });

  it('TAB-003: free-form items + balance math to the cent; deleting an item recomputes', async () => {
    const tab = await makeTab({ first_name: 'Milo' });

    // Item validation: amount is required, must be > 0, and a label is needed
    // when no budget item backs the charge.
    const noAmount = await addItemAs(owner.id, tab.id, { label: 'x' });
    expect(noAmount.status).toBe(400);
    expect(noAmount.body.error).toBe('amount is required');
    const zero = await addItemAs(owner.id, tab.id, { label: 'x', amount: 0 });
    expect(zero.status).toBe(400);
    expect(zero.body.error).toBe('Amount must be greater than zero');
    expect((await addItemAs(owner.id, tab.id, { label: 'x', amount: -3 })).status).toBe(400);
    const noLabel = await addItemAs(owner.id, tab.id, { amount: 5 });
    expect(noLabel.status).toBe(400);
    expect(noLabel.body.error).toBe('A label is required');

    const i1 = await addItemAs(owner.id, tab.id, { label: 'Kayak hire', amount: 10.55 });
    expect(i1.status).toBe(201);
    expect(i1.body.item.label).toBe('Kayak hire');
    expect(i1.body.item.amount).toBeCloseTo(10.55, 2);
    expect(i1.body.item.budget_item_id).toBeNull();
    expect(i1.body.item.share_receipt).toBe(0);
    const i2 = await addItemAs(owner.id, tab.id, { label: 'Dinner', amount: 20.45 });
    expect(i2.status).toBe(201);
    const pay = await addPaymentAs(owner.id, tab.id, { amount: 15.25, note: 'cash' });
    expect(pay.status).toBe(201);

    let t = await ownerTab(tab.id);
    expect(t.items).toHaveLength(2);
    expect(t.payments).toHaveLength(1);
    expect(t.charged).toBeCloseTo(31, 2);
    expect(t.paid).toBeCloseTo(15.25, 2);
    expect(t.balance).toBeCloseTo(15.75, 2);

    // Deleting a charge recomputes the balance.
    const del = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}/items/${i1.body.item.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    t = await ownerTab(tab.id);
    expect(t.items).toHaveLength(1);
    expect(t.charged).toBeCloseTo(20.45, 2);
    expect(t.balance).toBeCloseTo(5.2, 2);

    // Same item again → gone → 404.
    const again = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}/items/${i1.body.item.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(again.status).toBe(404);
  });

  it('TAB-004: budget-backed item freezes label/currency/date + receipt; share_receipt without a receipt stays 0', async () => {
    const fileId = await makeReceiptFile();
    const withReceipt = await createBudgetItemAs(owner.id, {
      name: 'Cafe X', total_price: 30, currency: 'USD', expense_date: '2026-07-01', receipt_file_id: fileId,
    });
    expect(withReceipt.status).toBe(201);
    const noReceipt = await createBudgetItemAs(owner.id, { name: 'Ferry', total_price: 18, expense_date: '2026-07-02' });
    expect(noReceipt.status).toBe(201);

    const tab = await makeTab({ first_name: 'Iris', currency: 'AUD' });

    // Frozen from the budget item: label, currency, date, receipt pointer.
    const frozen = await addItemAs(owner.id, tab.id, { budget_item_id: withReceipt.body.item.id, amount: 12.5, share_receipt: true });
    expect(frozen.status).toBe(201);
    expect(frozen.body.item.budget_item_id).toBe(withReceipt.body.item.id);
    expect(frozen.body.item.label).toBe('Cafe X');
    expect(frozen.body.item.currency).toBe('USD');
    expect(frozen.body.item.expense_date).toBe('2026-07-01');
    expect(frozen.body.item.amount).toBeCloseTo(12.5, 2); // the tab charge, not the budget total
    expect(frozen.body.item.share_receipt).toBe(1);
    expect(frozen.body.item.receipt_file_id).toBe(fileId);

    // An explicit label wins over the budget item's name.
    const labelled = await addItemAs(owner.id, tab.id, { budget_item_id: withReceipt.body.item.id, label: 'Split of Cafe X', amount: 1 });
    expect(labelled.status).toBe(201);
    expect(labelled.body.item.label).toBe('Split of Cafe X');

    // share_receipt only sticks when the budget item actually HAS a receipt.
    const noShare = await addItemAs(owner.id, tab.id, { budget_item_id: noReceipt.body.item.id, amount: 18, share_receipt: true });
    expect(noShare.status).toBe(201);
    expect(noShare.body.item.share_receipt).toBe(0);
    expect(noShare.body.item.receipt_file_id).toBeNull();
    expect(noShare.body.item.currency).toBe('AUD'); // falls back to the tab currency
    expect(noShare.body.item.expense_date).toBe('2026-07-02');

    const pub = await publicGet(tab.token);
    expect(pub.status).toBe(200);
    const pubFrozen = (pub.body.items as any[]).find((i) => i.id === frozen.body.item.id);
    const pubNoShare = (pub.body.items as any[]).find((i) => i.id === noShare.body.item.id);
    expect(pubFrozen.has_receipt).toBe(true);
    expect(pubNoShare.has_receipt).toBe(false);
  });

  it("TAB-005: another user's PERSONAL expense cannot be charged (400 'Expense not found'); one's own can", async () => {
    const theirs = await createBudgetItemAs(member.id, { name: 'B secret', total_price: 50, is_private: true });
    expect(theirs.status).toBe(201);
    const mine = await createBudgetItemAs(owner.id, { name: 'A personal', total_price: 40, is_private: true });
    expect(mine.status).toBe(201);

    const tab = await makeTab({ first_name: 'Nia' });

    // Another member's personal expense is indistinguishable from a missing one.
    const foreign = await addItemAs(owner.id, tab.id, { budget_item_id: theirs.body.item.id, amount: 25 });
    expect(foreign.status).toBe(400);
    expect(foreign.body.error).toBe('Expense not found');

    // A bogus id gets the same answer.
    const bogus = await addItemAs(owner.id, tab.id, { budget_item_id: 999999, amount: 25 });
    expect(bogus.status).toBe(400);
    expect(bogus.body.error).toBe('Expense not found');

    // The caller's OWN personal expense works and freezes its name.
    const own = await addItemAs(owner.id, tab.id, { budget_item_id: mine.body.item.id, amount: 20 });
    expect(own.status).toBe(201);
    expect(own.body.item.label).toBe('A personal');
  });

  it('TAB-006: frozen labels survive deleting the source budget item (budget_item_id nulls, money unchanged)', async () => {
    const budget = await createBudgetItemAs(owner.id, { name: 'Zip Line', total_price: 90, expense_date: '2026-07-03' });
    const tab = await makeTab({ first_name: 'Remy' });
    const item = (await addItemAs(owner.id, tab.id, { budget_item_id: budget.body.item.id, amount: 45 })).body.item;

    const del = await request(app)
      .delete(`/api/trips/${tripId}/budget/${budget.body.item.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(del.status).toBe(200);

    const t = await ownerTab(tab.id);
    expect(t.items).toHaveLength(1);
    expect(t.items[0].id).toBe(item.id);
    expect(t.items[0].label).toBe('Zip Line');
    expect(t.items[0].expense_date).toBe('2026-07-03');
    expect(t.items[0].amount).toBeCloseTo(45, 2);
    expect(t.items[0].budget_item_id).toBeNull(); // ON DELETE SET NULL
    expect(t.charged).toBeCloseTo(45, 2);
    expect(t.balance).toBeCloseTo(45, 2);

    // The public page still shows the frozen line.
    const pub = await publicGet(tab.token);
    expect(pub.status).toBe(200);
    expect(pub.body.items[0].label).toBe('Zip Line');
    expect(pub.body.charged).toBeCloseTo(45, 2);
  });

  it('TAB-007: payments — 400 on zero/negative/missing amount; deleting a payment restores the balance', async () => {
    const tab = await makeTab({ first_name: 'Sasha' });
    await addItemAs(owner.id, tab.id, { label: 'Hotel share', amount: 100 });

    const missing = await addPaymentAs(owner.id, tab.id, {});
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('amount is required');
    const zero = await addPaymentAs(owner.id, tab.id, { amount: 0 });
    expect(zero.status).toBe(400);
    expect(zero.body.error).toBe('Amount must be greater than zero');
    expect((await addPaymentAs(owner.id, tab.id, { amount: -1 })).status).toBe(400);

    const pay = await addPaymentAs(owner.id, tab.id, { amount: 30, note: 'bank transfer' });
    expect(pay.status).toBe(201);
    expect(pay.body.payment.amount).toBeCloseTo(30, 2);
    expect(pay.body.payment.note).toBe('bank transfer');

    let t = await ownerTab(tab.id);
    expect(t.paid).toBeCloseTo(30, 2);
    expect(t.balance).toBeCloseTo(70, 2);

    const del = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}/payments/${pay.body.payment.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    t = await ownerTab(tab.id);
    expect(t.payments).toHaveLength(0);
    expect(t.paid).toBe(0);
    expect(t.balance).toBeCloseTo(100, 2);

    const again = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}/payments/${pay.body.payment.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(again.status).toBe(404);
  });

  it('TAB-008: public read model — names, totals, non-empty payment methods only, join_url until the invite is used', async () => {
    // Two of the four payment-method settings set, one explicitly empty, one unset:
    // only the non-empty two may surface on the public page.
    const put = (key: string, value: string) =>
      request(app).put('/api/settings').set('Cookie', authCookie(owner.id)).send({ key, value });
    expect((await put('payment_bank', 'Westpac 032-000 123456')).status).toBe(200);
    expect((await put('payment_venmo', '@wes-t')).status).toBe(200);
    expect((await put('payment_payid', '')).status).toBe(200);

    const tab = await makeTab({ first_name: 'Quinn', last_name: 'Ha', currency: 'usd' });
    const item = (await addItemAs(owner.id, tab.id, { label: 'Surf lesson', amount: 22.2 })).body.item;
    await addPaymentAs(owner.id, tab.id, { amount: 2.2, note: 'deposit' });

    const res = await publicGet(tab.token);
    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.owner_name).toBe(owner.username);
    expect(body.trip_title).toBe(tripTitle);
    expect(body.currency).toBe('USD');
    expect(body.first_name).toBe('Quinn');
    expect(body.last_name).toBe('Ha');
    expect(body.claimed).toBe(false);
    expect(body.payment_methods).toEqual({
      payment_bank: 'Westpac 032-000 123456',
      payment_venmo: '@wes-t',
    });

    expect(body.items).toHaveLength(1);
    const pubItem = body.items[0];
    expect(pubItem.id).toBe(item.id);
    expect(pubItem.label).toBe('Surf lesson');
    expect(pubItem.amount).toBeCloseTo(22.2, 2);
    expect(pubItem.currency).toBe('USD');
    expect(pubItem.expense_date).toBeNull();
    expect(pubItem.created_at).toBeTruthy();
    expect(pubItem.has_receipt).toBe(false);
    // The public projection must not leak internals.
    expect(pubItem).not.toHaveProperty('receipt_file_id');
    expect(pubItem).not.toHaveProperty('share_receipt');
    expect(pubItem).not.toHaveProperty('budget_item_id');
    expect(body.token).toBeUndefined();
    expect(body.join_token).toBeUndefined();

    expect(body.payments).toHaveLength(1);
    expect(body.payments[0].amount).toBeCloseTo(2.2, 2);
    expect(body.payments[0].note).toBe('deposit');
    expect(body.charged).toBeCloseTo(22.2, 2);
    expect(body.paid).toBeCloseTo(2.2, 2);
    expect(body.balance).toBeCloseTo(20, 2);
    expect(body.join_url).toBe(`/login?invite=${tab.join_token}`);

    // Once the one-use invite is consumed the join link disappears.
    testDb.prepare('UPDATE invite_tokens SET used_count = 1 WHERE token = ?').run(tab.join_token);
    const after = await publicGet(tab.token);
    expect(after.status).toBe(200);
    expect(after.body.join_url).toBeNull();
  });

  it('TAB-009: revoke pauses the public link (owner keeps history), un-revoke restores it, delete removes tab + unused invite', async () => {
    const tab = await makeTab({ first_name: 'Lena' });
    expect((await publicGet(tab.token)).status).toBe(200);

    // Revoke (defaults true): public 404s, owner still sees it.
    const rev = await revokeAs(owner.id, tab.id);
    expect(rev.status).toBe(200);
    expect(rev.body.success).toBe(true);
    const revokedPub = await publicGet(tab.token);
    expect(revokedPub.status).toBe(404);
    expect(revokedPub.body.error).toBe('Invalid or expired link');
    let t = await ownerTab(tab.id);
    expect(t).toBeDefined();
    expect(t.revoked_at).toBeTruthy();

    // Un-revoke: the same link works again.
    expect((await revokeAs(owner.id, tab.id, { revoked: false })).status).toBe(200);
    expect((await publicGet(tab.token)).status).toBe(200);
    t = await ownerTab(tab.id);
    expect(t.revoked_at).toBeNull();

    // A second tab whose invite got USED — deleting must keep that invite row.
    const usedTab = await makeTab({ first_name: 'Kit' });
    testDb.prepare('UPDATE invite_tokens SET used_count = 1 WHERE token = ?').run(usedTab.join_token);

    const del1 = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${tab.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(del1.status).toBe(200);
    expect(del1.body.success).toBe(true);
    expect(testDb.prepare('SELECT 1 FROM invite_tokens WHERE token = ?').get(tab.join_token)).toBeUndefined();

    const del2 = await request(app)
      .delete(`/api/trips/${tripId}/expense-tabs/${usedTab.id}`)
      .set('Cookie', authCookie(owner.id));
    expect(del2.status).toBe(200);
    expect(testDb.prepare('SELECT 1 FROM invite_tokens WHERE token = ?').get(usedTab.join_token)).toBeDefined();

    const list = await listTabsAs(owner.id);
    expect(list.body.tabs).toEqual([]);
    expect((await publicGet(tab.token)).status).toBe(404);
  });

  it('TAB-010: claim lifecycle — 400 on blank names, one success shows names publicly, second claim 409', async () => {
    const tab = await makeTab({ first_name: 'Placeholder' });

    const blankFirst = await claim(tab.token, { first_name: '', last_name: 'Smith' });
    expect(blankFirst.status).toBe(400);
    expect(blankFirst.body.error).toBe('First and last name are required');
    expect((await claim(tab.token, { first_name: 'Ada' })).status).toBe(400);

    const ok = await claim(tab.token, { first_name: '  Ada ', last_name: ' Lovelace ' });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const pub = await publicGet(tab.token);
    expect(pub.status).toBe(200);
    expect(pub.body.first_name).toBe('Ada'); // trimmed, claimed names win
    expect(pub.body.last_name).toBe('Lovelace');
    expect(pub.body.claimed).toBe(true);

    const second = await claim(tab.token, { first_name: 'Bob', last_name: 'Jones' });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('This tab has already been claimed');

    // The first claim stuck.
    const still = await publicGet(tab.token);
    expect(still.body.first_name).toBe('Ada');
  });

  it('TAB-011: receipt sharing — shared streams bytes + nosniff; 404 when not shared, revoked, or file soft-deleted', async () => {
    const fileId = await makeReceiptFile();
    const budget = await createBudgetItemAs(owner.id, { name: 'Cafe X', total_price: 30, receipt_file_id: fileId });
    const tab = await makeTab({ first_name: 'Ori' });
    const shared = (await addItemAs(owner.id, tab.id, { budget_item_id: budget.body.item.id, amount: 30, share_receipt: true })).body.item;
    const unshared = (await addItemAs(owner.id, tab.id, { budget_item_id: budget.body.item.id, amount: 5 })).body.item;

    // Shared: the original bytes stream back, pinned against sniffing.
    const ok = await receiptGet(tab.token, shared.id);
    expect(ok.status).toBe(200);
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['content-type']).toContain('image/png'); // receipt mime renders inline
    expect(ok.headers['content-disposition']).toContain('inline');
    expect(Buffer.compare(ok.body as Buffer, PNG_BYTES)).toBe(0);

    // Not shared → indistinguishable from missing.
    const notShared = await receiptGet(tab.token, unshared.id);
    expect(notShared.status).toBe(404);

    // Bogus item id → 404.
    expect((await receiptGet(tab.token, 999999)).status).toBe(404);

    // Revoked tab → 404 even for the shared item; un-revoke restores access.
    await revokeAs(owner.id, tab.id);
    expect((await receiptGet(tab.token, shared.id)).status).toBe(404);
    await revokeAs(owner.id, tab.id, { revoked: false });
    expect((await receiptGet(tab.token, shared.id)).status).toBe(200);

    // Soft-deleted trip file (trash) → 404.
    testDb.prepare('UPDATE trip_files SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(fileId);
    expect((await receiptGet(tab.token, shared.id)).status).toBe(404);
  });

  it('TAB-012: CSV export — attachment with header, signed Charge/Payment rows, Balance row, CRLF endings', async () => {
    const budget = await createBudgetItemAs(owner.id, { name: 'Museum', total_price: 60, expense_date: '2026-07-05' });
    const tab = await makeTab({ first_name: 'Rio', last_name: 'Park', currency: 'AUD' });
    await addItemAs(owner.id, tab.id, { budget_item_id: budget.body.item.id, amount: 60 });
    await addPaymentAs(owner.id, tab.id, { amount: 40, note: 'Bank transfer' });

    const res = await request(app)
      .get(`/api/trips/${tripId}/expense-tabs/${tab.id}/export.csv`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="expense-tab-rio-park.csv"');

    // CRLF line endings, trailing newline included.
    expect(res.text).toContain('\r\n');
    expect(res.text.endsWith('\r\n')).toBe(true);
    const lines = res.text.split('\r\n');
    expect(lines[0]).toBe('Date,Type,Description,Amount,Currency');
    // One positive Charge per item (frozen expense_date), one negative Payment,
    // then the running Balance attributed to the tab's person.
    expect(lines[1]).toBe('"2026-07-05",Charge,"Museum",60.00,"AUD"');
    expect(lines[2]).toMatch(/^"\d{4}-\d{2}-\d{2}",Payment,"Bank transfer",-40\.00,"AUD"$/);
    expect(lines[3]).toBe(',Balance,"Rio Park",20.00,"AUD"');
    expect(lines[4]).toBe(''); // nothing after the final CRLF
  });

  it('TAB-013: 404s — unknown public token; owner-side endpoints 404 for a non-member and for a missing trip', async () => {
    const unknown = await publicGet('definitely-not-a-real-token');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error).toBe('Invalid or expired link');
    expect((await claim('definitely-not-a-real-token', { first_name: 'A', last_name: 'B' })).status).toBe(404);

    // An authenticated outsider (no membership) can't even see the trip exists.
    const foreignList = await request(app)
      .get(`/api/trips/${tripId}/expense-tabs`)
      .set('Cookie', authCookie(outsider.id));
    expect(foreignList.status).toBe(404);
    expect(foreignList.body.error).toBe('Trip not found');
    const foreignCreate = await request(app)
      .post(`/api/trips/${tripId}/expense-tabs`)
      .set('Cookie', authCookie(outsider.id))
      .send({ first_name: 'Sneak' });
    expect(foreignCreate.status).toBe(404);

    // A trip id that doesn't exist at all behaves the same for the owner.
    const missingTrip = await request(app)
      .get('/api/trips/999999/expense-tabs')
      .set('Cookie', authCookie(owner.id));
    expect(missingTrip.status).toBe(404);
  });

  // LAST on purpose: this test intentionally exhausts the per-IP claim bucket
  // (10 checks / 15 min) and nothing resets it until the next beforeEach.
  it('TAB-014: claim rate limit — repeated claim attempts (even invalid ones) eventually answer 429', async () => {
    const tab = await makeTab({ first_name: 'Limit' });

    const statuses: number[] = [];
    let limited: request.Response | undefined;
    for (let i = 0; i < 15; i++) {
      const res = await claim(tab.token, {}); // junk body — still counts against the bucket
      statuses.push(res.status);
      if (res.status === 429) { limited = res; break; }
    }

    expect(statuses).toContain(429);
    // Every request before the limiter kicked in was the plain validation 400.
    expect(statuses.slice(0, statuses.indexOf(429)).every((s) => s === 400)).toBe(true);
    expect(limited!.body.error).toBe('Too many attempts. Please try again later.');
  });
});

// ---------------------------------------------------------------------------
// Member-linked tabs (custom): a tab tied to a trip member — typically a temp
// guest (#1362), the single temp user per trip — becomes a live window onto
// the group ledger instead of a frozen charge list.
// ---------------------------------------------------------------------------

describe('Member-linked tabs (TAB)', () => {
  it('TAB-015: create_guest creates a real guest trip member and links the tab to it', async () => {
    const res = await createTabAs(owner.id, { first_name: 'Lisa', last_name: 'Nguyen', create_guest: true });
    expect(res.status).toBe(201);
    const tab = res.body.tab;
    expect(tab.member_user_id).toBeTruthy();
    expect(tab.member).toMatchObject({ user_id: tab.member_user_id, is_guest: true });

    // The guest is a credential-less users row joined into trip_members —
    // assignable in every split like any member.
    const guest = testDb.prepare('SELECT is_guest, display_name FROM users WHERE id = ?').get(tab.member_user_id) as { is_guest: number; display_name: string };
    expect(guest.is_guest).toBe(1);
    expect(guest.display_name).toBe('Lisa Nguyen');
    expect(testDb.prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?').get(tripId, tab.member_user_id)).toBeTruthy();
  });

  it('TAB-016: one tab per member — duplicates 409, unknown members 404, linking derives the name', async () => {
    const linked = await createTabAs(owner.id, { member_user_id: member.id });
    expect(linked.status).toBe(201);
    expect(linked.body.tab.member_user_id).toBe(member.id);
    expect(linked.body.tab.first_name.length).toBeGreaterThan(0); // derived from the member profile

    const dup = await createTabAs(member.id, { member_user_id: member.id });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already has a tab/i);

    const stranger = await createTabAs(owner.id, { member_user_id: outsider.id });
    expect(stranger.status).toBe(404);
  });

  it('TAB-017: linked tabs are a shared trip resource; standalone tabs stay owner-scoped', async () => {
    const linked = (await createTabAs(owner.id, { first_name: 'Guesty', create_guest: true })).body.tab;
    const standalone = (await createTabAs(owner.id, { first_name: 'Solo' })).body.tab;

    const theirs = await listTabsAs(member.id);
    expect(theirs.status).toBe(200);
    const ids = theirs.body.tabs.map((t: { id: number }) => t.id);
    expect(ids).toContain(linked.id);        // linked → visible to every member
    expect(ids).not.toContain(standalone.id); // standalone → creator only
  });

  it('TAB-018: manual frozen charges are rejected on a linked tab — bills flow through the split', async () => {
    const tab = (await createTabAs(owner.id, { first_name: 'Guesty', create_guest: true })).body.tab;
    const res = await addItemAs(owner.id, tab.id, { label: 'Manual', amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expense split/i);
  });

  it('TAB-019: the public page shows the live ledger position, and payments record real settlements', async () => {
    const tab = (await createTabAs(owner.id, { first_name: 'Lisa', create_guest: true })).body.tab;
    const guestId = tab.member_user_id as number;

    // Owner pays 100, split equally with the guest → guest owes owner 50.
    await createBudgetItemAs(owner.id, {
      name: 'Boat Day',
      expense_date: '2026-07-20',
      payers: [{ user_id: owner.id, amount: 100 }],
      members: [{ user_id: owner.id, amount: null }, { user_id: guestId, amount: null }],
    });
    // A personal expense never leaks into the guest's public view.
    await createBudgetItemAs(owner.id, { name: 'Secret Spa', total_price: 40, is_private: true });

    // Owner's payment methods surface on the creditor card.
    await request(app).put('/api/settings').set('Cookie', authCookie(owner.id)).send({ key: 'payment_payid', value: 'wes@pay.id' });

    const pub = await publicGet(tab.token);
    expect(pub.status).toBe(200);
    expect(pub.body.live).toBeTruthy();
    expect(pub.body.live.charges).toHaveLength(1);
    expect(pub.body.live.charges[0]).toMatchObject({ label: 'Boat Day', share: 50, total: 100 });
    expect(pub.body.live.owed).toHaveLength(1);
    expect(pub.body.live.owed[0]).toMatchObject({ user_id: owner.id, amount: 50 });
    expect(pub.body.live.owed[0].payment_methods.payment_payid).toBe('wes@pay.id');
    expect(pub.body.live.balance).toBe(50);

    // ANY budget-edit member can record money received — it lands as a real
    // settlement (guest → recorder) and the live view follows.
    const pay = await addPaymentAs(member.id, tab.id, { amount: 50 });
    expect(pay.status).toBe(201);
    expect(pay.body.settlement).toMatchObject({ from_user_id: guestId, to_user_id: member.id, amount: 50 });
    expect(testDb.prepare('SELECT COUNT(*) AS c FROM budget_settlements WHERE trip_id = ?').get(tripId)).toMatchObject({ c: 1 });

    const after = await publicGet(tab.token);
    // 50 owed to owner minus 50 paid to the recording member nets the guest to zero.
    expect(after.body.live.paid).toBe(50);
    expect(after.body.live.payments[0]).toMatchObject({ amount: 50 });

    // The owner-side list carries the same live position.
    const list = await listTabsAs(owner.id);
    const row = list.body.tabs.find((t: { id: number }) => t.id === tab.id);
    expect(row.live).toBeTruthy();
    expect(row.live.charged).toBe(50);
  });

  it('TAB-020: CSV export of a linked tab reflects the live ledger', async () => {
    const tab = (await createTabAs(owner.id, { first_name: 'Lisa', create_guest: true })).body.tab;
    const guestId = tab.member_user_id as number;
    await createBudgetItemAs(owner.id, {
      name: 'Dinner',
      payers: [{ user_id: owner.id, amount: 60 }],
      members: [{ user_id: owner.id, amount: null }, { user_id: guestId, amount: null }],
    });
    await addPaymentAs(owner.id, tab.id, { amount: 10 });

    const res = await request(app).get(`/api/trips/${tripId}/expense-tabs/${tab.id}/export.csv`).set('Cookie', authCookie(member.id));
    expect(res.status).toBe(200);
    const csv = res.text;
    expect(csv).toContain('"Dinner",30.00');
    expect(csv).toMatch(/Payment,"Paid .*",-10\.00/);
    expect(csv).toMatch(/Balance,.*20\.00/);
  });
});
