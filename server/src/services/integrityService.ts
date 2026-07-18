import { randomUUID } from 'crypto';
import { db } from '../db/database';
import { createMessage } from './collabService';
import { broadcast } from '../websocket';

/**
 * Integrity core (custom): the "Travla" bot — a credential-less users row
 * (is_guest=1 keeps it out of auth, the directory and notification fanout)
 * that authors system messages in event chats. The change watcher, shift
 * announcements and shared reports all speak through it, so crews see one
 * consistent voice for automated updates.
 */

const BOT_USERNAME = 'travla-bot';

/** Find or create the bot user; safe to call on every use. */
export function ensureBotUser(): number {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(BOT_USERNAME) as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db.prepare(
    "INSERT INTO users (username, email, password_hash, role, is_guest, display_name) VALUES (?, ?, '', 'user', 1, 'Travla')"
  ).run(BOT_USERNAME, `bot-${randomUUID()}@guests.invalid`);
  return Number(res.lastInsertRowid);
}

/**
 * Post a system message into the event's chat as the bot and broadcast it
 * live. Never throws — an integrity announcement must not break the write
 * that triggered it.
 */
export function postBotMessage(tripId: string | number, text: string): void {
  try {
    const botId = ensureBotUser();
    const result = createMessage(String(tripId), botId, text.slice(0, 5000), null);
    if (result && 'message' in (result as Record<string, unknown>)) {
      broadcast(String(tripId), 'collab:message:created', { message: (result as { message: unknown }).message }, undefined);
    }
  } catch (e) {
    console.error('[integrity] bot message failed:', e instanceof Error ? e.message : e);
  }
}
