import crypto from 'crypto';
import { db } from '../db/database';
import { getUserSettings } from './settingsService';
import { canViewBudgetItem, calculateSettlement, splitEqualShares, listSettlements } from './budgetService';
import { createGuest } from './tripService';
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
  /**
   * Linked trip member (custom): typically a guest (#1362) — the single temp
   * user per trip. A linked tab is trip-visible (not owner-scoped) and its
   * public page shows the member's LIVE ledger position instead of frozen
   * charges. NULL = legacy standalone tab.
   */
  member_user_id?: number | null;
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

/** Member metadata riding along on a linked tab (display name, guest badge). */
function memberInfo(memberUserId: number | null | undefined) {
  if (memberUserId == null) return null;
  const u = db.prepare('SELECT id, COALESCE(display_name, username) AS name, is_guest FROM users WHERE id = ?').get(memberUserId) as
    { id: number; name: string; is_guest?: number } | undefined;
  return u ? { user_id: u.id, name: u.name, is_guest: !!u.is_guest } : null;
}

export function listTabs(tripId: string | number, viewerUserId: number) {
  // The viewer's own standalone tabs, plus EVERY member-linked tab of the trip —
  // linked tabs are a shared trip resource ("allow auth users to share expenses
  // with them"), not private bookkeeping.
  const tabs = db.prepare(
    'SELECT * FROM expense_tabs WHERE trip_id = ? AND (owner_user_id = ? OR member_user_id IS NOT NULL) ORDER BY created_at DESC'
  ).all(tripId, viewerUserId) as ExpenseTab[];
  return tabs.map(t => ({ ...t, ...tabTotals(t.id), items: listTabItems(t.id), payments: listTabPayments(t.id), member: memberInfo(t.member_user_id) }));
}

export function getTab(tripId: string | number, tabId: string | number, userId: number): ExpenseTab | undefined {
  // Mutation scope: your own standalone tabs, or any linked tab of the trip.
  return db.prepare(
    'SELECT * FROM expense_tabs WHERE id = ? AND trip_id = ? AND (owner_user_id = ? OR member_user_id IS NOT NULL)'
  ).get(tabId, tripId, userId) as ExpenseTab | undefined;
}

