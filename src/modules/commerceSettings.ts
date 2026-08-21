import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import type { CommerceSettings, UpdateCommerceSettingsInput } from "../types/commerce.js";

export class CommerceSettingsModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  get(opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<CommerceSettings>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "GET", path: `/${phoneNumberId}/whatsapp_commerce_settings` });
  }

  update(input: UpdateCommerceSettingsInput, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/whatsapp_commerce_settings`,
      body: {
        is_catalog_visible: input.isCatalogVisible,
        is_cart_enabled: input.isCartEnabled,
      },
    });
  }
}
