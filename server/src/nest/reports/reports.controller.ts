import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RateLimitService } from '../auth/rate-limit.service';
import type { User } from '../../types';
import { db } from '../../db/database';
import { verifyTripAccess } from '../../services/tripAccess';
import { FILE_VISIBILITY_SQL } from '../../services/fileService';
import { postBotMessage } from '../../services/integrityService';
import { writeAudit, getClientIp } from '../../services/auditLog';

/**
 * /api/trips/:tripId/report — the SM/PM production report (custom).
 *
 * One GET assembles the digest a stage/production manager reads before a call:
 * what timings changed (schedule_changes, the integrity watcher's audit trail),
 * what files landed, who worked how many hours, and everything scheduled in the
 * next 48 hours. POST /share condenses the same digest into a compact text
 * summary and posts it to the event chat through the Travla bot.
 *
 * Guards mirror shifts/budget.controller: every handler verifies trip access
 * (404 for strangers). File rows honour the per-user privacy rule — a Private
 * file only ever appears in its uploader's report.
 */

interface ChangeRow {
  id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  source: string;
  entity: string;
  entity_id: number | null;
  label: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface UpcomingRow {
  id: number;
  title: string;
  time: string;
  day_date: string | null;
  type?: string;
  location?: string | null;
}

const MAX_CHANGES = 100;
const MAX_FILES = 20;
const UPCOMING_WINDOW_MS = 48 * 3600 * 1000;
const SHARE_TOP_CHANGES = 3;
const SHARE_NEXT_TIMINGS = 3;
// Shares post as the neutral bot voice into every member's chat — throttle
// per member+event so the system voice can't be scripted into a flood.
const SHARE_RL_WINDOW = 10 * 60 * 1000;
const SHARE_RL_MAX = 3;

/** '—' for empty values; 'T' → ' ' so datetimes read naturally in chat. */
function chatValue(v: string | null | undefined): string {
  return v == null || String(v).trim() === '' ? '—' : String(v).replace('T', ' ');
}

@Controller('api/trips/:tripId/report')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly rl: RateLimitService) {}

  private requireTrip(tripId: string, user: User): { id: number; user_id: number } {
    const trip = verifyTripAccess(tripId, user.id);
    if (!trip) {
      throw new HttpException({ error: 'Trip not found' }, 404);
    }
    return trip as { id: number; user_id: number };
  }

  /** ?days window for changes/files/shift hours; clamped 1–90, default 7. */
  private parseDays(days?: string | number): number {
    const n = Number(days);
    if (!Number.isFinite(n)) return 7;
    return Math.min(90, Math.max(1, Math.floor(n)));
  }

  /**
   * Planner datetimes are LOCAL-NAIVE venue wall-clock strings, so the "next
   * 48h" window must be anchored to the caller's wall clock — comparing them
   * against UTC now shifts the window by the full UTC offset (10 h for an
   * Australian crew). The client sends its local now; server UTC is only the
   * fallback for callers that don't.
   */
  private parseNow(now?: string): string {
    const candidate = typeof now === 'string' ? now.slice(0, 16) : '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(candidate)) return candidate;
    return new Date().toISOString().slice(0, 16);
  }

  @Get()
  report(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Query('days') daysParam?: string,
    @Query('now') nowParam?: string,
  ) {
    this.requireTrip(tripId, user);
    const days = this.parseDays(daysParam);
    const since = `-${days} days`;

    const changes = db.prepare(`
      SELECT sc.id, sc.actor_user_id, sc.source, sc.entity, sc.entity_id, sc.label, sc.field,
             sc.old_value, sc.new_value, sc.created_at,
             COALESCE(u.display_name, u.username) AS actor_name
      FROM schedule_changes sc
      LEFT JOIN users u ON u.id = sc.actor_user_id
      WHERE sc.trip_id = ? AND sc.created_at >= datetime('now', ?)
      ORDER BY sc.created_at DESC, sc.id DESC
      LIMIT ${MAX_CHANGES}
    `).all(tripId, since) as ChangeRow[];

    // Per-user file privacy: the viewer's report only lists files they can see.
    const files = db.prepare(`
      SELECT f.id, f.original_name, f.file_size, f.mime_type, f.is_private, f.created_at,
             COALESCE(u.display_name, u.username) AS uploaded_by_name
      FROM trip_files f
      LEFT JOIN users u ON u.id = f.uploaded_by
      WHERE f.trip_id = ? AND f.deleted_at IS NULL
        AND f.created_at >= datetime('now', ?)
        AND ${FILE_VISIBILITY_SQL}
      ORDER BY f.created_at DESC
      LIMIT ${MAX_FILES}
    `).all(tripId, since, user.id);

    // Same totals shape as shiftService.getTotals, windowed to the report range:
    // any shift OVERLAPPING the window counts, clamped to the window start, so
    // an overnight/multi-day shift contributes exactly the hours worked inside
    // the range (open shifts count up to now; `open` flags members on shift
    // right now — including a long-running shift that STARTED before the range,
    // matching buildSummary's "On shift now"). Scalar MAX() clamps the
    // lexicographically-ordered UTC strings.
    const shifts = db.prepare(`
      SELECT s.user_id,
        COALESCE(u.display_name, u.username) AS username,
        CAST(SUM(strftime('%s', COALESCE(s.ended_at, CURRENT_TIMESTAMP))
               - strftime('%s', MAX(s.started_at, datetime('now', ?)))) AS INTEGER) AS total_seconds,
        MAX(CASE WHEN s.ended_at IS NULL THEN 1 ELSE 0 END) AS open
      FROM shifts s
      JOIN users u ON u.id = s.user_id
      WHERE s.trip_id = ? AND COALESCE(s.ended_at, CURRENT_TIMESTAMP) >= datetime('now', ?)
      GROUP BY s.user_id
      ORDER BY total_seconds DESC
    `).all(since, tripId, since);

    return { days, changes, files, shifts, upcoming: this.upcoming(tripId, this.parseNow(nowParam)) };
  }

  /**
   * Everything with a clock on it in the next 48 h, soonest first: reservations
   * (absolute reservation_time) and day assignments — an assignment's time is
   * its own reservation_datetime or its day's date + the venue's place_time.
   */
  private upcoming(tripId: string, now: string): (UpcomingRow & { kind: 'reservation' | 'assignment' })[] {
    // reservation_time / reservation_datetime are ISO-ish local-naive strings
    // ('YYYY-MM-DDTHH:MM'), so the window bounds compare lexicographically.
    // `now` is the caller's local wall clock (see parseNow); +48h is pure
    // wall-clock arithmetic (parse as if UTC, add, format back zone-less).
    const from = now;
    const to = new Date(Date.parse(`${now}:00Z`) + UPCOMING_WINDOW_MS).toISOString().slice(0, 16);

    const reservations = db.prepare(`
      SELECT r.id, r.title, r.type, r.location, r.reservation_time AS time, d.date AS day_date
      FROM reservations r
      LEFT JOIN days d ON d.id = r.day_id
      WHERE r.trip_id = ? AND r.status != 'cancelled'
        AND r.reservation_time IS NOT NULL
        AND r.reservation_time >= ? AND r.reservation_time < ?
    `).all(tripId, from, to) as UpcomingRow[];

    const assignments = db.prepare(`
      SELECT * FROM (
        SELECT da.id, p.name AS title, d.date AS day_date,
          COALESCE(
            da.reservation_datetime,
            CASE WHEN d.date IS NOT NULL AND p.place_time IS NOT NULL THEN d.date || 'T' || p.place_time END
          ) AS time
        FROM day_assignments da
        JOIN days d ON d.id = da.day_id
        JOIN places p ON p.id = da.place_id
        WHERE d.trip_id = ?
      ) WHERE time IS NOT NULL AND time >= ? AND time < ?
    `).all(tripId, from, to) as UpcomingRow[];

    return [
      ...reservations.map(r => ({ kind: 'reservation' as const, ...r })),
      ...assignments.map(a => ({ kind: 'assignment' as const, ...a })),
    ].sort((a, b) => a.time.localeCompare(b.time));
  }

  /** Share a compact text summary of the report into the event chat as the bot. */
  @Post('share')
  @HttpCode(200)
  share(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() body: { days?: number | string; now?: string } | undefined,
    @Req() req?: Request,
  ) {
    this.requireTrip(tripId, user);
    if (!this.rl.check('report_share', `${user.id}:${tripId}`, SHARE_RL_MAX, SHARE_RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many requests. Please try again later.' }, 429);
    }
    const days = this.parseDays(body?.days);
    // Bot-voiced posts stay attributable to a human: name the sharer in the
    // message and write an audit row for the actor.
    const sharer = db.prepare('SELECT COALESCE(display_name, username) AS name FROM users WHERE id = ?')
      .get(user.id) as { name: string } | undefined;
    const summary = `${this.buildSummary(tripId, days, this.parseNow(body?.now))}\nShared by ${sharer?.name || user.username}`;
    if (!postBotMessage(tripId, summary)) {
      // The bot post IS this endpoint's entire effect — a swallowed failure
      // must not turn into a success toast on the client.
      throw new HttpException({ error: 'Could not post the report to the event chat' }, 502);
    }
    writeAudit({ userId: user.id, action: 'report.share', resource: tripId, ip: req ? getClientIp(req) : null, details: { days } });
    return { shared: true };
  }

  private buildSummary(tripId: string, days: number, now: string): string {
    const since = `-${days} days`;
    const changeCount = (db.prepare(
      "SELECT COUNT(*) AS c FROM schedule_changes WHERE trip_id = ? AND created_at >= datetime('now', ?)",
    ).get(tripId, since) as { c: number }).c;
    const topChanges = db.prepare(`
      SELECT label, old_value, new_value FROM schedule_changes
      WHERE trip_id = ? AND created_at >= datetime('now', ?)
      ORDER BY created_at DESC, id DESC LIMIT ${SHARE_TOP_CHANGES}
    `).all(tripId, since) as { label: string; old_value: string | null; new_value: string | null }[];
    // The chat is crew-wide, so the shared count only covers Group files —
    // nobody's Private uploads leak into a public summary, even as a number.
    const fileCount = (db.prepare(`
      SELECT COUNT(*) AS c FROM trip_files
      WHERE trip_id = ? AND deleted_at IS NULL AND created_at >= datetime('now', ?)
        AND (is_private = 0 OR uploaded_by IS NULL)
    `).get(tripId, since) as { c: number }).c;
    const onShift = db.prepare(`
      SELECT COALESCE(u.display_name, u.username) AS username
      FROM shifts s JOIN users u ON u.id = s.user_id
      WHERE s.trip_id = ? AND s.ended_at IS NULL
      ORDER BY s.started_at
    `).all(tripId) as { username: string }[];
    const next = this.upcoming(tripId, now).slice(0, SHARE_NEXT_TIMINGS);

    const rangeLabel = days === 1 ? 'last 24h' : days === 2 ? 'last 48h' : `last ${days} days`;
    const lines = [`📋 Production report — ${rangeLabel}`];
    if (changeCount > 0) {
      lines.push(`Schedule changes (${changeCount}):`);
      for (const c of topChanges) {
        lines.push(`• ${c.label}: ${chatValue(c.old_value)} → ${chatValue(c.new_value)}`);
      }
      if (changeCount > topChanges.length) lines.push(`  +${changeCount - topChanges.length} more`);
    } else {
      lines.push('No schedule changes.');
    }
    lines.push(`Files loaded: ${fileCount}`);
    lines.push(onShift.length > 0
      ? `On shift now: ${onShift.map(o => o.username).join(', ')}`
      : 'Nobody on shift.');
    if (next.length > 0) {
      lines.push('Next up:');
      for (const n of next) lines.push(`• ${chatValue(n.time)} — ${n.title}`);
    }
    return lines.join('\n');
  }
}
