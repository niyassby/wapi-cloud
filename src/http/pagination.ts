import type { HttpClient } from "./request.js";
import type { WhatsappResponse } from "../types/common.js";

interface GraphPagingBody<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
}

/**
 * Fetches a single page and normalizes Graph API's `{ data, paging }` shape
 * into `{ items, pageInfo }`.
 */
export async function fetchPage<T>(
  http: HttpClient,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): Promise<WhatsappResponse<{ items: T[]; nextCursor?: string; hasNext: boolean }>> {
  const res = await http.request<GraphPagingBody<T>>({ method: "GET", path, query });

  if (res.error || !res.data) {
    return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
  }

  const nextCursor = res.data.paging?.cursors?.after;

  return {
    data: {
      items: res.data.data ?? [],
      nextCursor,
      hasNext: Boolean(res.data.paging?.next),
    },
    error: null,
    status: res.status,
    statusText: res.statusText,
    raw: res.raw,
  };
}

/**
 * Async iterator that auto-paginates through every page of a list endpoint.
 * Stops (without throwing) and simply ends iteration if a page errors —
 * callers who need to know about a mid-pagination error should use
 * `list()` + manual cursors instead.
 */
export async function* paginateAll<T>(
  http: HttpClient,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): AsyncGenerator<T, void, unknown> {
  let after: string | undefined = undefined;

  while (true) {
    const page: Awaited<ReturnType<typeof fetchPage<T>>> = await fetchPage<T>(http, path, { ...query, after });
    if (page.error || !page.data) return;

    for (const item of page.data.items) yield item;

    if (!page.data.hasNext || !page.data.nextCursor) return;
    after = page.data.nextCursor;
  }
}
