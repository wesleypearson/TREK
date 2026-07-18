import { db } from '../db/database';
import { ValidationError } from './tripService';

/**
 * Suppliers (custom): the instance-wide vendor book behind the CRM. Every
 * business the crew touches — a caterer on one event, an AV hire on another —
 * gets exactly one row here, so spend and interactions aggregate across
 * events instead of fragmenting per trip. Rows are auto-created by receipt
 * scans (merchant extraction), enriched from Google Places + the configured
 * AI, and always hand-editable.
 */

export interface SupplierRow {
  id: number;
  name: string;
  name_key: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  ai_summary: string | null;
  notes: string | null;
  source: string;
  enriched_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Lowercase, strip accents/punctuation, squash whitespace — the dedupe handle. */
export function supplierNameKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const EDITABLE_FIELDS = ['name', 'category', 'phone', 'email', 'website', 'address', 'notes'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export function getSupplier(id: number): SupplierRow | undefined {
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as SupplierRow | undefined;
}

export function findSupplierByName(name: string): SupplierRow | undefined {
  const key = supplierNameKey(name);
  if (!key) return undefined;
  return db.prepare('SELECT * FROM suppliers WHERE name_key = ?').get(key) as SupplierRow | undefined;
}

/**
 * Find-or-create by normalized name. The scan pipeline calls this for every
 * parsed merchant, so an existing row is the common case and stays untouched
 * (enrichment never overwrites what a human or an earlier run wrote).
 */
export function ensureSupplier(name: string, opts: { source: string; createdBy: number | null }): { supplier: SupplierRow; created: boolean } {
  const clean = (name || '').trim().slice(0, 120);
  if (!clean) throw new ValidationError('Supplier name is required');
  const existing = findSupplierByName(clean);
  if (existing) return { supplier: existing, created: false };
  const key = supplierNameKey(clean);
  if (!key) throw new ValidationError('Supplier name is required');
  try {
    const res = db.prepare(
      'INSERT INTO suppliers (name, name_key, source, created_by) VALUES (?, ?, ?, ?)'
    ).run(clean, key, opts.source, opts.createdBy);
    return { supplier: getSupplier(Number(res.lastInsertRowid))!, created: true };
  } catch (e: unknown) {
    // Concurrent scans of the same merchant: lose the race gracefully.
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      const row = findSupplierByName(clean);
      if (row) return { supplier: row, created: false };
    }
    throw e;
  }
}

export function createSupplier(fields: Partial<Record<EditableField, unknown>>, createdBy: number): SupplierRow {
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  if (!name) throw new ValidationError('Supplier name is required');
  if (findSupplierByName(name)) throw new ValidationError('A supplier with this name already exists');
  const { supplier } = ensureSupplier(name, { source: 'manual', createdBy });
  const rest = { ...fields } as Record<string, unknown>;
  delete rest.name;
  if (Object.keys(rest).length) updateSupplier(supplier.id, rest);
  return getSupplier(supplier.id)!;
}

export function updateSupplier(id: number, fields: Record<string, unknown>): SupplierRow {
  const row = getSupplier(id);
  if (!row) throw new ValidationError('Supplier not found');
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const f of EDITABLE_FIELDS) {
    if (!(f in fields)) continue;
    const v = fields[f];
    if (f === 'name') {
      const name = typeof v === 'string' ? v.trim().slice(0, 120) : '';
      if (!name) throw new ValidationError('Supplier name is required');
      const dupe = findSupplierByName(name);
      if (dupe && dupe.id !== id) throw new ValidationError('A supplier with this name already exists');
      sets.push('name = ?', 'name_key = ?');
      args.push(name, supplierNameKey(name));
    } else {
      sets.push(`${f} = ?`);
      args.push(v == null || v === '' ? null : String(v).slice(0, f === 'notes' ? 4000 : 300));
    }
  }
  if (!sets.length) return row;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`).run(...args, id);
  return getSupplier(id)!;
}

export function deleteSupplier(id: number): boolean {
  // Links release via ON DELETE SET NULL — history stays, the book entry goes.
  return db.prepare('DELETE FROM suppliers WHERE id = ?').run(id).changes > 0;
}

/** Enrichment writes: only fills gaps, never clobbers human edits. */
export function applyEnrichment(id: number, data: Partial<Pick<SupplierRow, 'category' | 'phone' | 'website' | 'address' | 'lat' | 'lng' | 'google_place_id' | 'ai_summary'>>): void {
  const row = getSupplier(id);
  if (!row) return;
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === '') continue;
    if ((row as unknown as Record<string, unknown>)[k]) continue; // gap-fill only
    sets.push(`${k} = ?`);
    args.push(v);
  }
  sets.push("enriched_at = datetime('now')", "updated_at = datetime('now')");
  db.prepare(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`).run(...args, id);
}

