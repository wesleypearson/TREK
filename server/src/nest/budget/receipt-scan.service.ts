import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { resolveLlmConfig } from '../llm-parse/llm-config.resolver';
import { createLlmClient } from '../llm-parse/llm-client.factory';
import type { LlmExtractionInput } from '../llm-parse/llm-provider.interface';
import { extractText } from '../llm-parse/text-extract';
import { createFile, filesDir } from '../../services/fileService';

/**
 * Receipt / tax-invoice scanning (custom): a photographed or uploaded receipt
 * is stored as a PRIVATE trip file (the uploader's own), then handed to the
 * instance's configured AI (the same LLM plumbing booking import uses) which
 * returns the merchant, date, currency, total and individual line items —
 * ready for the per-line split editor.
 *
 * Vision path: images (and PDFs on Anthropic) go to the model as native bytes;
 * text-layer PDFs are pre-extracted like booking import. A text-only local
 * model cannot read a photo — the caller gets a clear error and the user can
 * still type the lines in manually.
 */

export interface ParsedReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ParsedReceipt {
  merchant?: string | null;
  date?: string | null;
  currency?: string | null;
  total?: number | null;
  items: ParsedReceiptItem[];
}

const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    receipts: {
      type: 'array',
      description: 'Exactly one entry: the parsed receipt.',
      items: {
      type: 'object',
      properties: {
        merchant: { type: 'string', description: 'Store / vendor name' },
        date: { type: 'string', description: 'Purchase date as YYYY-MM-DD' },
        currency: { type: 'string', description: 'ISO 4217 currency code, e.g. AUD' },
        total: { type: 'number', description: 'Grand total actually charged, after tax and discounts' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Line item description, cleaned up' },
              price: { type: 'number', description: 'Line total for this item (unit price × quantity), after any line discount' },
              quantity: { type: 'number', description: 'Quantity if printed, else 1' },
            },
            required: ['name', 'price'],
          },
        },
      },
      required: ['items'],
      },
    },
  },
  required: ['receipts'],
};

const RECEIPT_PROMPT = [
  'You are a precise receipt and tax-invoice parser for a travel expense splitter.',
  'Extract the merchant, purchase date (YYYY-MM-DD), ISO 4217 currency code, the grand total actually charged, and every purchasable line item.',
  'Rules:',
  '- Each item price is the LINE total (unit price × quantity) after any line-level discount, as printed.',
  '- Skip subtotals, tax lines, tips, change, card/payment rows and loyalty points — but keep delivery/service fees as items since someone has to pay them.',
  '- If tax (GST/VAT) is charged on top of the items rather than included, add it as a final line item named "Tax".',
  '- Keep item names short and human (e.g. "Flat white x2", not SKU codes).',
  '- Amounts are plain numbers in the receipt currency, no symbols.',
  '- If a value is unreadable, omit the field rather than guessing.',
  'Respond with { "receipts": [ { ... } ] } — an array with exactly one entry — matching the provided schema exactly.',
].join('\n');

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

@Injectable()
export class ReceiptScanService {
  /** Whether the acting user has any AI configured (admin instance or personal). */
  aiAvailable(userId: number): boolean {
    return resolveLlmConfig(userId) != null;
  }

  /** Store the receipt bytes as a PRIVATE trip file owned by the uploader. */
  storeReceiptFile(tripId: string, userId: number, upload: { originalname: string; mimetype: string; buffer: Buffer }) {
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
    const filename = `${uuidv4()}${path.extname(upload.originalname || '') || '.jpg'}`;
    fs.writeFileSync(path.join(filesDir, filename), upload.buffer);
    return createFile(
      tripId,
      { filename, originalname: upload.originalname || filename, size: upload.buffer.length, mimetype: upload.mimetype },
      userId,
      { description: 'Receipt', is_private: true },
    );
  }

  /**
   * Run the configured AI over the receipt. Throws with a human-readable
   * message when no capable provider is configured; the endpoint maps that to
   * a 409 so the client can fall back to manual entry.
   */
  async parseReceipt(userId: number, upload: { originalname: string; mimetype: string; buffer: Buffer }): Promise<{ receipt: ParsedReceipt; warnings: string[] }> {
    const config = resolveLlmConfig(userId);
    if (!config) {
      throw new ReceiptScanUnavailableError('AI parsing is not configured. Add an AI provider in Settings → Integrations, or enter the lines manually.');
    }

    const warnings: string[] = [];
    const isImage = IMAGE_MIMES.has(upload.mimetype) || upload.mimetype.startsWith('image/');
    const input = {
      prompt: RECEIPT_PROMPT,
      jsonSchema: RECEIPT_JSON_SCHEMA,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      resultKey: 'receipts',
      userText: 'Extract this receipt / tax invoice as structured JSON.',
    } as LlmExtractionInput;

    if (isImage) {
      // Photos need a vision-capable model; text extraction can't read pixels.
      if (config.provider === 'local' && !config.multimodal) {
        throw new ReceiptScanUnavailableError('The configured local AI model is text-only and cannot read a photo. Enable a vision-capable model, or enter the lines manually.');
      }
      input.file = { mimeType: upload.mimetype, data: upload.buffer };
    } else if (config.provider === 'anthropic' && upload.mimetype === 'application/pdf') {
      // Anthropic ingests PDFs natively — best fidelity for scanned invoices.
      input.file = { mimeType: upload.mimetype, data: upload.buffer };
    } else {
      const text = (await extractText(upload.buffer, upload.originalname || 'receipt.pdf')).trim();
      if (!text) {
        throw new ReceiptScanUnavailableError('This document has no readable text layer (a scanned PDF needs a vision-capable AI provider). Enter the lines manually.');
      }
      input.text = text.slice(0, 8000);
    }

    const client = createLlmClient(config);
    // resultKey 'receipts' → the clients return the array; entry 0 is the receipt.
    const raw = await client.extract(input);
    const receiptNode = (Array.isArray(raw) ? raw[0] : undefined) as Record<string, unknown> | undefined;
    const receipt = normalizeReceipt(receiptNode);
    if (receipt.items.length === 0) {
      warnings.push('No line items were recognized — you can still add them manually.');
    }
    return { receipt, warnings };
  }
}

export class ReceiptScanUnavailableError extends Error {}

/** Defensive normalization — the model output is untrusted. */
function normalizeReceipt(node: Record<string, unknown> | undefined): ParsedReceipt {
  const out: ParsedReceipt = { merchant: null, date: null, currency: null, total: null, items: [] };
  if (!node || typeof node !== 'object') return out;
  if (typeof node.merchant === 'string' && node.merchant.trim()) out.merchant = node.merchant.trim().slice(0, 120);
  if (typeof node.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(node.date)) out.date = node.date.slice(0, 10);
  if (typeof node.currency === 'string' && /^[A-Za-z]{3}$/.test(node.currency.trim())) out.currency = node.currency.trim().toUpperCase();
  const total = Number(node.total);
  if (Number.isFinite(total) && total > 0) out.total = Math.round(total * 100) / 100;
  const items = Array.isArray(node.items) ? node.items : [];
  for (const it of items.slice(0, 100)) {
    if (!it || typeof it !== 'object') continue;
    const rec = it as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim().slice(0, 200) : '';
    const price = Number(rec.price);
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    const quantity = Number(rec.quantity);
    out.items.push({
      name,
      price: Math.round(price * 100) / 100,
      ...(Number.isFinite(quantity) && quantity > 1 ? { quantity: Math.round(quantity) } : {}),
    });
  }
  return out;
}