export function createTab(
  tripId: string | number,
  ownerUserId: number,
  data: { first_name: string; last_name?: string; currency?: string | null; member_user_id?: number | null; create_guest?: boolean },
) {
  let memberUserId: number | null = null;
  let firstName = data.first_name.trim().slice(0, 80);
  let lastName = (data.last_name || '').trim().slice(0, 80);

  if (data.member_user_id != null) {
    // Link to an existing trip member (guest or real account).
    const member = db.prepare(`
      SELECT u.id, COALESCE(u.display_name, u.username) AS name FROM users u
      WHERE u.id = ? AND (
        EXISTS (SELECT 1 FROM trip_members m WHERE m.trip_id = ? AND m.user_id = u.id)
        OR EXISTS (SELECT 1 FROM trips t WHERE t.id = ? AND t.user_id = u.id)
      )
    `).get(data.member_user_id, tripId, tripId) as { id: number; name: string } | undefined;
    if (!member) return { error: 'Member not found in this trip' } as const;
    memberUserId = member.id;
    const parts = member.name.trim().split(/\s+/);
    firstName = firstName || parts[0] || member.name;
    lastName = lastName || parts.slice(1).join(' ');
  } else if (data.create_guest) {
    // "Single temp user across the trip": creating the tab creates the guest,
    // who is then assignable in every split like any member (#1362).
    const { member } = createGuest(tripId, `${firstName} ${lastName}`.trim(), ownerUserId);
    memberUserId = member.id;
  }

  if (memberUserId != null) {
    const existing = db.prepare('SELECT id FROM expense_tabs WHERE trip_id = ? AND member_user_id = ?').get(tripId, memberUserId);
    if (existing) return { error: 'This member already has a tab' } as const;
  }

  // One-use, non-expiring registration invite bound to this trip: the visitor
  // can create an account from the tab page and land in the trip. Scoped
  // deliberately — a budget_edit member can only ever invite into THIS trip.
  const joinToken = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO invite_tokens (token, max_uses, expires_at, created_by, trip_id) VALUES (?, 1, NULL, ?, ?)').run(joinToken, ownerUserId, tripId);
  const result = db.prepare(
    'INSERT INTO expense_tabs (trip_id, owner_user_id, token, first_name, last_name, join_token, currency, member_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(tripId, ownerUserId, newToken(), firstName, lastName, joinToken, data.currency || null, memberUserId);
  const tab = db.prepare('SELECT * FROM expense_tabs WHERE id = ?').get(result.lastInsertRowid) as ExpenseTab;
  return { ...tab, ...tabTotals(tab.id), items: [], payments: [], member: memberInfo(memberUserId) };
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
  // Linked tabs mirror the live ledger — bills are shared with the member by
  // assigning them in the expense split, never by frozen manual charges.
  if (tab.member_user_id != null) return { error: 'This tab follows the trip ledger — assign the member in the expense split instead' };
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

/** Read the payment-method settings a user chose to surface publicly. */
function paymentMethodsOf(userId: number): Record<string, string> {
  const settings = getUserSettings(userId) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of PAYMENT_SETTING_KEYS) {
    const v = settings[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, 300);
  }
  return out;
}

/**
 * The member's LIVE position in the group ledger (linked tabs): every group
 * bill they're on with their share, the netted "who they owe now" flows (each
 * creditor's payment methods attached), and the settle-ups they've already
 * made. All amounts are in the trip's own currency — the same maths the Costs
 * settlement screen shows members.
 */
export function memberLivePosition(
  tripId: string | number,
  memberUserId: number,
  opts: { rates?: Record<string, number> | null; tripCurrency?: string } = {},
) {
  const tripCurrency = (opts.tripCurrency || 'EUR').toUpperCase();
  const settlement = calculateSettlement(tripId, { base: tripCurrency, rates: opts.rates ?? null, tripCurrency });

  // Per-bill share list. Mirrors the settlement's member-share rule: an explicit
  // custom amount when one is set on the item, else an equal split of the total.
  const rows = db.prepare(`
    SELECT bi.id, bi.name, bi.expense_date, bi.total_price, bi.currency, bi.created_at, bm.amount AS member_amount
    FROM budget_items bi
    JOIN budget_item_members bm ON bm.budget_item_id = bi.id AND bm.user_id = ?
    WHERE bi.trip_id = ? AND bi.is_private = 0
    ORDER BY COALESCE(bi.expense_date, substr(bi.created_at, 1, 10)) DESC, bi.id DESC
  `).all(memberUserId, tripId) as { id: number; name: string; expense_date: string | null; total_price: number; currency: string | null; created_at: string; member_amount: number | null }[];

  const charges = rows.map(r => {
    let share = r.member_amount;
    if (share == null) {
      const members = db.prepare('SELECT user_id, amount FROM budget_item_members WHERE budget_item_id = ?').all(r.id) as { user_id: number; amount: number | null }[];
      const hasCustom = members.some(m => m.amount !== null && m.amount !== undefined);
      share = hasCustom ? 0 : (splitEqualShares(r.total_price, members, r.id)[memberUserId] || 0);
    }
    return {
      id: r.id,
      label: r.name,
      total: r.total_price,
      share: Math.round(share * 100) / 100,
      currency: r.currency,
      expense_date: r.expense_date,
      created_at: r.created_at,
    };
  }).filter(c => c.share > 0);

  const owed = settlement.flows
    .filter(f => f.from.user_id === memberUserId)
    .map(f => ({
      user_id: f.to.user_id,
      name: f.to.username,
      amount: f.amount,
      payment_methods: paymentMethodsOf(f.to.user_id),
    }));

  const payments = listSettlements(tripId)
    .filter(s => s.from_user_id === memberUserId)
    .map(s => ({ id: s.id, to_name: s.to_username, amount: s.amount, currency: s.currency, created_at: s.created_at }));

  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    currency: tripCurrency,
    charges,
    owed,
    payments,
    balance: r2(owed.reduce((a, o) => a + o.amount, 0)),
    charged: r2(charges.reduce((a, c) => a + c.share, 0)),
    paid: r2(payments.reduce((a, p) => a + p.amount, 0)),
  };
}

