import crypto from 'crypto';
import { db } from '../db/database';
import { getUserSettings } from './settingsService';
import { canViewBudgetItem } from './budgetService';
import type { BudgetItem, TripFile } from '../types';

/**
 * Public expense tabs (custom): a per-person running balance ("tab") the owner
 * shares as an unguessable link. No Travla account is needed to view it — the
 * page shows what's owed, the owner's payment methods (bank / PayID / Venmo /
 * other, from profile settings), optionally the original receipts, and a
 * one-use join link to register and join the trip.
 *
 * Money model: item amounts are frozen at share time (label + amount survive
 * later budget-item edits/deletes). Balance = sum(items) − sum(payments).
 * Payments are recorded by the OWNER when money arrives — the public page
 * never mutates balances beyond the one-time name claim.
 */

/** Profile settings keys surfaced on the public tab page. */
export const PAYMENT_SETTING_KEYS = ['payment_bank', 'payment_payid', 'payment_venmo', 'payment_other'] as const;

export interface ExpenseTab {
  id: number;
  trip_id: number;
  owner_user_id: number;
  token: string;
  first_name: string;
  last_name: string;
  claimed_first_name?: string | null;
  claimed_last_name?: string | null;
  claimed_at?: string | null;
  join_token?: string | null;
  currency?: string | null;
  revoked_at?: string | null;
  created_at?: string;
}

export interface ExpenseTabItem {
  id: number;
  tab_id: number;
  budget_item_id?: number | null;
  label: string;
  amount: number;
  currency?: string | null;
  expense_date?: string | null;
  share_receipt: number;
  receipt_file_id?: number | null;
  created_at?: string;
}

const newToken = () => crypto.randomBytes(24).toString('base64url');

