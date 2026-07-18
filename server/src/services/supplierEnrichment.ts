import { db } from '../db/database';
import { getMapsKey, searchPlaces } from './mapsService';
import { resolveLlmConfig } from '../nest/llm-parse/llm-config.resolver';
import { createLlmClient } from '../nest/llm-parse/llm-client.factory';
import type { LlmExtractionInput } from '../nest/llm-parse/llm-provider.interface';
import { applyEnrichment, ensureSupplier, getSupplier, supplierNameKey, type SupplierRow } from './supplierService';
import { createPlace } from './placeService';
import { logInfo } from './auditLog';

/**
 * Supplier enrichment (custom): after a scan (or on demand) the vendor row is
 * filled out from three sources, in trust order —
 *   1. the receipt itself (printed address/phone/website are authoritative),
 *   2. Google Places text search (coords, formatted address, category, links),
 *   3. the instance AI (a two-line human summary + category guess).
 * Everything is gap-fill only (applyEnrichment): a human edit always wins,
 * and every stage degrades silently when its key/provider is missing.
 */

export interface SupplierEnrichHints {
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  itemNames?: string[];
  locationBias?: { lat: number; lng: number } | null;
}

/** Clean a Google place type into a human category ("hardware_store" → "Hardware store"). */
function humanizeType(types: unknown): string | null {
  if (!Array.isArray(types)) return null;
  const skip = new Set(['point_of_interest', 'establishment', 'store', 'food']);
  const t = (types as unknown[]).find((x): x is string => typeof x === 'string' && !skip.has(x));
  if (!t) return null;
  const words = t.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Stage 1+2: receipt facts, then Google Places. Returns whether coords are now known. */
export async function enrichSupplierFromPlaces(supplierId: number, userId: number, hints: SupplierEnrichHints = {}): Promise<{ lat: number; lng: number } | null> {
  const row = getSupplier(supplierId);
  if (!row) return null;

  // The docket's own contact block first — it is the business speaking.
  applyEnrichment(supplierId, {
    address: hints.address ?? undefined,
    phone: hints.phone ?? undefined,
    website: hints.website ?? undefined,
  });

  try {
    if (!getMapsKey(userId)) {
      // Nominatim fallback still resolves an address+coords for the venue pin.
      const q = [row.name, hints.address].filter(Boolean).join(', ');
      const { places } = await searchPlaces(userId, q, undefined, hints.locationBias ?? undefined);
      const first = places[0] as Record<string, unknown> | undefined;
      if (first) {
        const loc = first.location as { latitude?: number; longitude?: number } | undefined;
        applyEnrichment(supplierId, {
          address: typeof first.formattedAddress === 'string' ? first.formattedAddress : undefined,
          lat: loc?.latitude, lng: loc?.longitude,
        });
      }
    } else {
      const q = [row.name, hints.address].filter(Boolean).join(', ');
      const { places } = await searchPlaces(userId, q, undefined, hints.locationBias ?? undefined);
      // Only trust a hit whose name actually resembles the supplier — a text
      // search always returns SOMETHING, and a wrong pin is worse than none.
      const key = supplierNameKey(row.name);
      const match = (places as Record<string, unknown>[]).find(p => {
        const dn = (p.displayName as { text?: string } | undefined)?.text ?? '';
        const k = supplierNameKey(String(dn));
        return !!k && (k.includes(key) || key.includes(k));
      });
      if (match) {
        const loc = match.location as { latitude?: number; longitude?: number } | undefined;
        applyEnrichment(supplierId, {
          address: typeof match.formattedAddress === 'string' ? match.formattedAddress : undefined,
          phone: typeof match.nationalPhoneNumber === 'string' ? match.nationalPhoneNumber : undefined,
          website: typeof match.websiteUri === 'string' ? match.websiteUri : undefined,
          google_place_id: typeof match.id === 'string' ? match.id : undefined,
          category: humanizeType(match.types) ?? undefined,
          lat: loc?.latitude, lng: loc?.longitude,
        });
      }
    }
  } catch (e) {
    logInfo(`Supplier enrichment (places) failed for #${supplierId}: ${e instanceof Error ? e.message : e}`);
  }

  const after = getSupplier(supplierId);
  return after?.lat != null && after?.lng != null ? { lat: after.lat, lng: after.lng } : null;
}

export interface AutoSupplierResult {
  supplier: SupplierRow & { created: boolean };
  place: { id: number; name: string; created: boolean } | null;
}

/**
 * The scan hook: a parsed receipt's merchant becomes (or matches) a supplier,
 * gets enriched from the docket + Google Places, and — when we know where the
 * business is — lands on the event map as an auto-created venue. Existing
 * venues are reused: first by supplier link, then by matching name.
 */
export async function autoSupplierAndVenue(
  tripId: string | number,
  userId: number,
  receipt: { merchant?: string | null; merchant_address?: string | null; merchant_phone?: string | null; merchant_website?: string | null; items?: { name: string }[] },
): Promise<AutoSupplierResult | null> {
  if (!receipt.merchant?.trim()) return null;
  const { supplier, created } = ensureSupplier(receipt.merchant, { source: 'receipt', createdBy: userId });

  // Bias the Places lookup toward where the event already lives on the map.
  const bias = db.prepare(
    'SELECT AVG(lat) AS lat, AVG(lng) AS lng FROM places WHERE trip_id = ? AND lat IS NOT NULL AND lng IS NOT NULL'
  ).get(tripId) as { lat: number | null; lng: number | null };

  const coords = await enrichSupplierFromPlaces(supplier.id, userId, {
    address: receipt.merchant_address,
    phone: receipt.merchant_phone,
    website: receipt.merchant_website,
    itemNames: receipt.items?.map(i => i.name),
    locationBias: bias.lat != null && bias.lng != null ? { lat: bias.lat, lng: bias.lng } : null,
  });
  // The CRM note can arrive after the scan response — don't hold the docket up.
  void enrichSupplierWithAi(supplier.id, userId, {
    address: receipt.merchant_address, website: receipt.merchant_website,
    itemNames: receipt.items?.map(i => i.name),
  });

  const fresh = getSupplier(supplier.id)!;
  const key = supplierNameKey(fresh.name);
  // Reuse an existing venue: supplier link first, then name identity.
  const tripPlaces = db.prepare('SELECT id, name, supplier_id FROM places WHERE trip_id = ?').all(tripId) as { id: number; name: string; supplier_id: number | null }[];
  const existing = tripPlaces.find(p => p.supplier_id === fresh.id) ?? tripPlaces.find(p => supplierNameKey(p.name) === key);
  if (existing) {
    if (existing.supplier_id !== fresh.id) {
      db.prepare('UPDATE places SET supplier_id = ? WHERE id = ?').run(fresh.id, existing.id);
    }
    return { supplier: { ...fresh, created }, place: { id: existing.id, name: existing.name, created: false } };
  }
  if (!coords) return { supplier: { ...fresh, created }, place: null };

  const place = createPlace(String(tripId), {
    name: fresh.name,
    lat: coords.lat,
    lng: coords.lng,
    address: fresh.address ?? receipt.merchant_address ?? undefined,
    phone: fresh.phone ?? receipt.merchant_phone ?? undefined,
    website: fresh.website ?? receipt.merchant_website ?? undefined,
    google_place_id: fresh.google_place_id ?? undefined,
    notes: 'Auto-created from a receipt scan',
    supplier_id: fresh.id,
  }, userId) as { id: number; name: string };
  return { supplier: { ...fresh, created }, place: { id: place.id, name: place.name, created: true } };
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summaries: {
      type: 'array',
      description: 'Exactly one entry.',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Two factual sentences on what this business is and what the crew used it for' },
          category: { type: 'string', description: 'Short supplier category, e.g. "Catering", "AV hire", "Hardware", "Fuel"' },
        },
        required: ['summary'],
      },
    },
  },
  required: ['summaries'],
};