export interface SupplierListEntry extends SupplierRow {
  expense_count: number;
  venue_count: number;
  event_count: number;
  last_interaction: string | null;
}

/** The CRM list: every supplier with cross-event interaction aggregates. */
export function listSuppliers(query?: string): SupplierListEntry[] {
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM budget_items b WHERE b.supplier_id = s.id) AS expense_count,
      (SELECT COUNT(*) FROM places p WHERE p.supplier_id = s.id) AS venue_count,
      (SELECT COUNT(DISTINCT b.trip_id) FROM budget_items b WHERE b.supplier_id = s.id) AS event_count,
      (SELECT MAX(b.created_at) FROM budget_items b WHERE b.supplier_id = s.id) AS last_interaction
    FROM suppliers s
    ORDER BY (last_interaction IS NULL), last_interaction DESC, s.name COLLATE NOCASE
  `).all() as SupplierListEntry[];
  if (!query?.trim()) return rows;
  const q = supplierNameKey(query);
  return rows.filter(r =>
    r.name_key.includes(q)
    || (r.category || '').toLowerCase().includes(query.toLowerCase())
    || (r.address || '').toLowerCase().includes(query.toLowerCase()));
}

export interface SupplierDetail extends SupplierListEntry {
  expenses: { id: number; trip_id: number; trip_title: string; name: string; total_price: number; currency: string | null; expense_date: string | null; created_at: string; receipt_file_id: number | null }[];
  venues: { id: number; trip_id: number; trip_title: string; name: string }[];
  spendByEvent: { trip_id: number; trip_title: string; currency: string | null; total: number; count: number }[];
}

/** One supplier with its full interaction history across every event. */
export function supplierDetail(id: number): SupplierDetail | undefined {
  const base = listSuppliers().find(s => s.id === id);
  if (!base) return undefined;
  const expenses = db.prepare(`
    SELECT b.id, b.trip_id, t.title AS trip_title, b.name, b.total_price,
           COALESCE(b.currency, t.currency) AS currency,
           b.expense_date, b.created_at, b.receipt_file_id
    FROM budget_items b JOIN trips t ON t.id = b.trip_id
    WHERE b.supplier_id = ?
    ORDER BY COALESCE(b.expense_date, b.created_at) DESC
    LIMIT 200
  `).all(id) as SupplierDetail['expenses'];
  const venues = db.prepare(`
    SELECT p.id, p.trip_id, t.title AS trip_title, p.name
    FROM places p JOIN trips t ON t.id = p.trip_id
    WHERE p.supplier_id = ?
    ORDER BY p.id DESC
  `).all(id) as SupplierDetail['venues'];
  const spendByEvent = db.prepare(`
    SELECT b.trip_id, t.title AS trip_title, t.currency AS currency,
           SUM(b.total_price * COALESCE(b.exchange_rate, 1)) AS total, COUNT(*) AS count
    FROM budget_items b JOIN trips t ON t.id = b.trip_id
    WHERE b.supplier_id = ?
    GROUP BY b.trip_id
    ORDER BY MAX(COALESCE(b.expense_date, b.created_at)) DESC
  `).all(id) as SupplierDetail['spendByEvent'];
  return { ...base, expenses, venues, spendByEvent };
}
