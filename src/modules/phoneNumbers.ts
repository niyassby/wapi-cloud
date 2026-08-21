import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import { WhatsappApiError } from "../http/errors.js";

export interface WhatsappPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  code_verification_status: string;
}

export class PhoneNumbersModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
    private businessAccountId?: string,
  ) {}

  list(): Promise<WhatsappResponse<{ data: WhatsappPhoneNumber[] }>> {
    if (!this.businessAccountId) {
      return Promise.resolve({
        data: null,
        error: new WhatsappApiError({
          message: "`businessAccountId` is required in the Whatsapp client config to use whatsapp.phoneNumbers.list()",
          type: "ConfigError",
        }),
        status: 0,
        statusText: "",
        raw: null,
      });
    }
    return this.http.request({ method: "GET", path: `/${this.businessAccountId}/phone_numbers` });
  }

  get(phoneNumberId?: string): Promise<WhatsappResponse<WhatsappPhoneNumber>> {
    return this.http.request({ method: "GET", path: `/${phoneNumberId ?? this.defaultPhoneNumberId}` });
  }

  register(input: { pin: string }, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/register`,
      body: { messaging_product: "whatsapp", pin: input.pin },
    });
  }

  deregister(opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "POST", path: `/${phoneNumberId}/deregister` });
  }

  requestVerificationCode(
    input: { codeMethod: "SMS" | "VOICE"; language?: string },
    opts?: { phoneNumberId?: string },
  ): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/request_code`,
      body: { code_method: input.codeMethod, language: input.language ?? "en" },
    });
  }

  verifyCode(input: { code: string }, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/verify_code`,
      body: { code: input.code },
    });
  }

  updateSettings(
    settings: Record<string, unknown>,
    opts?: { phoneNumberId?: string },
  ): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "POST", path: `/${phoneNumberId}/settings`, body: settings });
  }
}
