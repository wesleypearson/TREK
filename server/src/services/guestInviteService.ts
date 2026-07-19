import { db } from '../db/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isReservedUsername } from './authService';
import { validatePassword } from './passwordPolicy';
import { promoteGuest } from './tripService';
import { generateToken } from './oidcService';
import { ensureSupplier } from './supplierService';
import { isAddonEnabled } from './adminService';
import { ADDON_IDS } from '../addons';
import { capturePosthog } from './posthogServer';

/**
 * Guest invite links (custom): one-time registration links that convert a
 * temp guest (users.is_guest = 1) into a full account, carrying their whole
 * financial history across via promoteGuest. Every lifecycle stage is stamped
 * on the row (created → sent → opened → registered → promoted) so crew admin
 * can see the funnel, and mirrored to PostHog as telemetry.
 *
 * Security model, mirroring password_reset_tokens rather than invite_tokens:
 * - the raw token (192-bit base64url) is returned exactly once at mint time
 *   and stored ONLY as a sha256 hash — a DB leak exposes no live credential;
 * - at most one live invite per guest (partial unique index); regenerating or
 *   emailing re-issues the link and retires the old one;
 * - expires_at is an ISO-8601 string compared in JS, never SQL (the SQLite
 *   datetime('now') format mismatch would keep expired links alive);
 * - unknown, revoked and already-redeemed tokens are indistinguishable (404);
 *   only genuine expiry gets its own state (410) so the landing page can say
 *   "ask for a fresh one".
 *
 * kind='colleague' rows are trip-less invites minted by a registrant whose own
 * invite carried a company — the B2B loop. Redeeming one creates a fresh
 * account (no promotion) tagged with the same company/supplier.
 */

export type GuestInviteKind = 'guest' | 'colleague';
export type GuestInviteStage =
  | 'created' | 'sent' | 'opened' | 'registered' | 'promoted' | 'revoked' | 'expired';

export interface GuestInviteRow {
  id: number;
  kind: GuestInviteKind;
  guest_user_id: number | null;
  trip_id: number | null;
  token_hash: string;
  email: string | null;
  company_name: string | null;
  company_supplier_id: number | null;
  created_by: number | null;
  expires_at: string | null;
  created_at: string;
  sent_at: string | null;
  last_sent_at: string | null;
  send_count: number;
  opened_at: string | null;
  registered_at: string | null;
  promoted_at: string | null;
  revoked_at: string | null;
  registered_user_id: number | null;
}

export interface InvitePrefill {
  kind: GuestInviteKind;
  guest_name: string | null;
  contact_email: string | null;
  trip_title: string | null;
  inviter_name: string | null;
  company_name: string | null;
  expires_at: string | null;
}

export interface FunnelEntry {
  guest_user_id: number;
  guest_name: string;
  contact_email: string | null;
  invite: null | {
    id: number;
    stage: GuestInviteStage;
    created_at: string;
    sent_at: string | null;
    last_sent_at: string | null;
    send_count: number;
    opened_at: string | null;
    registered_at: string | null;
    promoted_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
  };
}

export const DEFAULT_INVITE_TTL_DAYS = 14;
export const MAX_INVITE_TTL_DAYS = 90;
export const INVITE_SEND_CAP = 5;
export const INVITE_RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const MAX_COLLEAGUE_INVITES = 10;

// Same shape check as authService's module-local EMAIL_REGEX (not exported there).
export const INVITE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InviteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashInviteToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function isInviteExpired(row: Pick<GuestInviteRow, 'expires_at'>): boolean {
  return !!row.expires_at && new Date(row.expires_at) < new Date();
}

/**
 * Single computed stage for display. Terminal success (registered/promoted)
 * wins over everything; revocation and expiry only matter for live invites.
 */
export function computeStage(row: GuestInviteRow): GuestInviteStage {
  if (row.promoted_at) return 'promoted';
  if (row.registered_at) return 'registered';
  if (row.revoked_at) return 'revoked';
  if (isInviteExpired(row)) return 'expired';
  if (row.opened_at) return 'opened';
  if (row.sent_at) return 'sent';
  return 'created';
}

function clampTtlDays(days: number | null | undefined): number {
  const n = typeof days === 'number' && Number.isFinite(days) ? Math.floor(days) : DEFAULT_INVITE_TTL_DAYS;
  return Math.min(MAX_INVITE_TTL_DAYS, Math.max(1, n));
}

function expiryFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/** Same guard as tripService.guestOfTrip: the guest must belong to THIS trip. */
function guestOfTrip(tripId: string | number, guestUserId: number):
  { id: number; display_name: string | null; username: string; contact_email: string | null } | undefined {
  return db.prepare(
    `SELECT u.id, u.display_name, u.username, u.contact_email
     FROM users u JOIN trip_members m ON m.user_id = u.id
     WHERE u.id = ? AND m.trip_id = ? AND u.is_guest = 1`
  ).get(guestUserId, tripId) as { id: number; display_name: string | null; username: string; contact_email: string | null } | undefined;
}

function liveInviteForGuest(guestUserId: number): GuestInviteRow | undefined {
  return db.prepare(
    'SELECT * FROM guest_invites WHERE guest_user_id = ? AND revoked_at IS NULL AND registered_at IS NULL'
  ).get(guestUserId) as GuestInviteRow | undefined;
}

/**
 * Create a guest's invite, or re-issue it (revoke the live row, insert a fresh
 * one). Send history (sent_at/send_count) is carried onto the new row so the
 * resend cooldown and cap span re-issues. Returns the raw token — the ONLY
 * time it ever exists outside the caller's hands.
 */
export function createOrRegenerateInvite(
  tripId: string | number,
  guestUserId: number,
  createdBy: number,
  expiresInDays?: number | null,
): { invite: GuestInviteRow; rawToken: string; regenerated: boolean } {
  const guest = guestOfTrip(tripId, guestUserId);
  if (!guest) throw new InviteError('Guest not found', 404);

  const raw = generateInviteToken();
  const hash = hashInviteToken(raw);
  const expiresAt = expiryFromNow(clampTtlDays(expiresInDays));

  const result = db.transaction(() => {
    const prior = liveInviteForGuest(guestUserId);
    if (prior) {
      db.prepare('UPDATE guest_invites SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), prior.id);
    }
    const info = db.prepare(
      `INSERT INTO guest_invites
         (kind, guest_user_id, trip_id, token_hash, created_by, expires_at, sent_at, last_sent_at, send_count)
       VALUES ('guest', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      guestUserId, tripId, hash, createdBy, expiresAt,
      prior?.sent_at ?? null, prior?.last_sent_at ?? null, prior?.send_count ?? 0,
    );
    const invite = db.prepare('SELECT * FROM guest_invites WHERE id = ?').get(info.lastInsertRowid) as GuestInviteRow;
    return { invite, regenerated: !!prior };
  })();

  capturePosthog('guest_invite_created', {
    trip_id: Number(tripId), invite_id: result.invite.id, kind: 'guest', regenerated: result.regenerated,
  }, `invite:${result.invite.id}`);
  return { ...result, rawToken: raw };
}

/** Revoke the guest's live invite. Returns false when there is none. */
export function revokeInvite(tripId: string | number, guestUserId: number): boolean {
  const guest = guestOfTrip(tripId, guestUserId);
  if (!guest) throw new InviteError('Guest not found', 404);
  const live = liveInviteForGuest(guestUserId);
  if (!live) return false;
  db.prepare('UPDATE guest_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL AND registered_at IS NULL')
    .run(new Date().toISOString(), live.id);
  capturePosthog('guest_invite_revoked', { trip_id: live.trip_id, invite_id: live.id }, `invite:${live.id}`);
  return true;
}

/**
 * Public resolve for the landing page. Stamps opened_at on first hit only.
 * 'not_found' covers unknown, revoked AND already-redeemed tokens on purpose.
 */
export function resolveInvite(rawToken: string):
  | { status: 'ok'; invite: GuestInviteRow; prefill: InvitePrefill }
  | { status: 'not_found' }
  | { status: 'expired' } {
  const row = db.prepare('SELECT * FROM guest_invites WHERE token_hash = ?')
    .get(hashInviteToken(rawToken)) as GuestInviteRow | undefined;
  if (!row || row.revoked_at || row.registered_at) return { status: 'not_found' };
  if (isInviteExpired(row)) return { status: 'expired' };

  if (!row.opened_at) {
    db.prepare('UPDATE guest_invites SET opened_at = ? WHERE id = ? AND opened_at IS NULL')
      .run(new Date().toISOString(), row.id);
    row.opened_at = new Date().toISOString();
    capturePosthog('guest_invite_opened', { trip_id: row.trip_id, invite_id: row.id, kind: row.kind }, `invite:${row.id}`);
  }

  let guestName: string | null = null;
  let contactEmail: string | null = null;
  if (row.guest_user_id) {
    const guest = db.prepare('SELECT COALESCE(display_name, username) AS name, contact_email FROM users WHERE id = ? AND is_guest = 1')
      .get(row.guest_user_id) as { name: string; contact_email: string | null } | undefined;
    guestName = guest?.name ?? null;
    contactEmail = guest?.contact_email ?? row.email;
  }
  const trip = row.trip_id
    ? db.prepare('SELECT title FROM trips WHERE id = ?').get(row.trip_id) as { title: string } | undefined
    : undefined;
  const inviter = row.created_by
    ? db.prepare('SELECT COALESCE(display_name, username) AS name FROM users WHERE id = ?').get(row.created_by) as { name: string } | undefined
    : undefined;

  return {
    status: 'ok',
    invite: row,
    prefill: {
      kind: row.kind,
      guest_name: guestName,
      contact_email: contactEmail,
      trip_title: trip?.title ?? null,
      inviter_name: inviter?.name ?? null,
      company_name: row.company_name,
      expires_at: row.expires_at,
    },
  };
}

/** Funnel view for crew admin: every guest of the trip + their latest invite. */
export function listTripInviteFunnel(tripId: string | number): FunnelEntry[] {
  const guests = db.prepare(
    `SELECT u.id, COALESCE(u.display_name, u.username) AS name, u.contact_email
     FROM trip_members m JOIN users u ON u.id = m.user_id
     WHERE m.trip_id = ? AND COALESCE(u.is_guest, 0) = 1
     ORDER BY m.added_at ASC`
  ).all(tripId) as { id: number; name: string; contact_email: string | null }[];

  return guests.map((g) => {
    const row = db.prepare(
      'SELECT * FROM guest_invites WHERE guest_user_id = ? ORDER BY id DESC LIMIT 1'
    ).get(g.id) as GuestInviteRow | undefined;
    return {
      guest_user_id: g.id,
      guest_name: g.name,
      contact_email: g.contact_email,
      invite: row ? {
        id: row.id,
        stage: computeStage(row),
        created_at: row.created_at,
        sent_at: row.sent_at,
        last_sent_at: row.last_sent_at,
        send_count: row.send_count,
        opened_at: row.opened_at,
        registered_at: row.registered_at,
        promoted_at: row.promoted_at,
        revoked_at: row.revoked_at,
        expires_at: row.expires_at,
      } : null,
    };
  });
}

export interface RedeemBody {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  company_name?: unknown;
}

/**
 * The whole redemption in one transaction: claim the invite (double-submit
 * safe), create the real account with the exact same rules as registerUser,
 * then — for kind='guest' — run promoteGuest so splits, payers, settlements,
 * assignees and expense tabs move onto the new account and the guest row is
 * deleted. A valid invite deliberately bypasses the password_registration
 * toggle (same semantics as admin invite_tokens). Never sets
 * must_change_password (the user just chose their password) and never grants
 * admin (first-user bootstrap is unreachable: a guest implies users exist).
 */
export function redeemGuestInvite(rawToken: string, body: RedeemBody):
  { token: string; user: Record<string, unknown>; trip_id: number | null; invite: GuestInviteRow } {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim().slice(0, 120) : '';

  if (!username || !email || !password) throw new InviteError('Username, email and password are required', 400);
  if (isReservedUsername(username)) throw new InviteError('This username is reserved', 400);
  const pw = validatePassword(password);
  if (!pw.ok) throw new InviteError(pw.reason || 'Password does not meet requirements', 400);
  if (!INVITE_EMAIL_REGEX.test(email) || email.length > 254) throw new InviteError('Invalid email format', 400);

  const hash = hashInviteToken(rawToken);
  const password_hash = bcrypt.hashSync(password, 12);

  const result = db.transaction(() => {
    const row = db.prepare('SELECT * FROM guest_invites WHERE token_hash = ?').get(hash) as GuestInviteRow | undefined;
    if (!row || row.revoked_at || row.registered_at) throw new InviteError('Invalid invite link', 404);
    if (isInviteExpired(row)) throw new InviteError('This invite link has expired', 410);

    // Claim FIRST so a concurrent double-submit loses cleanly (changes === 0)
    // before any users row exists — the OIDC-style abort, not warn-and-continue.
    const claimed = db.prepare(
      'UPDATE guest_invites SET registered_at = ? WHERE id = ? AND registered_at IS NULL AND revoked_at IS NULL'
    ).run(new Date().toISOString(), row.id);
    if (claimed.changes !== 1) throw new InviteError('Invalid invite link', 404);

    // Guests never block uniqueness (their synthetic identities are disposable).
    const clash = db.prepare(
      'SELECT id FROM users WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)) AND COALESCE(is_guest, 0) = 0'
    ).get(email, username);
    if (clash) throw new InviteError('Registration failed. Please try different credentials.', 409);

    const inserted = db.prepare(
      "INSERT INTO users (username, email, password_hash, role, first_seen_version, login_count) VALUES (?, ?, ?, 'user', ?, 0)"
    ).run(username, email, password_hash, process.env.APP_VERSION || '0.0.0');
    const newUserId = Number(inserted.lastInsertRowid);

    // Company loop: best-effort — a supplier hiccup must never lose the registration.
    let supplierId: number | null = null;
    if (companyName) {
      db.prepare('UPDATE guest_invites SET company_name = ? WHERE id = ?').run(companyName, row.id);
      if (isAddonEnabled(ADDON_IDS.SUPPLIERS)) {
        try {
          supplierId = ensureSupplier(companyName, { source: 'invite', createdBy: newUserId }).supplier.id;
          db.prepare('UPDATE guest_invites SET company_supplier_id = ? WHERE id = ?').run(supplierId, row.id);
        } catch (err) {
          console.error('[guest-invite] supplier link failed (registration continues):', err instanceof Error ? err.message : err);
        }
      }
    }

    let promotedAt: string | null = null;
    if (row.kind === 'guest' && row.guest_user_id && row.trip_id) {
      promoteGuest(row.trip_id, row.guest_user_id, newUserId);
      promotedAt = new Date().toISOString();
      db.prepare('UPDATE guest_invites SET promoted_at = ? WHERE id = ?').run(promotedAt, row.id);
    }
    db.prepare('UPDATE guest_invites SET registered_user_id = ? WHERE id = ?').run(newUserId, row.id);

    const finalRow = db.prepare('SELECT * FROM guest_invites WHERE id = ?').get(row.id) as GuestInviteRow;
    const user = { id: newUserId, username, email, role: 'user', avatar: null, avatar_url: null, mfa_enabled: false };
    return { user, tripId: row.trip_id, invite: finalRow, supplierLinked: supplierId != null };
  })();

  const jwt = generateToken({ id: result.user.id as number });
  capturePosthog('guest_invite_registered', {
    trip_id: result.tripId, invite_id: result.invite.id, kind: result.invite.kind, company_linked: result.supplierLinked,
  }, `user:${result.user.id}`);
  if (result.invite.promoted_at) {
    capturePosthog('guest_invite_promoted', { trip_id: result.tripId, invite_id: result.invite.id }, `user:${result.user.id}`);
  }
  return { token: jwt, user: result.user, trip_id: result.tripId, invite: result.invite };
}

/**
 * Colleague invites: only a user who themselves redeemed a company-tagged
 * invite can mint them (cap MAX_COLLEAGUE_INVITES per call), inheriting the
 * company so the CRM link survives the hop.
 */
export function createColleagueInvites(userId: number, count: number): { rawTokens: string[]; company_name: string } {
  const n = Math.floor(count);
  if (!Number.isFinite(n) || n < 1 || n > MAX_COLLEAGUE_INVITES) {
    throw new InviteError(`Count must be between 1 and ${MAX_COLLEAGUE_INVITES}`, 400);
  }
  const source = db.prepare(
    `SELECT company_name, company_supplier_id FROM guest_invites
     WHERE registered_user_id = ? AND company_name IS NOT NULL AND company_name != ''
     ORDER BY id DESC LIMIT 1`
  ).get(userId) as { company_name: string; company_supplier_id: number | null } | undefined;
  if (!source) throw new InviteError('Colleague invites need a redeemed company invite', 403);

  const raws: string[] = [];
  const expiresAt = expiryFromNow(DEFAULT_INVITE_TTL_DAYS);
  const insert = db.prepare(
    `INSERT INTO guest_invites (kind, token_hash, company_name, company_supplier_id, created_by, expires_at)
     VALUES ('colleague', ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (let i = 0; i < n; i++) {
      const raw = generateInviteToken();
      insert.run(hashInviteToken(raw), source.company_name, source.company_supplier_id, userId, expiresAt);
      raws.push(raw);
    }
  })();

  capturePosthog('colleague_invite_created', {
    invite_ids_count: n, company_supplier_id: source.company_supplier_id,
  }, `user:${userId}`);
  return { rawTokens: raws, company_name: source.company_name };
}

/** Stamp a successful email send (called by guestInviteEmail with sendEmail's boolean). */
export function recordInviteSent(inviteId: number, toEmail: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE guest_invites
     SET sent_at = COALESCE(sent_at, ?), last_sent_at = ?, send_count = send_count + 1, email = ?
     WHERE id = ?`
  ).run(now, now, toEmail, inviteId);
}
