import { WhatsappApiError, describeErrorCode } from "./errors.js";
import type { WhatsappConfig, WhatsappResponse } from "../types/common.js";

const DEFAULT_API_VERSION = "v21.0";
const DEFAULT_BASE_URL = "https://graph.facebook.com";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 15000;

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  path: string; // relative to /{apiVersion}/, e.g. "/{phoneNumberId}/messages"
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Set true when body is a FormData/binary upload (skips JSON.stringify + content-type header). */
  isFormData?: boolean;
  /** Override the access token for this single call (rarely needed). */
  accessTokenOverride?: string;
}

export class HttpClient {
  private accessToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly onRequest?: WhatsappConfig["onRequest"];
  private readonly onResponse?: WhatsappConfig["onResponse"];
  private lastRateLimitHeader: string | null = null;

  constructor(config: WhatsappConfig) {
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = config.fetch ?? fetch;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /** Exposes the bearer header for the rare case a module needs to hit a non-Graph URL (e.g. downloading a temp media URL). */
  getAuthHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  getRateLimitStatus(): string | null {
    return this.lastRateLimitHeader;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}/${this.apiVersion}${cleanPath}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request<T>(opts: RequestOptions): Promise<WhatsappResponse<T>> {
    const method = opts.method ?? "GET";
    const url = this.buildUrl(opts.path, opts.query);
    const token = opts.accessTokenOverride ?? this.accessToken;

    let attempt = 0;
    let lastNetworkError: unknown;

    while (attempt <= this.maxRetries) {
      attempt++;
      this.onRequest?.({ method, url });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        let body: BodyInit | undefined;

        if (opts.body !== undefined) {
          if (opts.isFormData) {
            body = opts.body as BodyInit; // FormData sets its own content-type
          } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(opts.body);
          }
        }

        const res = await this.fetchImpl(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        this.onResponse?.({ method, url, status: res.status });

        const rateLimitHeader = res.headers.get("x-business-use-case-usage");
        if (rateLimitHeader) this.lastRateLimitHeader = rateLimitHeader;

        const isRetryableStatus = res.status === 429 || res.status >= 500;

        // Try to parse JSON regardless of status — Graph API errors are JSON too.
        let json: unknown = null;
        const text = await res.text();
        if (text) {
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
        }

        if (!res.ok) {
          if (isRetryableStatus && attempt <= this.maxRetries) {
            await this.backoff(attempt, res.headers.get("retry-after"));
            continue;
          }

          const errBody = json as GraphErrorBody | null;
          const graphErr = errBody?.error;
          const code = graphErr?.code ?? 0;
          const hint = code ? describeErrorCode(code) : undefined;

          return {
            data: null,
            error: new WhatsappApiError({
              message: hint ? `${graphErr?.message ?? "Request failed"} — ${hint}` : graphErr?.message ?? `Request failed with status ${res.status}`,
              code,
              type: graphErr?.type ?? "HttpError",
              subcode: graphErr?.error_subcode,
              fbtraceId: graphErr?.fbtrace_id,
              httpStatus: res.status,
              isRetryable: isRetryableStatus,
              raw: json,
            }),
            status: res.status,
            statusText: res.statusText,
            raw: json,
          };
        }

        return {
          data: json as T,
          error: null,
          status: res.status,
          statusText: res.statusText,
          raw: json,
        };
      } catch (err) {
        clearTimeout(timeout);
        lastNetworkError = err;
        const isAbort = err instanceof Error && err.name === "AbortError";

        if (attempt <= this.maxRetries) {
          await this.backoff(attempt, null);
          continue;
        }

        return {
          data: null,
          error: new WhatsappApiError({
            message: isAbort ? `Request timed out after ${this.timeoutMs}ms` : `Network error: ${(err as Error).message}`,
            code: 0,
            type: isAbort ? "TimeoutError" : "NetworkError",
            httpStatus: 0,
            isRetryable: true,
            raw: err,
          }),
          status: 0,
          statusText: "",
          raw: null,
        };
      }
    }

    // Should be unreachable, but keep TypeScript happy.
    return {
      data: null,
      error: new WhatsappApiError({
        message: `Request failed after ${this.maxRetries} retries: ${String(lastNetworkError)}`,
        isRetryable: false,
      }),
      status: 0,
      statusText: "",
      raw: null,
    };
  }

  private async backoff(attempt: number, retryAfterHeader: string | null) {
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
    const jitter = Math.random() * 100;
    const delay = retryAfterMs ?? Math.min(1000 * 2 ** (attempt - 1), 8000) + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
