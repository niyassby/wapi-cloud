import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse, PaginatedResult } from "../types/common.js";
import { fetchPage } from "../http/pagination.js";
import { WhatsappApiError } from "../http/errors.js";

export type FlowCategory =
  | "SIGN_UP"
  | "SIGN_IN"
  | "APPOINTMENT_BOOKING"
  | "LEAD_GENERATION"
  | "CONTACT_US"
  | "CUSTOMER_SUPPORT"
  | "SURVEY"
  | "OTHER";

export interface WhatsappFlow {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED";
  categories: string[];
}

export interface CreateFlowInput {
  /** Flow name. Must be unique within the WABA. */
  name: string;
  /** At least one category is required, per Graph API. */
  categories: FlowCategory[];
  /**
   * Optional Flow JSON to initialize the flow with, instead of starting from
   * a blank draft. Accepts either the parsed object or an already-stringified
   * JSON string — the SDK stringifies it for you either way.
   */
  flowJson?: object | string;
  /** Clone an existing flow (by ID) as the starting point instead of `flowJson`. */
  cloneFlowId?: string;
  /** Required only for flows that exchange data with your own backend (data_api flows). */
  endpointUri?: string;
}

export class FlowsModule {
  constructor(
    private http: HttpClient,
    private businessAccountId?: string,
  ) {}

  private requireWaba(): WhatsappApiError | null {
    if (!this.businessAccountId) {
      return new WhatsappApiError({
        message: "`businessAccountId` is required in the Whatsapp client config to use whatsapp.flows.*",
        type: "ConfigError",
      });
    }
    return null;
  }

  async list(): Promise<WhatsappResponse<PaginatedResult<WhatsappFlow>>> {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    const page = await fetchPage<WhatsappFlow>(this.http, `/${this.businessAccountId}/flows`);
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

  async create(input: CreateFlowInput): Promise<WhatsappResponse<{ id: string; success?: boolean; validation_errors?: unknown[] }>> {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    const body: Record<string, unknown> = {
      name: input.name,
      categories: input.categories,
    };
    if (input.flowJson !== undefined) {
      body.flow_json = typeof input.flowJson === "string" ? input.flowJson : JSON.stringify(input.flowJson);
    }
    if (input.cloneFlowId) body.clone_flow_id = input.cloneFlowId;
    if (input.endpointUri) body.endpoint_uri = input.endpointUri;

    return this.http.request({ method: "POST", path: `/${this.businessAccountId}/flows`, body });
  }

  get(flowId: string): Promise<WhatsappResponse<WhatsappFlow>> {
    return this.http.request({ method: "GET", path: `/${flowId}` });
  }

  updateJson(flowId: string, flowJson: object): Promise<WhatsappResponse<{ success: boolean }>> {
    const form = new FormData();
    form.append("file", new Blob([JSON.stringify(flowJson)], { type: "application/json" }), "flow.json");
    form.append("name", "flow.json");
    form.append("asset_type", "FLOW_JSON");
    return this.http.request({ method: "POST", path: `/${flowId}/assets`, body: form, isFormData: true });
  }

  publish(flowId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "POST", path: `/${flowId}/publish` });
  }

  deprecate(flowId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "POST", path: `/${flowId}/deprecate` });
  }

  delete(flowId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "DELETE", path: `/${flowId}` });
  }
}
