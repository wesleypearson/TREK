import { randomUUID } from 'crypto';
import { db } from '../db/database';
import { createMessage } from './collabService';
import { broadcast } from '../websocket';
import { send } from './notificationService';
import { isSmtpConfigured, sendEmail, getEventText, getUserLanguage } from './notifications';
import { capturePosthog } from './posthogServer';

/**
 * Integrity core (custom): the "Travla" bot — a credential-less users row
 * (is_guest=1 keeps it out of auth, the directory and notification fanout)
 * that authors system messages in event chats. The change watcher, shift
 * announcements and shared reports all speak through it, so crews see one
 * consistent voice for automated updates.
 */

const BOT_USERNAME = 'travla-bot';

/**
 * Find or create the bot user; safe to call on every use. The lookup insists
 * on is_guest = 1 so a REAL account that somehow carries the bot's username can
 * never be resolved as the system voice (the reserved-username guard in
 * authService blocks registering/renaming into it; a migration seeds the row
 * eagerly so no signup can race the first announcement for the name).
 */
export function ensureBotUser(): number {
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND COALESCE(is_guest, 0) = 1').get(BOT_USERNAME) as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db.prepare(
    "INSERT INTO users (username, email, password_hash, role, is_guest, display_name) VALUES (?, ?, '', 'user', 1, 'Travla')"
  ).run(BOT_USERNAME, `bot-${randomUUID()}@guests.invalid`);
  return Number(res.lastInsertRowid);
}

/**
 * Post a system message into the event's chat as the bot and broadcast it
 * live. Never throws — an integrity announcement must not break the write
 * that triggered it. Returns true when the message actually landed, so call
 * sites where the bot post IS the whole effect (report share) can surface a
 * real failure instead of a silent success.
 */
