/**
 * Guest invite links integration tests — INV-001..018 (public redemption)
 * and INV-101..110 (crew-admin EDM funnel).
 *
 * resolve semantics → hash-at-rest → full redemption with promotion →
 * company/supplier loop → colleague invites → admin funnel, send, cooldowns.
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
vi.mock('../../src/websocket', () => ({ broadcast: vi.fn(), broadcastToUser: vi.fn(), getOnlineUserIds: () => [] }));
// Real notifications module except the SMTP edge: sends "succeed" without a
// transport, and isSmtpConfigured is on so the email paths are exercised.
vi.mock('../../src/services/notifications', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/services/notifications')>();
  return { ...orig, sendEmail: vi.fn(async () => true), isSmtpConfigured: vi.fn(() => true) };
});

import { buildApp } from '../../src/bootstrap';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb, resetRateLimits } from '../helpers/test-db';
import { createUser, createTrip, addTripMember, createBudgetItem, setAppSetting } from '../helpers/factories';
import { authCookie } from '../helpers/auth';
import { sendEmail, isSmtpConfigured } from '../../src/services/notifications';
import { GuestInvitePublicController } from '../../src/nest/guest-invite/guest-invite-public.controller';
import { GuestInviteAdminController } from '../../src/nest/guest-invite/guest-invite-admin.controller';
import type { RateLimitService } from '../../src/nest/auth/rate-limit.service';

let nestApp: INestApplication;
let app: Application;

let guestSeq = 0;
function createGuest(tripId: number, name = 'Deck Hand', contactEmail: string | null = null): number {
  guestSeq++;
  const r = testDb.prepare(
    `INSERT INTO users (username, email, password_hash, role, is_guest, display_name, contact_email)
     VALUES (?, ?, '', 'user', 1, ?, ?)`
  ).run(`guest-test-${guestSeq}`, `guest-test-${guestSeq}@guests.invalid`, name, contactEmail);
  const id = Number(r.lastInsertRowid);
  testDb.prepare('INSERT INTO trip_members (trip_id, user_id) VALUES (?, ?)').run(tripId, id);
  return id;
}

function enableSuppliersAddon(enabled = 1): void {
  testDb.prepare(
    `INSERT INTO addons (id, name, description, type, icon, enabled, sort_order)
     VALUES ('suppliers', 'Suppliers', 'x', 'global', 'Store', ?, 17)
     ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled`
  ).run(enabled);
}

async function mintInvite(tripId: number, guestId: number, ownerId: number): Promise<{ path: string; token: string; invite_id: number }> {
  const res = await request(app)
    .post(`/api/trips/${tripId}/guest-invites/${guestId}`)
    .set('Cookie', authCookie(ownerId))
    .send({});
  expect(res.status).toBe(201);
  return { path: res.body.invite_path, token: res.body.invite_path.split('/').pop(), invite_id: res.body.invite_id };
}

const GOOD_PW = 'Str0ng!Passw0rd';

beforeAll(async () => {
  createTables(testDb);
  runMigrations(testDb);
  nestApp = await buildApp();
  app = nestApp.getHttpAdapter().getInstance();
});

beforeEach(() => {
  resetTestDb(testDb);
  testDb.exec('DELETE FROM guest_invites');
  testDb.exec("DELETE FROM addons WHERE id = 'suppliers'");
  resetRateLimits(nestApp);
  (nestApp.get(GuestInvitePublicController, { strict: false }) as unknown as { rl: RateLimitService }).rl.reset();
  (nestApp.get(GuestInviteAdminController, { strict: false }) as unknown as { rl: RateLimitService }).rl.reset();
  vi.mocked(sendEmail).mockClear();
  vi.mocked(sendEmail).mockResolvedValue(true);
  vi.mocked(isSmtpConfigured).mockReturnValue(true);
});

afterAll(async () => {
  await nestApp.close();
  testDb.close();
});

describe('public resolve', () => {
  it('INV-001 valid token returns prefill and stamps opened_at exactly once', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Rigger Rae', 'rae@example.com');
    const { token, invite_id } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app).get(`/api/guest-invites/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.guest_name).toBe('Rigger Rae');
    expect(res.body.contact_email).toBe('rae@example.com');
    expect(res.body.trip_title).toBe(trip.title);
    expect(res.body.kind).toBe('guest');

    const opened1 = (testDb.prepare('SELECT opened_at FROM guest_invites WHERE id = ?').get(invite_id) as any).opened_at;
    expect(opened1).toBeTruthy();
    await new Promise((r) => setTimeout(r, 5));
    await request(app).get(`/api/guest-invites/${token}`);
    const opened2 = (testDb.prepare('SELECT opened_at FROM guest_invites WHERE id = ?').get(invite_id) as any).opened_at;
    expect(opened2).toBe(opened1);
  });

  it('INV-002 unknown and revoked tokens are indistinguishable 404s', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);
    await request(app).delete(`/api/trips/${trip.id}/guest-invites/${guest}`).set('Cookie', authCookie(owner.id));

    const unknown = await request(app).get('/api/guest-invites/definitely-not-a-token');
    const revoked = await request(app).get(`/api/guest-invites/${token}`);
    expect(unknown.status).toBe(404);
    expect(revoked.status).toBe(404);
    expect(unknown.body).toEqual(revoked.body);
  });

  it('INV-003 expired token → 410', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token, invite_id } = await mintInvite(trip.id, guest, owner.id);
    testDb.prepare('UPDATE guest_invites SET expires_at = ? WHERE id = ?')
      .run(new Date(Date.now() - 1000).toISOString(), invite_id);

    const res = await request(app).get(`/api/guest-invites/${token}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toBe('expired');
  });

  it('INV-004 raw token never stored — only the sha256 hash', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const rows = testDb.prepare('SELECT token_hash FROM guest_invites').all() as { token_hash: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('redemption', () => {
  it('INV-005 happy path: account created, guest promoted, splits/settlements/tab repointed', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Foley Fox', 'fox@example.com');
    const item = createBudgetItem(testDb, trip.id);
    testDb.prepare('INSERT INTO budget_item_members (budget_item_id, user_id, amount) VALUES (?, ?, 25)').run(item.id, guest);
    testDb.prepare('INSERT INTO budget_settlements (trip_id, from_user_id, to_user_id, amount) VALUES (?, ?, ?, 25)').run(trip.id, guest, owner.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'foxreal', email: 'fox@real.example.com', password: GOOD_PW });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe('foxreal');
    expect(res.body.trip_id).toBe(trip.id);
    expect(res.headers['set-cookie']?.[0]).toContain('trek_session=');

    const newUserId = res.body.user.id;
    expect(testDb.prepare('SELECT id FROM users WHERE id = ?').get(guest)).toBeUndefined();
    expect((testDb.prepare('SELECT user_id FROM budget_item_members WHERE budget_item_id = ?').get(item.id) as any).user_id).toBe(newUserId);
    expect((testDb.prepare('SELECT from_user_id FROM budget_settlements WHERE trip_id = ?').get(trip.id) as any).from_user_id).toBe(newUserId);
    expect(testDb.prepare('SELECT user_id FROM trip_members WHERE trip_id = ? AND user_id = ?').get(trip.id, newUserId)).toBeTruthy();

    const inv = testDb.prepare('SELECT registered_at, promoted_at, registered_user_id FROM guest_invites').get() as any;
    expect(inv.registered_at).toBeTruthy();
    expect(inv.promoted_at).toBeTruthy();
    expect(inv.registered_user_id).toBe(newUserId);

    // The funnel keeps the converted entry (guest row is gone — the invite's
    // name snapshot carries it) and shows the success stage.
    const funnel = await request(app)
      .get(`/api/trips/${trip.id}/guest-invites`)
      .set('Cookie', authCookie(owner.id));
    const promoted = funnel.body.guests.find((g: any) => g.invite?.stage === 'promoted');
    expect(promoted).toBeTruthy();
    expect(promoted.guest_name).toBe('Foley Fox');
    expect(promoted.registered_user_id).toBe(newUserId);
  });

  it('INV-006 new account role is user, never admin, and must_change_password stays unset', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'plainuser', email: 'plain@example.com', password: GOOD_PW });
    expect(res.status).toBe(201);
    const row = testDb.prepare('SELECT role, must_change_password FROM users WHERE id = ?').get(res.body.user.id) as any;
    expect(row.role).toBe('user');
    expect(row.must_change_password ?? 0).toBe(0);
  });

  it('INV-007 double redemption: second submit loses with 404 and exactly one account exists', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const first = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'winner', email: 'winner@example.com', password: GOOD_PW });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'loser', email: 'loser@example.com', password: GOOD_PW });
    expect(second.status).toBe(404);
    expect(testDb.prepare("SELECT COUNT(*) AS c FROM users WHERE username IN ('winner','loser')").get()).toEqual({ c: 1 });
  });

  it('INV-008 reserved username → 400', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);
    for (const username of ['travla-bot', 'guest-sneaky', 'bot-army']) {
      const res = await request(app)
        .post(`/api/guest-invites/${token}/register`)
        .send({ username, email: 'r@example.com', password: GOOD_PW });
      expect(res.status).toBe(400);
    }
  });

  it('INV-009 weak password → 400 and the invite stays redeemable', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const weak = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'weakling', email: 'weak@example.com', password: 'short' });
    expect(weak.status).toBe(400);
    const retry = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'weakling', email: 'weak@example.com', password: GOOD_PW });
    expect(retry.status).toBe(201);
  });

  it('INV-010 duplicate real email → 409, but guest synthetic identities never block', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const dup = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'dupuser', email: owner.email, password: GOOD_PW });
    expect(dup.status).toBe(409);

    const guestEmail = (testDb.prepare('SELECT email FROM users WHERE id = ?').get(guest) as any).email;
    const ok = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'dupuser', email: guestEmail.replace('@guests.invalid', '@real.example.com'), password: GOOD_PW });
    expect(ok.status).toBe(201);
  });

  it('INV-011 company on registration creates a supplier when the addon is on', async () => {
    enableSuppliersAddon();
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'compuser', email: 'comp@example.com', password: GOOD_PW, company_name: 'Neon Audio Ltd' });
    expect(res.status).toBe(201);
    const supplier = testDb.prepare('SELECT id, source FROM suppliers WHERE name = ?').get('Neon Audio Ltd') as any;
    expect(supplier).toBeTruthy();
    expect(supplier.source).toBe('invite');
    const inv = testDb.prepare('SELECT company_name, company_supplier_id FROM guest_invites').get() as any;
    expect(inv.company_name).toBe('Neon Audio Ltd');
    expect(inv.company_supplier_id).toBe(supplier.id);
  });

  it('INV-012 company matches an existing supplier via name_key — no duplicate row', async () => {
    enableSuppliersAddon();
    testDb.prepare("INSERT INTO suppliers (name, name_key, source) VALUES ('Neon Audio Ltd', 'neon audio ltd', 'manual')").run();
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'compuser2', email: 'comp2@example.com', password: GOOD_PW, company_name: 'NEON  Audio Ltd' });
    expect(res.status).toBe(201);
    expect((testDb.prepare('SELECT COUNT(*) AS c FROM suppliers').get() as any).c).toBe(1);
  });

  it('INV-013 suppliers addon off: registration succeeds, company stored, no supplier row', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'noaddon', email: 'noaddon@example.com', password: GOOD_PW, company_name: 'Quiet PA Co' });
    expect(res.status).toBe(201);
    expect((testDb.prepare('SELECT COUNT(*) AS c FROM suppliers').get() as any).c).toBe(0);
    const inv = testDb.prepare('SELECT company_name, company_supplier_id FROM guest_invites').get() as any;
    expect(inv.company_name).toBe('Quiet PA Co');
    expect(inv.company_supplier_id).toBeNull();
  });

  it('INV-016 password_registration OFF: a guest invite still registers (deliberate bypass)', async () => {
    setAppSetting(testDb, 'password_registration', 'false');
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'bypass', email: 'bypass@example.com', password: GOOD_PW });
    expect(res.status).toBe(201);
  });

  it('INV-017 register bucket rate-limits at 10/15min per IP', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    await mintInvite(trip.id, guest, owner.id);

    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/api/guest-invites/not-a-real-token/register')
        .send({ username: `u${i}`, email: `u${i}@example.com`, password: GOOD_PW });
      last = res.status;
    }
    expect(last).toBe(429);
  });

  it('INV-018 deleting the creator leaves the invite valid (created_by SET NULL)', async () => {
    const { user: owner } = createUser(testDb);
    const { user: manager } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, manager.id);
    const guest = createGuest(trip.id);
    // Owner mints (member_manage defaults to trip_owner), then is deleted.
    const { token } = await mintInvite(trip.id, guest, owner.id);
    // Reassign the trip so deleting the owner doesn't cascade the trip away.
    testDb.prepare('UPDATE trips SET user_id = ? WHERE id = ?').run(manager.id, trip.id);
    testDb.prepare('DELETE FROM users WHERE id = ?').run(owner.id);

    const res = await request(app).get(`/api/guest-invites/${token}`);
    expect(res.status).toBe(200);
    expect((testDb.prepare('SELECT created_by FROM guest_invites').get() as any).created_by).toBeNull();
  });
});

describe('colleague loop', () => {
  async function redeemedCompanyUser(): Promise<number> {
    enableSuppliersAddon();
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);
    const res = await request(app)
      .post(`/api/guest-invites/${token}/register`)
      .send({ username: 'companyseed', email: 'seed@example.com', password: GOOD_PW, company_name: 'Neon Audio Ltd' });
    expect(res.status).toBe(201);
    return res.body.user.id;
  }

  it('INV-014 colleague redemption: fresh account, company inherited, no promotion', async () => {
    const seedUserId = await redeemedCompanyUser();
    const mint = await request(app)
      .post('/api/guest-invites/colleagues')
      .set('Cookie', authCookie(seedUserId))
      .send({ count: 2 });
    expect(mint.status).toBe(201);
    expect(mint.body.invite_paths).toHaveLength(2);
    expect(mint.body.company_name).toBe('Neon Audio Ltd');

    const colleagueToken = mint.body.invite_paths[0].split('/').pop();
    const resolve = await request(app).get(`/api/guest-invites/${colleagueToken}`);
    expect(resolve.status).toBe(200);
    expect(resolve.body.kind).toBe('colleague');
    expect(resolve.body.company_name).toBe('Neon Audio Ltd');

    const usersBefore = (testDb.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c;
    const reg = await request(app)
      .post(`/api/guest-invites/${colleagueToken}/register`)
      .send({ username: 'colleague1', email: 'coll1@example.com', password: GOOD_PW });
    expect(reg.status).toBe(201);
    expect(reg.body.trip_id).toBeNull();
    expect((testDb.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c).toBe(usersBefore + 1);
    const inv = testDb.prepare("SELECT promoted_at, registered_at FROM guest_invites WHERE kind = 'colleague' AND registered_user_id = ?").get(reg.body.user.id) as any;
    expect(inv.registered_at).toBeTruthy();
    expect(inv.promoted_at).toBeNull();
  });

  it('INV-015 colleague minting needs a redeemed company invite and caps at 10', async () => {
    const { user: random } = createUser(testDb);
    const denied = await request(app)
      .post('/api/guest-invites/colleagues')
      .set('Cookie', authCookie(random.id))
      .send({ count: 3 });
    expect(denied.status).toBe(403);

    const seedUserId = await redeemedCompanyUser();
    const tooMany = await request(app)
      .post('/api/guest-invites/colleagues')
      .set('Cookie', authCookie(seedUserId))
      .send({ count: 11 });
    expect(tooMany.status).toBe(400);
  });
});

describe('crew admin + EDM', () => {
  it('INV-101 create returns the raw path exactly once; funnel list never carries it', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Van Driver');
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const funnel = await request(app)
      .get(`/api/trips/${trip.id}/guest-invites`)
      .set('Cookie', authCookie(owner.id));
    expect(funnel.status).toBe(200);
    expect(JSON.stringify(funnel.body)).not.toContain(token);
    expect(funnel.body.guests[0].invite.stage).toBe('created');
  });

  it('INV-102 regenerate revokes the previous link', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const first = await mintInvite(trip.id, guest, owner.id);
    const second = await mintInvite(trip.id, guest, owner.id);
    expect(second.token).not.toBe(first.token);

    expect((await request(app).get(`/api/guest-invites/${first.token}`)).status).toBe(404);
    expect((await request(app).get(`/api/guest-invites/${second.token}`)).status).toBe(200);
  });

  it('INV-103 non-member 404; plain member without member_manage 403', async () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const guest = createGuest(trip.id);

    const asStranger = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}`)
      .set('Cookie', authCookie(stranger.id)).send({});
    expect(asStranger.status).toBe(404);

    const asMember = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}`)
      .set('Cookie', authCookie(member.id)).send({});
    expect(asMember.status).toBe(403);
  });

  it('INV-104 send without a contact email → 400', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'No Mail', null);
    const res = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(400);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it('INV-105 sent is stamped only when the transport accepts; failure → 502, no stamp', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Mail Target', 'mt@example.com');

    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    const fail = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(fail.status).toBe(502);
    expect(testDb.prepare('SELECT sent_at FROM guest_invites ORDER BY id DESC LIMIT 1').get()).toMatchObject({ sent_at: null });

    const ok = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(ok.status).toBe(200);
    expect(ok.body.sent).toBe(true);
    const row = testDb.prepare('SELECT sent_at, send_count, email FROM guest_invites ORDER BY id DESC LIMIT 1').get() as any;
    expect(row.sent_at).toBeTruthy();
    expect(row.send_count).toBe(1);
    expect(row.email).toBe('mt@example.com');
  });

  it('INV-106 resend cooldown (24h) and the lifetime cap both 429, surviving link re-issues', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Cool Down', 'cd@example.com');

    const first = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(first.status).toBe(200);
    const cooled = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(cooled.status).toBe(429);

    // Age the send past the cooldown but push the counter to the cap.
    testDb.prepare('UPDATE guest_invites SET last_sent_at = ?, send_count = 5 WHERE guest_user_id = ?')
      .run(new Date(Date.now() - 25 * 3600 * 1000).toISOString(), guest);
    const capped = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(capped.status).toBe(429);
  });

  it('INV-107 bulk send: mails guests with emails, skips the rest, reports a summary', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    createGuest(trip.id, 'Has Mail', 'has@example.com');
    createGuest(trip.id, 'Also Mail', 'also@example.com');
    createGuest(trip.id, 'No Mail', null);

    const res = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/send-all`)
      .set('Cookie', authCookie(owner.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sent: 2, skipped_no_email: 1, failed: 0 });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
  });

  it('INV-108 revoke → public resolve 404', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id);
    const { token } = await mintInvite(trip.id, guest, owner.id);

    const rev = await request(app)
      .delete(`/api/trips/${trip.id}/guest-invites/${guest}`)
      .set('Cookie', authCookie(owner.id));
    expect(rev.status).toBe(200);
    expect(rev.body.revoked).toBe(true);
    expect((await request(app).get(`/api/guest-invites/${token}`)).status).toBe(404);
  });

  it('INV-109 funnel stages compute correctly across fixtures', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const created = createGuest(trip.id, 'Stage Created');
    const sent = createGuest(trip.id, 'Stage Sent', 'sent@example.com');
    const opened = createGuest(trip.id, 'Stage Opened');
    const expired = createGuest(trip.id, 'Stage Expired');
    const revoked = createGuest(trip.id, 'Stage Revoked');

    await mintInvite(trip.id, created, owner.id);
    await request(app).post(`/api/trips/${trip.id}/guest-invites/${sent}/send`).set('Cookie', authCookie(owner.id));
    const o = await mintInvite(trip.id, opened, owner.id);
    await request(app).get(`/api/guest-invites/${o.token}`);
    const e = await mintInvite(trip.id, expired, owner.id);
    testDb.prepare('UPDATE guest_invites SET expires_at = ? WHERE id = ?').run(new Date(Date.now() - 1000).toISOString(), e.invite_id);
    await mintInvite(trip.id, revoked, owner.id);
    await request(app).delete(`/api/trips/${trip.id}/guest-invites/${revoked}`).set('Cookie', authCookie(owner.id));

    const res = await request(app).get(`/api/trips/${trip.id}/guest-invites`).set('Cookie', authCookie(owner.id));
    const byName = Object.fromEntries(res.body.guests.map((g: any) => [g.guest_name, g.invite?.stage]));
    expect(byName).toMatchObject({
      'Stage Created': 'created',
      'Stage Sent': 'sent',
      'Stage Opened': 'opened',
      'Stage Expired': 'expired',
      'Stage Revoked': 'revoked',
    });
  });

  it('INV-110 emailed CTA path is the invite deep-link and SMTP-unconfigured → 503', async () => {
    const { user: owner } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    const guest = createGuest(trip.id, 'Link Check', 'lc@example.com');

    const ok = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(ok.status).toBe(200);
    const [, , , , navigateTarget] = vi.mocked(sendEmail).mock.calls[0];
    expect(navigateTarget).toMatch(/^\/invite\/[A-Za-z0-9_-]+$/);

    vi.mocked(isSmtpConfigured).mockReturnValue(false);
    testDb.prepare('UPDATE guest_invites SET last_sent_at = NULL, send_count = 0 WHERE guest_user_id = ?').run(guest);
    const noSmtp = await request(app)
      .post(`/api/trips/${trip.id}/guest-invites/${guest}/send`)
      .set('Cookie', authCookie(owner.id));
    expect(noSmtp.status).toBe(503);
  });
});
