import type { HttpClient } from "../http/request.js";
import { fetchPage, paginateAll } from "../http/pagination.js";
import type { WhatsappResponse, PaginatedResult } from "../types/common.js";
import { WhatsappApiError } from "../http/errors.js";
import type {
  WhatsappTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesParams,
} from "../types/templates.js";

export class TemplatesModule {
  constructor(
    private http: HttpClient,
    private businessAccountId?: string,
  ) {}

  private requireWaba(): WhatsappApiError | null {
    if (!this.businessAccountId) {
      return new WhatsappApiError({
        message: "`businessAccountId` is required in the Whatsapp client config to use whatsapp.templates.*",
        type: "ConfigError",
      });
    }
    return null;
  }

  async list(params: ListTemplatesParams = {}): Promise<WhatsappResponse<PaginatedResult<WhatsappTemplate>>> {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    const page = await fetchPage<WhatsappTemplate>(this.http, `/${this.businessAccountId}/message_templates`, {
      limit: params.limit,
      after: params.after,
      before: params.before,
      status: params.status,
      name: params.name,
    });

    if (page.error || !page.data) {
      return { data: null, error: page.error, status: page.status, statusText: page.statusText, raw: page.raw };
    }

    return {
      data: {
        items: page.data.items,
        pageInfo: { nextCursor: page.data.nextCursor, hasNext: page.data.hasNext },
      },
      error: null,
      status: page.status,
      statusText: page.statusText,
      raw: page.raw,
    };
  }

  /** Async iterator that auto-paginates through every template. */
  listAll(): AsyncGenerator<WhatsappTemplate, void, unknown> {
    return paginateAll<WhatsappTemplate>(this.http, `/${this.businessAccountId}/message_templates`);
  }

  get(templateId: string): Promise<WhatsappResponse<WhatsappTemplate>> {
    return this.http.request<WhatsappTemplate>({ method: "GET", path: `/${templateId}` });
  }

  async create(input: CreateTemplateInput): Promise<WhatsappResponse<{ id: string; status: string; category: string }>> {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    return this.http.request({
      method: "POST",
      path: `/${this.businessAccountId}/message_templates`,
      body: {
        name: input.name,
        category: input.category,
        language: input.language,
        components: input.components,
        parameter_format: input.parameter_format,
      },
    });
  }

  update(templateId: string, patch: UpdateTemplateInput): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "POST", path: `/${templateId}`, body: patch });
  }

  async delete(nameOrId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    return this.http.request({
      method: "DELETE",
      path: `/${this.businessAccountId}/message_templates`,
      query: { name: nameOrId },
    });
  }
}
