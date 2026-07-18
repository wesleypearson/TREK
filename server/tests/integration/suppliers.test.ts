/**
 * Suppliers CRM integration tests (SUP-001 … SUP-007): the instance-wide
 * vendor book — addon gate, CRUD + dedupe, delete permissions, the receipt
 * scan auto-supplier/auto-venue pipeline (Google Places mocked), gap-fill
 * enrichment, and the expense supplier link.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { INestApplication } from '@nestjs/common';
import fs from 'fs';
import path from 'path';

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
      const place: any = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId);
      if (!place) return null;
      return { ...place, category: null, tags: [] };
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
vi.mock('../../src/services/exchangeRateService', () => ({
  getRates: vi.fn(async () => null),
  convertWithRates: (amount: number) => amount,
}));

// Google Places is mocked wholesale — searchMock is per-test programmable.
const searchMock = vi.hoisted(() => vi.fn(async () => ({ places: [], source: 'google' })));
const mapsKeyMock = vi.hoisted(() => vi.fn((): string | null => 'test-maps-key'));
vi.mock('../../src/services/mapsService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getMapsKey: mapsKeyMock,
  searchPlaces: searchMock,
}));

// The AI: vision model for receipt parsing + summary writer, both canned.
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
import { createUser, createTrip } from '../helpers/factories';
import { authCookie } from '../helpers/auth';

let nestApp: INestApplication;
let app: Application;
const uploadsDir = path.join(__dirname, '../../uploads/files');
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const GOOGLE_HIT = {
  id: 'gp_abc123',
  displayName: { text: 'Big Sound Hire' },
  formattedAddress: '12 Amp St, Brisbane QLD',
  location: { latitude: -27.47, longitude: 153.02 },
  nationalPhoneNumber: '07 3000 0000',
  websiteUri: 'https://bigsoundhire.example',
  types: ['audio_visual_equipment_rental', 'point_of_interest'],
};

const RECEIPT = {
  merchant: 'Big Sound Hire',
  merchant_address: '12 Amp St, Brisbane',
  merchant_phone: '07 3000 0000',
  date: '2026-07-10',
  currency: 'AUD',
  total: 440,
  items: [{ name: 'Speaker hire', price: 400 }, { name: 'Cables', price: 40 }],
};

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
});

afterAll(async () => {
  await nestApp?.close();
});

beforeEach(() => {
  resetTestDb(testDb);
  // resetTestDb predates the suppliers table — clear it explicitly so vendors
  // never leak across tests.
  testDb.prepare('DELETE FROM suppliers').run();
  resetRateLimits(nestApp);
  testDb.prepare("INSERT OR REPLACE INTO addons (id, name, description, type, icon, enabled, sort_order) VALUES ('suppliers', 'Suppliers', '', 'global', 'Store', 1, 17)").run();
  searchMock.mockReset();
  searchMock.mockResolvedValue({ places: [], source: 'google' });
  mapsKeyMock.mockReturnValue('test-maps-key');
  extractMock.mockReset();
});

describe('Suppliers CRM', () => {
  it('SUP-001 — addon gate: disabled → 404 for the whole group', async () => {
    const { user } = createUser(testDb);
    testDb.prepare("UPDATE addons SET enabled = 0 WHERE id = 'suppliers'").run();
    const off = await request(app).get('/api/addons/suppliers').set('Cookie', authCookie(user.id));
    expect(off.status).toBe(404);
    testDb.prepare("UPDATE addons SET enabled = 1 WHERE id = 'suppliers'").run();
    const on = await request(app).get('/api/addons/suppliers').set('Cookie', authCookie(user.id));
    expect(on.status).toBe(200);
    expect(on.body.suppliers).toEqual([]);
  });

  it('SUP-002 — create, list, dedupe on the normalized name', async () => {
    const { user } = createUser(testDb);
    const created = await request(app)
      .post('/api/addons/suppliers').set('Cookie', authCookie(user.id))
      .send({ name: 'Café Två', category: 'Catering' });
    expect(created.status).toBe(201);
    expect(created.body.supplier.name).toBe('Café Två');
    expect(created.body.supplier.category).toBe('Catering');

    // Same business, different punctuation/case → one row.
    const dupe = await request(app)
      .post('/api/addons/suppliers').set('Cookie', authCookie(user.id))
      .send({ name: 'cafe  tva!' });
    expect(dupe.status).toBe(400);

    const list = await request(app).get('/api/addons/suppliers').set('Cookie', authCookie(user.id));
    expect(list.body.suppliers).toHaveLength(1);
    expect(list.body.suppliers[0].expense_count).toBe(0);
  });

  it('SUP-003 — update fields; delete is admin/creator-only and unlinks, not cascades', async () => {
    const { user: creator } = createUser(testDb);
    const { user: other } = createUser(testDb);
    const trip = createTrip(testDb, creator.id, { title: 'Warehouse show' });
    const created = await request(app)
      .post('/api/addons/suppliers').set('Cookie', authCookie(creator.id))
      .send({ name: 'Gaffer World' });
    const sid = created.body.supplier.id;

    const updated = await request(app)
      .put(`/api/addons/suppliers/${sid}`).set('Cookie', authCookie(other.id))
      .send({ phone: '1300 111 222', notes: 'Ask for Mel' });
    expect(updated.status).toBe(200);
    expect(updated.body.supplier.phone).toBe('1300 111 222');

    const expense = await request(app)
      .post(`/api/trips/${trip.id}/budget`).set('Cookie', authCookie(creator.id))
      .send({ name: 'Tape order', total_price: 90, supplier_id: sid });
    expect(expense.status).toBe(201);
    expect(expense.body.item.supplier_name).toBe('Gaffer World');

    const denied = await request(app)
      .delete(`/api/addons/suppliers/${sid}`).set('Cookie', authCookie(other.id));
    expect(denied.status).toBe(403);
    const removed = await request(app)
      .delete(`/api/addons/suppliers/${sid}`).set('Cookie', authCookie(creator.id));
    expect(removed.status).toBe(200);
    // The expense survives, link released.
    expect((testDb.prepare('SELECT supplier_id FROM budget_items WHERE id = ?').get(expense.body.item.id) as any).supplier_id).toBeNull();
  });

  it('SUP-004 — receipt scan auto-creates the supplier and the venue, then reuses both', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id, { title: 'Festival build' });
    extractMock.mockResolvedValue([RECEIPT]);
    searchMock.mockResolvedValue({ places: [GOOGLE_HIT], source: 'google' });

    const scan = await request(app)
      .post(`/api/trips/${trip.id}/budget/receipt-scan`).set('Cookie', authCookie(user.id))
      .attach('file', PNG_BYTES, 'docket.png');
    expect(scan.status).toBe(200);
    expect(scan.body.supplier).toMatchObject({ name: 'Big Sound Hire', created: true });
    expect(scan.body.place).toMatchObject({ name: 'Big Sound Hire', created: true });

    // The auto venue is a real, group-visible place carrying the Google pin.
    const place = testDb.prepare('SELECT * FROM places WHERE id = ?').get(scan.body.place.id) as any;
    expect(place.trip_id).toBe(trip.id);
    expect(place.lat).toBeCloseTo(-27.47, 2);
    expect(place.supplier_id).toBe(scan.body.supplier.id);
    expect(place.is_private).toBe(0);
    expect(place.google_place_id).toBe('gp_abc123');

    // The supplier picked up the receipt's + Google's facts.
    const supplier = testDb.prepare('SELECT * FROM suppliers WHERE id = ?').get(scan.body.supplier.id) as any;
    expect(supplier.address).toBe('12 Amp St, Brisbane');
    expect(supplier.website).toBe('https://bigsoundhire.example');
    expect(supplier.source).toBe('receipt');
    expect(supplier.category).toBe('Audio visual equipment rental');

    // Second docket from the same vendor: nothing duplicated.
    const again = await request(app)
      .post(`/api/trips/${trip.id}/budget/receipt-scan`).set('Cookie', authCookie(user.id))
      .attach('file', PNG_BYTES, 'docket2.png');
    expect(again.body.supplier.created).toBe(false);
    expect(again.body.place).toMatchObject({ id: scan.body.place.id, created: false });
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM suppliers').get()).toEqual({ n: 1 });
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM places WHERE trip_id = ?').get(trip.id)).toEqual({ n: 1 });
  });

  it('SUP-005 — a wrong-name Google hit is rejected; scan still returns the supplier without a venue', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id, { title: 'Club night' });
    extractMock.mockResolvedValue([{ ...RECEIPT, merchant: 'Corner Bakery' }]);
    // Text search "always returns something" — here, an unrelated business.
    searchMock.mockResolvedValue({ places: [GOOGLE_HIT], source: 'google' });

    const scan = await request(app)
      .post(`/api/trips/${trip.id}/budget/receipt-scan`).set('Cookie', authCookie(user.id))
      .attach('file', PNG_BYTES, 'bakery.png');
    expect(scan.status).toBe(200);
    expect(scan.body.supplier).toMatchObject({ name: 'Corner Bakery', created: true });
    expect(scan.body.place).toBeNull();
    const supplier = testDb.prepare('SELECT * FROM suppliers WHERE id = ?').get(scan.body.supplier.id) as any;
    // Docket facts kept, Google's mismatched pin discarded.
    expect(supplier.address).toBe('12 Amp St, Brisbane');
    expect(supplier.google_place_id).toBeNull();
    expect(supplier.lat).toBeNull();
  });

  it('SUP-006 — enrich endpoint gap-fills without touching human edits', async () => {
    const { user } = createUser(testDb);
    const created = await request(app)
      .post('/api/addons/suppliers').set('Cookie', authCookie(user.id))
      .send({ name: 'Big Sound Hire', phone: '0400 999 999' });
    const sid = created.body.supplier.id;
    searchMock.mockResolvedValue({ places: [GOOGLE_HIT], source: 'google' });
    extractMock.mockResolvedValue([{ summary: 'AV hire shop in Brisbane. Used for speaker hire.', category: 'AV hire' }]);

    const res = await request(app)
      .post(`/api/addons/suppliers/${sid}/enrich`).set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    const s = res.body.supplier;
    expect(s.phone).toBe('0400 999 999'); // human edit wins
    expect(s.website).toBe('https://bigsoundhire.example'); // gap filled
    expect(s.ai_summary).toContain('AV hire shop');
    expect(s.category).toBe('Audio visual equipment rental');
  });

  it('SUP-007 — expense create rejects a bogus supplier link', async () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id, { title: 'One-dayer' });
    const res = await request(app)
      .post(`/api/trips/${trip.id}/budget`).set('Cookie', authCookie(user.id))
      .send({ name: 'Ice', total_price: 20, supplier_id: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Supplier not found');
  });
});