export function postBotMessage(tripId: string | number, text: string): boolean {
  try {
    const botId = ensureBotUser();
    const result = createMessage(String(tripId), botId, text.slice(0, 5000), null);
    if (result && 'message' in (result as Record<string, unknown>)) {
      broadcast(String(tripId), 'collab:message:created', { message: (result as { message: unknown }).message }, undefined);
      return true;
    }
    return false;
  } catch (e) {
    console.error('[integrity] bot message failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

// ── The change watcher ──────────────────────────────────────────────────────
//
// Every timing-relevant write lands in schedule_changes immediately; the
// announcement is debounced PER TRIP so a burst of edits (a day reorder, a
// sync run, a rapid-fire session in the editor) flushes as ONE bot message /
// notification / guest email instead of a dozen.

export type ScheduleChangeSource = 'edit' | 'reorder' | 'sync' | 'import';
export type ScheduleChangeEntity = 'reservation' | 'assignment' | 'place' | 'trip' | 'accommodation';

export interface ScheduleChangeInput {
  tripId: string | number;
  actorUserId?: number | null;
  source?: ScheduleChangeSource;
  entity: ScheduleChangeEntity;
  entityId?: number | null;
  /** Human name of the changed thing (booking title, place name, trip title). */
  label: string;
  field: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
}

const FLUSH_DEBOUNCE_MS = 5000;
const MAX_LISTED_CHANGES = 6;

/** Per-trip debounce timers (module-level so bursts across requests coalesce). */
const flushTimers = new Map<number, ReturnType<typeof setTimeout>>();

function asText(v: string | number | null | undefined): string | null {
  return v == null ? null : String(v);
}

/**
 * Record one changed timing field. INSERTs the audit row synchronously (the
 * caller's transaction semantics stay untouched) and (re)arms the trip's 5s
 * flush timer. Never throws — the watcher must not break the write it watches.
 */
export function recordScheduleChange(input: ScheduleChangeInput): void {
  try {
    const tripId = Number(input.tripId);
    if (!Number.isFinite(tripId)) return;
    db.prepare(`
      INSERT INTO schedule_changes (trip_id, actor_user_id, source, entity, entity_id, label, field, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tripId,
      input.actorUserId ?? null,
      input.source ?? 'edit',
      input.entity,
      input.entityId ?? null,
      input.label,
      input.field,
      asText(input.oldValue),
      asText(input.newValue),
    );

    // Under vitest the auto-flush timer would fire seconds later against a
    // reset test DB (schedule_changes survives resets) — tests flush
    // deterministically via __flushNowForTests instead.
    if (process.env.NODE_ENV === 'test') return;
    const pending = flushTimers.get(tripId);
    if (pending) clearTimeout(pending);
    const timer = setTimeout(() => {
      flushTimers.delete(tripId);
      void flushScheduleChanges(tripId);
    }, FLUSH_DEBOUNCE_MS);
    (timer as { unref?: () => void }).unref?.();
    flushTimers.set(tripId, timer);
  } catch (e) {
    console.error('[integrity] recordScheduleChange failed:', e instanceof Error ? e.message : e);
  }
}

interface PendingChangeRow {
  id: number;
  actor_user_id: number | null;
  entity: string;
  label: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  actor_name: string | null;
}

function describeChange(r: PendingChangeRow): string {
  const val = (v: string | null) => (v == null || v.trim() === '' ? '—' : v.replace('T', ' '));
  const endSuffix = r.field.includes('end') ? ' (end)' : '';
  const by = r.actor_name ? ` (by ${r.actor_name})` : '';
  return `${r.label}: ${val(r.old_value)} → ${val(r.new_value)}${endSuffix}${by}`;
}

/**
 * Flush the trip's un-broadcast schedule changes as ONE announcement:
 * bot chat message + in-app notification to the whole crew + a direct email to
 * each guest member with a real contact address (guests are excluded from the
 * regular notification fanout by design). Stamps broadcast_at on flushed rows
 * so a change is never announced twice. Never throws.
 */
async function flushScheduleChanges(tripId: number): Promise<void> {
  try {
    const rows = db.prepare(`
      SELECT sc.id, sc.actor_user_id, sc.entity, sc.label, sc.field, sc.old_value, sc.new_value,
             COALESCE(u.display_name, u.username) AS actor_name
      FROM schedule_changes sc
      LEFT JOIN users u ON u.id = sc.actor_user_id
      WHERE sc.trip_id = ? AND sc.broadcast_at IS NULL
      ORDER BY sc.id
    `).all(tripId) as PendingChangeRow[];
    if (rows.length === 0) return;

    const stamp = db.prepare('UPDATE schedule_changes SET broadcast_at = CURRENT_TIMESTAMP WHERE id = ?');
    db.transaction(() => { for (const r of rows) stamp.run(r.id); })();

    const lines = rows.slice(0, MAX_LISTED_CHANGES).map(describeChange);
    if (rows.length > MAX_LISTED_CHANGES) lines.push(`+${rows.length - MAX_LISTED_CHANGES} more`);
    const summary = lines.join('\n');

    // 1) The bot announces in the event chat.
    postBotMessage(tripId, `⚠ Timings changed — ${summary}`);

    // 2) In-app notification to ALL crew (actorId null → nobody is excluded;
    //    a burst can have several actors, and even the editor wants the recap).
    const trip = db.prepare('SELECT title FROM trips WHERE id = ?').get(tripId) as { title: string } | undefined;
    const params = {
      trip: trip?.title || 'Untitled',
      count: String(rows.length),
      summary,
      tripId: String(tripId),
    };
    try {
      await send({ event: 'schedule_change', actorId: null, scope: 'trip', targetId: tripId, params });
    } catch (e) {
      console.error('[integrity] schedule_change notification failed:', e instanceof Error ? e.message : e);
    }

    // 3) Guests never appear in the notification fanout (resolveRecipients
    //    filters them), but crews want day-of-show timing changes to reach
    //    their temp people too — email their REAL contact address directly.
    //    Silent skip when the instance has no SMTP.
    if (isSmtpConfigured()) {
      const guests = db.prepare(`
        SELECT u.id, u.contact_email
        FROM trip_members m
        JOIN users u ON u.id = m.user_id
        WHERE m.trip_id = ? AND COALESCE(u.is_guest, 0) = 1
          AND u.contact_email IS NOT NULL AND u.contact_email != ''
      `).all(tripId) as { id: number; contact_email: string }[];
      await Promise.all(guests.map(async (g) => {
        try {
          const { title, body } = getEventText(getUserLanguage(g.id), 'schedule_change', params);
          await sendEmail(g.contact_email, title, body, g.id, `/trips/${tripId}`);
        } catch (e) {
          console.error('[integrity] guest email failed:', e instanceof Error ? e.message : e);
        }
      }));
    }

    // 4) Server-side analytics (production only, fire-and-forget).
    capturePosthog('integrity_broadcast', { trip_id: tripId, changes: rows.length });
  } catch (e) {
    console.error('[integrity] schedule change flush failed:', e instanceof Error ? e.message : e);
  }
}

// The armed 5s debounce timers live only in this process (and are unref()'d),
// so a deploy/restart discards them: rows already in schedule_changes would
// either never be announced or be flushed days later — stale old→new values
// presented as fresh. The sweep (run at boot and periodically by the
// scheduler) repairs both: rows pending longer than the debounce but younger
// than the stale cutoff are announced now; anything older is stamped as
// broadcast WITHOUT announcing so the crew is never time-warped.

/** Rows younger than this may still have a live debounce timer — leave them. */
const SWEEP_MIN_AGE_SQL = '-60 seconds';
/** Rows pending longer than this are stamped silently instead of announced. */
const SWEEP_STALE_AGE_SQL = '-1 hour';

/** Announce orphaned pending schedule changes; stamp stale ones. Never throws. */
export async function sweepPendingScheduleChanges(): Promise<void> {
  try {
    db.prepare(`
      UPDATE schedule_changes SET broadcast_at = CURRENT_TIMESTAMP
      WHERE broadcast_at IS NULL AND created_at < datetime('now', ?)
    `).run(SWEEP_STALE_AGE_SQL);

    const trips = db.prepare(`
      SELECT DISTINCT trip_id FROM schedule_changes
      WHERE broadcast_at IS NULL AND created_at < datetime('now', ?)
    `).all(SWEEP_MIN_AGE_SQL) as { trip_id: number }[];
    for (const t of trips) {
      const pending = flushTimers.get(t.trip_id);
      if (pending) {
        clearTimeout(pending);
        flushTimers.delete(t.trip_id);
      }
      await flushScheduleChanges(t.trip_id);
    }
  } catch (e) {
    console.error('[integrity] schedule change sweep failed:', e instanceof Error ? e.message : e);
  }
}

/** Test hook: cancel the debounce timer and flush this trip's changes now. */
export async function __flushNowForTests(tripId: string | number): Promise<void> {
  const id = Number(tripId);
  const pending = flushTimers.get(id);
  if (pending) {
    clearTimeout(pending);
    flushTimers.delete(id);
  }
  await flushScheduleChanges(id);
}