/** Stage 3: the instance AI writes the two-line CRM note. Silent no-op without a provider. */
export async function enrichSupplierWithAi(supplierId: number, userId: number, hints: SupplierEnrichHints = {}): Promise<void> {
  const row = getSupplier(supplierId);
  if (!row || row.ai_summary) return;
  const config = resolveLlmConfig(userId);
  if (!config) return;
  try {
    const facts = [
      `Business name: ${row.name}`,
      row.category ? `Category: ${row.category}` : null,
      row.address || hints.address ? `Address: ${row.address || hints.address}` : null,
      row.website || hints.website ? `Website: ${row.website || hints.website}` : null,
      hints.itemNames?.length ? `Items on a recent receipt: ${hints.itemNames.slice(0, 12).join(', ')}` : null,
    ].filter(Boolean).join('\n');
    const client = createLlmClient(config);
    const raw = await client.extract({
      prompt: 'You write terse, factual CRM notes for an event production company\'s supplier book. No marketing fluff, no guesses presented as facts.',
      userText: `Write the summary for this supplier based only on these facts:\n${facts}\n\nRespond as { "summaries": [ { "summary", "category" } ] }.`,
      jsonSchema: SUMMARY_SCHEMA,
      resultKey: 'summaries',
      model: config.model,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    } as LlmExtractionInput);
    const first = (Array.isArray(raw) ? raw[0] : undefined) as { summary?: unknown; category?: unknown } | undefined;
    if (first && typeof first.summary === 'string' && first.summary.trim()) {
      applyEnrichment(supplierId, {
        ai_summary: first.summary.trim().slice(0, 1000),
        category: typeof first.category === 'string' && first.category.trim() ? first.category.trim().slice(0, 60) : undefined,
      });
    }
  } catch (e) {
    logInfo(`Supplier enrichment (AI) failed for #${supplierId}: ${e instanceof Error ? e.message : e}`);
  }
}
