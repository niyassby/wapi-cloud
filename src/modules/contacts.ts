import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";

export interface ContactCheckResult {
  input: string;
  waId?: string;
  status: "valid" | "invalid";
}

export class ContactsModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  async check(phoneNumbers: string[], opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<ContactCheckResult[]>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const res = await this.http.request<{ contacts: { input: string; wa_id?: string; status: string }[] }>({
      method: "POST",
      path: `/${phoneNumberId}/contacts`,
      body: { blocking: "wait", contacts: phoneNumbers, force_check: true },
    });

    if (res.error || !res.data) {
      return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
    }

    return {
      data: res.data.contacts.map((c) => ({
        input: c.input,
        waId: c.wa_id,
        status: c.status === "valid" ? "valid" : "invalid",
      })),
      error: null,
      status: res.status,
      statusText: res.statusText,
      raw: res.raw,
    };
  }

  block(waIds: string[], opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/block_users`,
      body: { messaging_product: "whatsapp", block_users: waIds.map((id) => ({ user: id })) },
    });
  }

  unblock(waIds: string[], opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "DELETE",
      path: `/${phoneNumberId}/block_users`,
      body: { messaging_product: "whatsapp", block_users: waIds.map((id) => ({ user: id })) },
    });
  }

  listBlocked(opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ waId: string }[]>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "GET", path: `/${phoneNumberId}/block_users` });
  }
}
