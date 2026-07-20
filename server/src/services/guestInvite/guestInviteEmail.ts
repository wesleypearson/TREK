import { db } from '../../db/database';
import { sendEmail, getAppUrl, getUserLanguage, isSmtpConfigured } from '../notifications';
import {
  createOrRegenerateInvite, recordInviteSent, InviteError,
  INVITE_EMAIL_REGEX, INVITE_SEND_CAP, INVITE_RESEND_COOLDOWN_MS,
} from '../guestInviteService';
import { getInviteEmailText } from './inviteEmail.i18n';
import { capturePosthog } from '../posthogServer';

/**
 * The EDM side of guest invites. Emailing always (re-)issues the link: tokens
 * are hashed at rest, so an existing row's raw token is unrecoverable — the
 * freshest email therefore always carries a working link and at most one
 * credential is live at a time. Older emailed/copied links die on re-send;
 * the landing page's "ask the crew admin for a fresh one" copy covers that.
 *
 * Emails go straight to users.contact_email via sendEmail (the
 * integrityService guest precedent) — the notification fanout hard-excludes
 * guests and its channels default to off, so this is deliberately transactional.
 *
 * 'sent' is stamped ONLY when sendEmail resolves true (transport accepted);
 * cooldown (24h) and lifetime cap (5) span link re-issues because the send
 * history is carried onto regenerated rows.
 */

export interface SendResult {
  sent: boolean;
  invite_id: number;
  /** True when the emailed link was built from a localhost fallback — unusable off-box. */
  localhost_link_warning?: boolean;
}

export async function sendGuestInvite(
  tripId: string | number,
  guestUserId: number,
  sentBy: number,
): Promise<SendResult> {
  if (!isSmtpConfigured()) throw new InviteError('Email is not configured on this server', 503);

  const guest = db.prepare(
    `SELECT u.id, COALESCE(u.display_name, u.username) AS name, u.contact_email
     FROM users u JOIN trip_members m ON m.user_id = u.id
     WHERE u.id = ? AND m.trip_id = ? AND u.is_guest = 1`
  ).get(guestUserId, tripId) as { id: number; name: string; contact_email: string | null } | undefined;
  if (!guest) throw new InviteError('Guest not found', 404);
  if (!guest.contact_email || !INVITE_EMAIL_REGEX.test(guest.contact_email)) {
    throw new InviteError('Guest has no valid contact email', 400);
  }

  // Cooldown/cap read from the latest row (history is carried across re-issues).
  const latest = db.prepare(
    'SELECT last_sent_at, send_count FROM guest_invites WHERE guest_user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(guestUserId) as { last_sent_at: string | null; send_count: number } | undefined;
  if (latest?.last_sent_at && Date.now() - new Date(latest.last_sent_at).getTime() < INVITE_RESEND_COOLDOWN_MS) {
    throw new InviteError('Invite was sent recently — try again later', 429);
  }
  if ((latest?.send_count ?? 0) >= INVITE_SEND_CAP) {
    throw new InviteError('Send limit reached for this guest', 429);
  }

  const { invite, rawToken } = createOrRegenerateInvite(tripId, guestUserId, sentBy);

  const trip = db.prepare('SELECT title FROM trips WHERE id = ?').get(tripId) as { title: string } | undefined;
  const inviter = db.prepare('SELECT COALESCE(display_name, username) AS name FROM users WHERE id = ?')
    .get(sentBy) as { name: string } | undefined;
  const t = getInviteEmailText(getUserLanguage(guest.id));
  const expiresDate = invite.expires_at ? new Date(invite.expires_at).toISOString().slice(0, 10) : '';

  const subject = t.subject({ inviter: inviter?.name ?? 'Your crew', trip: trip?.title ?? 'your event' });
  const body = [
    t.greeting({ name: guest.name }),
    '',
    t.body({ inviter: inviter?.name ?? 'Your crew', trip: trip?.title ?? 'your event' }),
    '',
    t.ctaHint,
    expiresDate ? t.expiry({ date: expiresDate }) : '',
    '',
    t.ignore,
  ].filter((line, i, arr) => !(line === '' && arr[i - 1] === '')).join('\n');

  // Emailed links MUST come from the server's canonical URL, never request
  // headers; a localhost fallback means APP_URL is unset — flag it so the
  // admin UI can warn instead of silently mailing dead links.
  const appUrl = getAppUrl();
  const ok = await sendEmail(guest.contact_email, subject, body, guest.id, `/invite/${rawToken}`);
  if (!ok) throw new InviteError('Email could not be sent', 502);

  recordInviteSent(invite.id, guest.contact_email);
  const resend = (latest?.send_count ?? 0) > 0;
  capturePosthog('guest_invite_sent', {
    trip_id: Number(tripId), invite_id: invite.id, resend, send_count: (latest?.send_count ?? 0) + 1,
  }, `invite:${invite.id}`);

  return {
    sent: true,
    invite_id: invite.id,
    ...(appUrl.startsWith('http://localhost') ? { localhost_link_warning: true } : {}),
  };
}

export interface BulkSendSummary {
  sent: number;
  skipped_no_email: number;
  skipped_cooldown: number;
  skipped_capped: number;
  failed: number;
}

/**
 * Bulk EDM: every unregistered guest of the trip with a contact email, one
 * try/catch per guest so a single bad address never sinks the run.
 */
export async function bulkSendTripInvites(tripId: string | number, sentBy: number): Promise<BulkSendSummary> {
  if (!isSmtpConfigured()) throw new InviteError('Email is not configured on this server', 503);

  const guests = db.prepare(
    `SELECT u.id, u.contact_email
     FROM trip_members m JOIN users u ON u.id = m.user_id
     WHERE m.trip_id = ? AND COALESCE(u.is_guest, 0) = 1`
  ).all(tripId) as { id: number; contact_email: string | null }[];

  const summary: BulkSendSummary = { sent: 0, skipped_no_email: 0, skipped_cooldown: 0, skipped_capped: 0, failed: 0 };
  for (const g of guests) {
    if (!g.contact_email || !INVITE_EMAIL_REGEX.test(g.contact_email)) {
      summary.skipped_no_email++;
      continue;
    }
    try {
      await sendGuestInvite(tripId, g.id, sentBy);
      summary.sent++;
    } catch (err) {
      if (err instanceof InviteError && err.status === 429) {
        if (err.message.includes('recently')) summary.skipped_cooldown++;
        else summary.skipped_capped++;
      } else {
        summary.failed++;
        console.error('[guest-invite] bulk send failed for guest', g.id, err instanceof Error ? err.message : err);
      }
    }
  }

  capturePosthog('guest_invite_bulk_sent', {
    trip_id: Number(tripId), sent: summary.sent, skipped_no_email: summary.skipped_no_email, failed: summary.failed,
  });
  return summary;
}
