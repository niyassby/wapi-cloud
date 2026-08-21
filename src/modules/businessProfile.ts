import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";

export interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
}

export interface UpdateBusinessProfileInput {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
  /** Media handle from a prior upload, used to set a new profile picture. */
  profilePictureHandle?: string;
}

export class BusinessProfileModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  async get(opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<BusinessProfile>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const res = await this.http.request<{ data: BusinessProfile[] }>({
      method: "GET",
      path: `/${phoneNumberId}/whatsapp_business_profile`,
      query: { fields: "about,address,description,email,profile_picture_url,websites,vertical" },
    });

    if (res.error || !res.data) {
      return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
    }

    return { data: res.data.data?.[0] ?? {}, error: null, status: res.status, statusText: res.statusText, raw: res.raw };
  }

  update(input: UpdateBusinessProfileInput, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({
      method: "POST",
      path: `/${phoneNumberId}/whatsapp_business_profile`,
      body: {
        messaging_product: "whatsapp",
        about: input.about,
        address: input.address,
        description: input.description,
        email: input.email,
        websites: input.websites,
        vertical: input.vertical,
        profile_picture_handle: input.profilePictureHandle,
      },
    });
  }
}
