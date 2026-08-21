import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";

export class TwoStepVerificationModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  set(input: { pin: string }, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "POST", path: `/${phoneNumberId}`, body: { pin: input.pin } });
  }
}
