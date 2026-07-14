import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock everything the service reaches into so each branch is drivable.
const { resolveLlmConfig, extract, extractText, createFile } = vi.hoisted(() => ({
  resolveLlmConfig: vi.fn(),
  extract: vi.fn(),
  extractText: vi.fn(),
  createFile: vi.fn((tripId: unknown, file: { filename: string }) => ({ id: 42, filename: file.filename })),
}));
vi.mock('../../../src/nest/llm-parse/llm-config.resolver', () => ({ resolveLlmConfig }));
vi.mock('../../../src/nest/llm-parse/llm-client.factory', () => ({ createLlmClient: () => ({ extract }) }));
vi.mock('../../../src/nest/llm-parse/text-extract', () => ({ extractText }));
vi.mock('../../../src/services/fileService', () => ({ createFile, filesDir: '/tmp/receipt-scan-test-files' }));

import { ReceiptScanService, ReceiptScanUnavailableError } from '../../../src/nest/budget/receipt-scan.service';

const png = { originalname: 'receipt.png', mimetype: 'image/png', buffer: Buffer.from('png') };
const pdf = { originalname: 'invoice.pdf', mimetype: 'application/pdf', buffer: Buffer.from('pdf') };
const cloud = { provider: 'openai', model: 'gpt-test', baseUrl: 'http://x', apiKey: 'k', multimodal: true };

function svc() { return new ReceiptScanService(); }

beforeEach(() => {
  vi.clearAllMocks();
  resolveLlmConfig.mockReturnValue(cloud);
  extract.mockResolvedValue([{ merchant: 'Cafe X', date: '2026-07-01', currency: 'aud', total: 30, items: [{ name: 'Coffee', price: 10 }, { name: 'Cake', price: 20, quantity: 2 }] }]);
});

describe('ReceiptScanService', () => {
  it('aiAvailable reflects the resolved config', () => {
    expect(svc().aiAvailable(1)).toBe(true);
    resolveLlmConfig.mockReturnValue(null);
    expect(svc().aiAvailable(1)).toBe(false);
  });

  it('storeReceiptFile writes a private trip file (extension fallback for nameless uploads)', () => {
    const stored = svc().storeReceiptFile('5', 1, { originalname: '', mimetype: 'image/jpeg', buffer: Buffer.from('x') });
    expect(stored.id).toBe(42);
    expect(createFile).toHaveBeenCalledWith('5', expect.objectContaining({ filename: expect.stringMatching(/\.jpg$/) }), 1, { description: 'Receipt', is_private: true });
  });

  it('throws unavailable when no AI is configured', async () => {
    resolveLlmConfig.mockReturnValue(null);
    await expect(svc().parseReceipt(1, png)).rejects.toBeInstanceOf(ReceiptScanUnavailableError);
  });

  it('throws unavailable for a photo on a text-only local model', async () => {
    resolveLlmConfig.mockReturnValue({ provider: 'local', model: 'm', multimodal: false });
    await expect(svc().parseReceipt(1, png)).rejects.toThrow(/text-only/);
  });

  it('sends images as native bytes and normalizes the parsed receipt', async () => {
    const { receipt, warnings } = await svc().parseReceipt(1, png);
    expect(extract).toHaveBeenCalledWith(expect.objectContaining({ resultKey: 'receipts', file: { mimeType: 'image/png', data: png.buffer } }));
    expect(receipt.merchant).toBe('Cafe X');
    expect(receipt.date).toBe('2026-07-01');
    expect(receipt.currency).toBe('AUD');
    expect(receipt.total).toBe(30);
    expect(receipt.items).toEqual([{ name: 'Coffee', price: 10 }, { name: 'Cake', price: 20, quantity: 2 }]);
    expect(warnings).toEqual([]);
  });

  it('sends PDFs natively on Anthropic, as extracted text elsewhere', async () => {
    resolveLlmConfig.mockReturnValue({ ...cloud, provider: 'anthropic' });
    await svc().parseReceipt(1, pdf);
    expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: { mimeType: 'application/pdf', data: pdf.buffer } }));

    resolveLlmConfig.mockReturnValue(cloud);
    extractText.mockResolvedValue('INVOICE\nCoffee 10');
    await svc().parseReceipt(1, pdf);
    expect(extract).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'INVOICE\nCoffee 10' }));
  });

  it('throws unavailable for a PDF with no text layer on a non-vision path', async () => {
    extractText.mockResolvedValue('   ');
    await expect(svc().parseReceipt(1, pdf)).rejects.toThrow(/no readable text layer/);
  });

  it('warns when no line items are recognized and survives junk output', async () => {
    extract.mockResolvedValue([{ merchant: '  ', date: 'yesterday', currency: 'dollars', total: -5, items: [null, { name: '', price: 3 }, { name: 'Ok', price: 'NaN' }, { name: 'Fee', price: 2.005, quantity: 1 }] }]);
    const { receipt, warnings } = await svc().parseReceipt(1, png);
    expect(receipt).toMatchObject({ merchant: null, date: null, currency: null, total: null });
    // Only the valid line survives; quantity 1 is not echoed; price is rounded.
    expect(receipt.items).toEqual([{ name: 'Fee', price: 2.01 }]);
    expect(warnings).toEqual([]);

    extract.mockResolvedValue([]);
    const empty = await svc().parseReceipt(1, png);
    expect(empty.receipt.items).toEqual([]);
    expect(empty.warnings.length).toBe(1);

    extract.mockResolvedValue('not-an-array' as never);
    const junk = await svc().parseReceipt(1, png);
    expect(junk.receipt.items).toEqual([]);
  });
});
