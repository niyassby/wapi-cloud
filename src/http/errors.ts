/**
 * Normalized error shape for every failure mode: HTTP errors from Graph API,
 * network failures, and timeouts all end up as a WhatsappApiError instance
 * living on `response.error` — methods never throw for expected API errors.
 */
export class WhatsappApiError extends Error {
  /** Graph API numeric error code, e.g. 131047. 0 for network/client-side failures. */
  code: number;
  /** Graph API error type, e.g. "OAuthException". */
  type: string;
  subcode?: number;
  fbtraceId?: string;
  httpStatus: number;
  isRetryable: boolean;
  /** The raw error body Graph API returned, if any. */
  raw: unknown;

  constructor(params: {
    message: string;
    code?: number;
    type?: string;
    subcode?: number;
    fbtraceId?: string;
    httpStatus?: number;
    isRetryable?: boolean;
    raw?: unknown;
  }) {
    super(params.message);
    this.name = "WhatsappApiError";
    this.code = params.code ?? 0;
    this.type = params.type ?? "ClientError";
    this.subcode = params.subcode;
    this.fbtraceId = params.fbtraceId;
    this.httpStatus = params.httpStatus ?? 0;
    this.isRetryable = params.isRetryable ?? false;
    this.raw = params.raw;
  }
}

/**
 * Friendly explanations for common Graph API error codes.
 * Not exhaustive — falls back to the raw Graph message when unmapped.
 */
export const KNOWN_ERROR_HINTS: Record<number, string> = {
  0: "Network or client-side failure — request never completed.",
  4: "Application request limit reached. The SDK already retries these automatically; consider slowing down send volume.",
  10: "Permission denied — check the access token has the required permission for this endpoint.",
  100: "Invalid parameter — check the request payload against the Graph API docs for this endpoint.",
  131000: "Generic WhatsApp error. Check `raw` for details.",
  131005: "Access token has expired or is invalid.",
  131009: "Parameter value is not valid.",
  131016: "Service unavailable — Meta's servers are temporarily unable to process the request.",
  131021: "Recipient phone number is invalid or not on WhatsApp.",
  131026: "Message could not be delivered to the recipient (undeliverable).",
  131031: "WhatsApp Business Account has been restricted or disabled.",
  131042: "Payment/billing issue on the WhatsApp Business Account.",
  131045: "Number registration required before sending is allowed.",
  131047: "Re-engagement message outside the 24-hour customer service window — a template message is required.",
  131048: "Spam rate limit hit — too many messages flagged as spam by recipients.",
  131049: "Message not sent due to being held for quality/experiment reasons.",
  132000: "Template parameter count mismatch.",
  132001: "Template does not exist in the given language, or is not yet approved.",
  132005: "Template is paused due to low quality rating.",
  132007: "Template has been rejected or disabled.",
  133004: "Server temporarily unavailable — safe to retry.",
  133005: "Phone number is not registered on WhatsApp Cloud API — register it first.",
  133010: "Phone number not registered with this WhatsApp Business Account.",
};

export function describeErrorCode(code: number): string | undefined {
  return KNOWN_ERROR_HINTS[code];
}
