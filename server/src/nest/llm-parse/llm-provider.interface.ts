/** A single binary file (e.g. a PDF) sent natively to a multimodal provider. */
export interface LlmExtractionFile {
  mimeType: string;
  data: Buffer;
}

/** Everything a provider client needs to extract reservations from one document. */
export interface LlmExtractionInput {
  /** System instructions enumerating the schema.org shape (see llm-prompt.ts). */
  prompt: string;
  /** JSON Schema describing `{ reservations: KiReservation[] }`. */
  jsonSchema: object;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  /** Pre-extracted text (text-like files, or text-only-model mode). */
  text?: string;
  /** Native binary (PDF or image) for multimodal providers. */
  file?: LlmExtractionFile;
  /**
   * Additional pages of the SAME document (multi-photo receipt scans). Sent
   * after `file` in order. Images only — providers that can't take extra
   * binary parts ignore what they can't carry.
   */
  files?: LlmExtractionFile[];
  /**
   * Generic-task overrides (receipt scanning etc.). Default to the original
   * travel-reservation behaviour when absent, so booking import is unchanged.
   */
  /** Key of the array in the model's JSON output (default 'reservations'). */
  resultKey?: string;
  /** The user-turn instruction accompanying the document. */
  userText?: string;
}

/**
 * A provider client turns one document into raw schema.org reservation objects.
 * It returns the parsed `reservations` array (best-effort: `[]` on a malformed or
 * empty response, never throwing for content reasons). The caller validates and
 * maps via the shared kitinerary mapper.
 */
export interface LlmExtractionClient {
  extract(input: LlmExtractionInput): Promise<Record<string, unknown>[]>;
}
