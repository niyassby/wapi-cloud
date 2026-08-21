import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import { WhatsappApiError } from "../http/errors.js";

export interface AnalyticsQuery {
  start: Date | number;
  end: Date | number;
  granularity?: "HALF_HOUR" | "DAY" | "MONTH";
}

function toUnixSeconds(d: Date | number): number {
  return d instanceof Date ? Math.floor(d.getTime() / 1000) : d;
}

export class AnalyticsModule {
  constructor(
    private http: HttpClient,
    private businessAccountId?: string,
  ) {}

  private requireWaba(): WhatsappApiError | null {
    if (!this.businessAccountId) {
      return new WhatsappApiError({
        message: "`businessAccountId` is required in the Whatsapp client config to use whatsapp.analytics.*",
        type: "ConfigError",
      });
    }
    return null;
  }

  private async fetchField(field: "analytics" | "conversation_analytics" | "pricing_analytics", query: AnalyticsQuery) {
    const configErr = this.requireWaba();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    return this.http.request({
      method: "GET",
      path: `/${this.businessAccountId}`,
      query: {
        fields: `${field}.start(${toUnixSeconds(query.start)}).end(${toUnixSeconds(query.end)}).granularity(${query.granularity ?? "DAY"})`,
      },
    });
  }

  getMessagingAnalytics(query: AnalyticsQuery): Promise<WhatsappResponse<unknown>> {
    return this.fetchField("analytics", query);
  }

  getConversationAnalytics(query: AnalyticsQuery): Promise<WhatsappResponse<unknown>> {
    return this.fetchField("conversation_analytics", query);
  }

  getPricingAnalytics(query: AnalyticsQuery): Promise<WhatsappResponse<unknown>> {
    return this.fetchField("pricing_analytics", query);
  }
}