function tabTotals(tabId: number): { charged: number; paid: number; balance: number } {
  const charged = (db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM expense_tab_items WHERE tab_id = ?').get(tabId) as { s: number }).s;
  const paid = (db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM expense_tab_payments WHERE tab_id = ?').get(tabId) as { s: number }).s;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { charged: r(charged), paid: r(paid), balance: r(charged - paid) };
}

// ---------------------------------------------------------------------------
// Owner-side CRUD (trip-scoped)
// ---------------------------------------------------------------------------

export function listTabs(tripId: string | number, ownerUserId: number) {
  const tabs = db.prepare('SELECT * FROM expense_tabs WHERE trip_id = ? AND owner_user_id = ? ORDER BY created_at DESC').all(tripId, ownerUserId) as ExpenseTab[];
  return tabs.map(t => ({ ...t, ...tabTotals(t.id), items: listTabItems(t.id), payments: listTabPayments(t.id) }));
}

export function getTab(tripId: string | number, tabId: string | number, ownerUserId: number): ExpenseTab | undefined {
  return db.prepare('SELECT * FROM expense_tabs WHERE id = ? AND trip_id = ? AND owner_user_id = ?').get(tabId, tripId, ownerUserId) as ExpenseTab | undefined;
}

export function createTab(tripId: string | number, ownerUserId: number, data: { first_name: string; last_name?: string; currency?: string | null }) {
  // One-use, non-expiring registration invite bound to this trip: the visitor
  // can create an account from the tab page and land in the trip. Scoped
  // deliberately — a budget_edit member can only ever invite into THIS trip.
  const joinToken = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO invite_tokens (token, max_uses, expires_at, created_by, trip_id) VALUES (?, 1, NULL, ?, ?)').run(joinToken, ownerUserId, tripId);
  const result = db.prepare(
    'INSERT INTO expense_tabs (trip_id, owner_user_id, token, first_name, last_name, join_token, currency) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(tripId, ownerUserId, newToken(), data.first_name.trim().slice(0, 80), (data.last_name || '').trim().slice(0, 80), joinToken, data.currency || null);
  const tab = db.prepare('SELECT * FROM expense_tabs WHERE id = ?').get(result.lastInsertRowid) as ExpenseTab;
  return { ...tab, ...tabTotals(tab.id), items: [], payments: [] };
}

export function setTabRevoked(tripId: string | number, tabId: string | number, ownerUserId: number, revoked: boolean): boolean {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return false;
  db.prepare('UPDATE expense_tabs SET revoked_at = ? WHERE id = ?').run(revoked ? new Date().toISOString() : null, tabId);
  return true;
}

export function deleteTab(tripId: string | number, tabId: string | number, ownerUserId: number): boolean {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return false;
  if (tab.join_token) db.prepare('DELETE FROM invite_tokens WHERE token = ? AND used_count = 0').run(tab.join_token);
  db.prepare('DELETE FROM expense_tabs WHERE id = ?').run(tabId);
  return true;
}

export function listTabItems(tabId: number): ExpenseTabItem[] {
  return db.prepare('SELECT * FROM expense_tab_items WHERE tab_id = ? ORDER BY created_at DESC, id DESC').all(tabId) as ExpenseTabItem[];
}

export function listTabPayments(tabId: number) {
  return db.prepare('SELECT * FROM expense_tab_payments WHERE tab_id = ? ORDER BY created_at DESC, id DESC').all(tabId) as { id: number; tab_id: number; amount: number; note: string | null; created_at: string }[];
}

/**
 * Charge an expense (or a free-form amount) to the tab. When budget_item_id is
 * given, label/date/receipt default from that item — but only if the owner can
 * actually see it (personal expenses of others 404 upstream of this).
 */
export function addTabItem(
  tripId: string | number,
  tabId: string | number,
  ownerUserId: number,
  data: { budget_item_id?: number | null; label?: string; amount: number; share_receipt?: boolean },
): ExpenseTabItem | { error: string } | null {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return null;
  const amount = Math.round(Number(data.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be greater than zero' };

  let label = (data.label || '').trim().slice(0, 200);
  let expenseDate: string | null = null;
  let currency: string | null = tab.currency || null;
  let receiptFileId: number | null = null;

  if (data.budget_item_id != null) {
    const item = db.prepare('SELECT * FROM budget_items WHERE id = ? AND trip_id = ?').get(data.budget_item_id, tripId) as BudgetItem | undefined;
    if (!item || !canViewBudgetItem(item, ownerUserId)) return { error: 'Expense not found' };
    if (!label) label = item.name;
    expenseDate = item.expense_date || null;
    currency = item.currency || currency;
    receiptFileId = item.receipt_file_id ?? null;
  }
  if (!label) return { error: 'A label is required' };

  const result = db.prepare(
    'INSERT INTO expense_tab_items (tab_id, budget_item_id, label, amount, currency, expense_date, share_receipt, receipt_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(tab.id, data.budget_item_id ?? null, label, amount, currency, expenseDate, data.share_receipt && receiptFileId ? 1 : 0, receiptFileId);
  return db.prepare('SELECT * FROM expense_tab_items WHERE id = ?').get(result.lastInsertRowid) as ExpenseTabItem;
}

export function deleteTabItem(tripId: string | number, tabId: string | number, itemId: string | number, ownerUserId: number): boolean {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return false;
  return db.prepare('DELETE FROM expense_tab_items WHERE id = ? AND tab_id = ?').run(itemId, tab.id).changes > 0;
}

export function addTabPayment(tripId: string | number, tabId: string | number, ownerUserId: number, data: { amount: number; note?: string | null }) {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return null;
  const amount = Math.round(Number(data.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be greater than zero' } as const;
  const result = db.prepare('INSERT INTO expense_tab_payments (tab_id, amount, note) VALUES (?, ?, ?)').run(tab.id, amount, (data.note || '').trim().slice(0, 300) || null);
  return db.prepare('SELECT * FROM expense_tab_payments WHERE id = ?').get(result.lastInsertRowid) as { id: number };
}

export function deleteTabPayment(tripId: string | number, tabId: string | number, paymentId: string | number, ownerUserId: number): boolean {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return false;
  return db.prepare('DELETE FROM expense_tab_payments WHERE id = ? AND tab_id = ?').run(paymentId, tab.id).changes > 0;
}

// ---------------------------------------------------------------------------
// Public (token) side
// ---------------------------------------------------------------------------

function getActiveTabByToken(token: string): ExpenseTab | undefined {
  const tab = db.prepare('SELECT * FROM expense_tabs WHERE token = ?').get(token) as ExpenseTab | undefined;
  if (!tab || tab.revoked_at) return undefined;
  return tab;
}

/** The full public read model — everything the hosted repayment page renders. */
export function getPublicTab(token: string) {
  const tab = getActiveTabByToken(token);
  if (!tab) return null;
  const owner = db.prepare('SELECT id, COALESCE(display_name, username) AS name FROM users WHERE id = ?').get(tab.owner_user_id) as { id: number; name: string } | undefined;
  const trip = db.prepare('SELECT title, currency FROM trips WHERE id = ?').get(tab.trip_id) as { title: string; currency: string } | undefined;
  const settings = getUserSettings(tab.owner_user_id) as Record<string, unknown>;
  const payment_methods: Record<string, string> = {};
  for (const key of PAYMENT_SETTING_KEYS) {
    const v = settings[key];
    if (typeof v === 'string' && v.trim()) payment_methods[key] = v.trim().slice(0, 300);
  }
  const items = listTabItems(tab.id).map(i => ({
    id: i.id,
    label: i.label,
    amount: i.amount,
    currency: i.currency,
    expense_date: i.expense_date,
    created_at: i.created_at,
    has_receipt: !!(i.share_receipt && i.receipt_file_id),
  }));
  const join_url = tab.join_token && db.prepare('SELECT 1 FROM invite_tokens WHERE token = ? AND used_count = 0').get(tab.join_token)
    ? `/login?invite=${tab.join_token}`
    : null;
  return {
    owner_name: owner?.name || 'A Travla user',
    trip_title: trip?.title || '',
    currency: tab.currency || trip?.currency || 'AUD',
    first_name: tab.claimed_first_name || tab.first_name,
    last_name: tab.claimed_last_name ?? tab.last_name,
    claimed: !!tab.claimed_at,
    payment_methods,
    items,
    payments: listTabPayments(tab.id).map(p => ({ id: p.id, amount: p.amount, note: p.note, created_at: p.created_at })),
    ...tabTotals(tab.id),
    join_url,
  };
}

/** One-time name capture from the visitor ("basic first and last names"). */
export function claimTab(token: string, firstName: string, lastName: string): { ok: true } | { error: string; status: number } {
  const tab = getActiveTabByToken(token);
  if (!tab) return { error: 'Not found', status: 404 };
  if (tab.claimed_at) return { error: 'This tab has already been claimed', status: 409 };
  const f = firstName.trim().slice(0, 80);
  const l = lastName.trim().slice(0, 80);
  if (!f || !l) return { error: 'First and last name are required', status: 400 };
  db.prepare('UPDATE expense_tabs SET claimed_first_name = ?, claimed_last_name = ?, claimed_at = ? WHERE id = ?')
    .run(f, l, new Date().toISOString(), tab.id);
  return { ok: true };
}

/**
 * Resolve the on-disk receipt for a tab item — only when the owner explicitly
 * shared it, the tab is live, and the file still belongs to the tab's trip.
 */
export function getPublicReceiptFile(token: string, itemId: string | number): TripFile | null {
  const tab = getActiveTabByToken(token);
  if (!tab) return null;
  const item = db.prepare('SELECT * FROM expense_tab_items WHERE id = ? AND tab_id = ?').get(itemId, tab.id) as ExpenseTabItem | undefined;
  if (!item || !item.share_receipt || !item.receipt_file_id) return null;
  const file = db.prepare('SELECT * FROM trip_files WHERE id = ? AND trip_id = ? AND deleted_at IS NULL').get(item.receipt_file_id, tab.trip_id) as TripFile | undefined;
  return file || null;
}

// ---------------------------------------------------------------------------
// Accounting export (CSV; the JSON twin is the owner GET endpoint itself)
// ---------------------------------------------------------------------------

export function tabCsv(tripId: string | number, tabId: string | number, ownerUserId: number): { filename: string; csv: string } | null {
  const tab = getTab(tripId, tabId, ownerUserId);
  if (!tab) return null;
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: string[] = ['Date,Type,Description,Amount,Currency'];
  for (const i of listTabItems(tab.id)) {
    rows.push([esc(i.expense_date || (i.created_at || '').slice(0, 10)), 'Charge', esc(i.label), i.amount.toFixed(2), esc(i.currency || tab.currency || '')].join(','));
  }
  for (const p of listTabPayments(tab.id)) {
    rows.push([esc((p.created_at || '').slice(0, 10)), 'Payment', esc(p.note || 'Payment received'), (-p.amount).toFixed(2), esc(tab.currency || '')].join(','));
  }
  const { balance } = tabTotals(tab.id);
  rows.push(['', 'Balance', esc(`${tab.first_name} ${tab.last_name}`.trim()), balance.toFixed(2), esc(tab.currency || '')].join(','));
  const name = `${tab.first_name}-${tab.last_name}`.trim().replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'tab';
  return { filename: `expense-tab-${name}.csv`, csv: rows.join('\r\n') + '\r\n' };
}
