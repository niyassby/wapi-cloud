import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse, PaginatedResult } from "../types/common.js";
import { fetchPage } from "../http/pagination.js";
import type {
  WhatsappProduct,
  CreateProductInput,
  UpdateProductInput,
  ListProductsParams,
} from "../types/commerce.js";

export class ProductsModule {
  constructor(private http: HttpClient) {}

  async list(catalogId: string, params: ListProductsParams = {}): Promise<WhatsappResponse<PaginatedResult<WhatsappProduct>>> {
    const page = await fetchPage<WhatsappProduct>(this.http, `/${catalogId}/products`, {
      limit: params.limit,
      after: params.after,
      before: params.before,
      fields: "id,retailer_id,name,description,price,currency,image_url,url,availability,condition,brand,category,visibility",
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

  get(productId: string): Promise<WhatsappResponse<WhatsappProduct>> {
    return this.http.request({
      method: "GET",
      path: `/${productId}`,
      query: { fields: "id,retailer_id,name,description,price,currency,image_url,url,availability,condition,brand,category,visibility" },
    });
  }

  create(catalogId: string, input: CreateProductInput): Promise<WhatsappResponse<{ id: string }>> {
    return this.http.request({
      method: "POST",
      path: `/${catalogId}/products`,
      body: {
        retailer_id: input.retailerId,
        name: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        image_url: input.imageUrl,
        url: input.url,
        availability: input.availability,
        condition: input.condition,
        brand: input.brand,
        category: input.category,
      },
    });
  }

  update(productId: string, patch: UpdateProductInput): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({
      method: "POST",
      path: `/${productId}`,
      body: {
        retailer_id: patch.retailerId,
        name: patch.name,
        description: patch.description,
        price: patch.price,
        currency: patch.currency,
        image_url: patch.imageUrl,
        url: patch.url,
        availability: patch.availability,
        condition: patch.condition,
        brand: patch.brand,
        category: patch.category,
      },
    });
  }

  delete(productId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "DELETE", path: `/${productId}` });
  }
}
