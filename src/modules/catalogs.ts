import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse, PaginatedResult } from "../types/common.js";
import { fetchPage } from "../http/pagination.js";
import { WhatsappApiError } from "../http/errors.js";
import type { WhatsappCatalog } from "../types/commerce.js";
import type { MessagesModule } from "./messages.js";
import type { SendProductOptions, SendProductListOptions, SendCatalogOptions, SendProductCarouselOptions } from "../types/messages.js";

export class CatalogsModule {
  constructor(
    private http: HttpClient,
    /** Meta Business Manager ID (not the WABA ID) — catalogs are owned at the Business level. */
    private businessId: string | undefined,
    /** Shared messages module instance — lets `whatsapp.catalogs.sendProduct(...)` etc. delegate to the same send logic as `whatsapp.messages.*`. */
    private messages: MessagesModule,
  ) {}

  private requireBusinessId(): WhatsappApiError | null {
    if (!this.businessId) {
      return new WhatsappApiError({
        message: "`businessId` (your Meta Business Manager ID) is required in the Whatsapp client config to use whatsapp.catalogs.list(). You can still call whatsapp.catalogs.get(catalogId) directly with a known catalog ID.",
        type: "ConfigError",
      });
    }
    return null;
  }

  /** Lists catalogs owned by the configured Meta Business Manager account. */
  async list(): Promise<WhatsappResponse<PaginatedResult<WhatsappCatalog>>> {
    const configErr = this.requireBusinessId();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    const page = await fetchPage<WhatsappCatalog>(this.http, `/${this.businessId}/owned_product_catalogs`, {
      fields: "id,name,product_count,vertical",
    });
    if (page.error || !page.data) {
      return { data: null, error: page.error, status: page.status, statusText: page.statusText, raw: page.raw };
    }
    return {
      data: { items: page.data.items, pageInfo: { nextCursor: page.data.nextCursor, hasNext: page.data.hasNext } },
      error: null,
      status: page.status,
      statusText: page.statusText,
      raw: page.raw,
    };
  }

  get(catalogId: string): Promise<WhatsappResponse<WhatsappCatalog>> {
    return this.http.request({
      method: "GET",
      path: `/${catalogId}`,
      query: { fields: "id,name,product_count,vertical" },
    });
  }

  /** Checks which catalog(s) are connected to the WhatsApp Business Account for sending product messages. */
  listConnectedToWaba(businessAccountId: string): Promise<WhatsappResponse<{ data: WhatsappCatalog[] }>> {
    return this.http.request({ method: "GET", path: `/${businessAccountId}/product_catalogs` });
  }

  /** Sugar for `whatsapp.messages.sendProduct()` — send a single catalog product. */
  sendProduct(to: string, options: SendProductOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.messages.sendProduct(to, options, opts);
  }

  /** Sugar for `whatsapp.messages.sendProductList()` — send a multi-product message grouped into sections. */
  sendProductList(to: string, options: SendProductListOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.messages.sendProductList(to, options, opts);
  }

  /** Sugar for `whatsapp.messages.sendCatalog()` — let the customer browse the entire connected catalog. */
  sendCatalog(to: string, options: SendCatalogOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.messages.sendCatalog(to, options, opts);
  }

  /** Sugar for `whatsapp.messages.sendProductCarousel()` — send 2–10 products as a swipeable carousel. */
  sendProductCarousel(to: string, options: SendProductCarouselOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.messages.sendProductCarousel(to, options, opts);
  }
}