/** The full public read model — everything the hosted repayment page renders. */
export async function getPublicTab(token: string) {
  const tab = getActiveTabByToken(token);
  if (!tab) return null;
  const owner = db.prepare('SELECT id, COALESCE(display_name, username) AS name FROM users WHERE id = ?').get(tab.owner_user_id) as { id: number; name: string } | undefined;
  const trip = db.prepare('SELECT title, currency FROM trips WHERE id = ?').get(tab.trip_id) as { title: string; currency: string } | undefined;
  const payment_methods = paymentMethodsOf(tab.owner_user_id);

  // Linked tab → live ledger position (converted with live FX when available;
  // a rate outage degrades to frozen/identity rates, never a failure).
  let live: ReturnType<typeof memberLivePosition> | null = null;
  if (tab.member_user_id != null) {
    const tripCurrency = (tab.currency || trip?.currency || 'AUD').toUpperCase();
    let rates: Record<string, number> | null = null;
    try {
      const { getRates } = await import('./exchangeRateService');
      rates = await getRates(tripCurrency);
    } catch { /* offline/unconfigured FX — settlement maths falls back gracefully */ }
    live = memberLivePosition(tab.trip_id, tab.member_user_id, { rates, tripCurrency });
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
    // Present only on member-linked tabs: the live group-ledger position.
    live,
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
  if (tab.member_user_id != null) {
    // Linked tab: export the live ledger position (share per bill, settle-ups).
    const trip = db.prepare('SELECT currency FROM trips WHERE id = ?').get(tab.trip_id) as { currency?: string | null } | undefined;
    const tripCurrency = (tab.currency || trip?.currency || 'AUD').toUpperCase();
    const live = memberLivePosition(tab.trip_id, tab.member_user_id, { tripCurrency });
    for (const c of live.charges) {
      rows.push([esc(c.expense_date || (c.created_at || '').slice(0, 10)), 'Charge', esc(c.label), c.share.toFixed(2), esc(c.currency || tripCurrency)].join(','));
    }
    for (const p of live.payments) {
      rows.push([esc((p.created_at || '').slice(0, 10)), 'Payment', esc(`Paid ${p.to_name}`), (-p.amount).toFixed(2), esc(p.currency || tripCurrency)].join(','));
    }
    rows.push(['', 'Balance', esc(`${tab.first_name} ${tab.last_name}`.trim()), live.balance.toFixed(2), esc(tripCurrency)].join(','));
  } else {
    for (const i of listTabItems(tab.id)) {
      rows.push([esc(i.expense_date || (i.created_at || '').slice(0, 10)), 'Charge', esc(i.label), i.amount.toFixed(2), esc(i.currency || tab.currency || '')].join(','));
    }
    for (const p of listTabPayments(tab.id)) {
      rows.push([esc((p.created_at || '').slice(0, 10)), 'Payment', esc(p.note || 'Payment received'), (-p.amount).toFixed(2), esc(tab.currency || '')].join(','));
    }
    const { balance } = tabTotals(tab.id);
    rows.push(['', 'Balance', esc(`${tab.first_name} ${tab.last_name}`.trim()), balance.toFixed(2), esc(tab.currency || '')].join(','));
  }
  const name = `${tab.first_name}-${tab.last_name}`.trim().replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'tab';
  return { filename: `expense-tab-${name}.csv`, csv: rows.join('\r\n') + '\r\n' };
}
