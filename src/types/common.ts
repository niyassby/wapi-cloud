import type { WhatsappApiError } from "../http/errors.js";

/**
 * Every SDK method resolves with this shape instead of throwing.
 * Mirrors the Supabase/PostgREST-style `{ data, error }` pattern:
 *
 *   const { data, error } = await whatsapp.templates.list();
 *   if (error) { ... }
 *
 * `data` and `error` are mutually exclusive — exactly one is non-null.
 */
export interface WhatsappResponse<T> {
  data: T | null;
  error: WhatsappApiError | null;
  /** HTTP status code of the underlying request (0 if the request never left the client, e.g. network failure). */
  status: number;
  /** HTTP status text, empty string on client-side failures. */
  statusText: string;
  /** The raw, unmodified JSON body returned by Graph API — escape hatch for fields the SDK hasn't typed yet. */
  raw: unknown;
}

export interface WhatsappConfig {
  /** Permanent or temporary access token for the WhatsApp Business app/system user. */
  accessToken: string;
  /** The phone number ID (not the phone number itself) used for sending messages by default. */
  phoneNumberId: string;
  /** WhatsApp Business Account ID — required for templates, QR codes, analytics. */
  businessAccountId?: string;
  /** Meta App ID — required for a handful of app-level endpoints. */
  appId?: string;
  /** Meta App Secret — required for webhook signature verification. */
  appSecret?: string;
  /** Meta Business Manager ID — required only for `whatsapp.catalogs.list()`. Distinct from `businessAccountId` (the WABA ID). */
  businessId?: string;
  /** Graph API version, e.g. "v21.0". Defaults to a pinned recent stable version. */
  apiVersion?: string;
  /** Override the Graph API base URL (useful for testing against a mock server). */
  baseUrl?: string;
  /** Inject a custom fetch implementation (for testing, or non-Node runtimes). */
  fetch?: typeof fetch;
  /** Max automatic retries for 429 / 5xx responses. Default: 3. */
  maxRetries?: number;
  /** Per-request timeout in ms. Default: 15000. */
  timeoutMs?: number;
  /** Optional hooks for logging / observability. */
  onRequest?: (info: { method: string; url: string }) => void;
  onResponse?: (info: { method: string; url: string; status: number }) => void;
}

export interface PageInfo {
  nextCursor?: string;
  previousCursor?: string;
  hasNext: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: PageInfo;
}
