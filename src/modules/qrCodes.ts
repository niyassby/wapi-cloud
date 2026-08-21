import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";

export interface WhatsappQrCode {
  code: string;
  prefilled_message: string;
  deep_link_url: string;
  qr_image_url?: string;
}

export class QrCodesModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  create(input: { prefilledMessage: string }, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<WhatsappQrCode>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/message_qrdls`,
      body: { prefilled_message: input.prefilledMessage, generate_qr_image: "PNG" },
    });
  }

  list(opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ data: WhatsappQrCode[] }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "GET", path: `/${phoneNumberId}/message_qrdls` });
  }

  get(qrCodeId: string, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<WhatsappQrCode>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "GET", path: `/${phoneNumberId}/message_qrdls/${qrCodeId}` });
  }

  update(
    qrCodeId: string,
    input: { prefilledMessage: string },
    opts?: { phoneNumberId?: string },
  ): Promise<WhatsappResponse<WhatsappQrCode>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/message_qrdls/${qrCodeId}`,
      body: { prefilled_message: input.prefilledMessage },
    });
  }

  delete(qrCodeId: string, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "DELETE", path: `/${phoneNumberId}/message_qrdls/${qrCodeId}` });
  }
}
