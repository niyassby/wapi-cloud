import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import { isBsuid } from "../types/messages.js";

export interface CallSession {
  /** "offer" for connect, "answer" for pre_accept/accept (per Meta's samples). */
  sdpType: "offer" | "answer";
  sdp: string;
}

export interface CallingSettings {
  status?: "ENABLED" | "DISABLED";
  call_icon_visibility?: "DEFAULT" | "DISABLE_ALL";
  call_hours?: {
    status: "ENABLED" | "DISABLED";
    timezone_id: string;
    weekly_operating_hours: { day_of_week: string; open_time: string; close_time: string }[];
    holiday_schedule?: { date: string; start_time: string; end_time: string }[];
  };
  callback_permission_status?: "ENABLED" | "DISABLED";
  sip?: {
    status: "ENABLED" | "DISABLED";
    servers?: { hostname: string; port?: number; request_uri_user_params?: Record<string, string>; sip_user_password?: string }[];
  };
}

export interface CallPermissionState {
  messaging_product: "whatsapp";
  permission: { status: "no_permission" | "temporary" | "permanent"; expiration_time?: number };
  actions: {
    action_name: "send_call_permission_request" | "start_call";
    can_perform_action: boolean;
    limits: { time_period: string; max_allowed: number; current_usage: number; limit_expiration_time?: number }[];
  }[];
}

interface CallActionOpts {
  phoneNumberId?: string;
}

/**
 * WhatsApp Business Calling API. WebRTC (creating the SDP offer/answer and carrying media)
 * is your responsibility; this module only drives Meta's signalling endpoints.
 */
export class CallsModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  private post<T>(body: Record<string, unknown>, opts?: CallActionOpts): Promise<WhatsappResponse<T>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request<T>({
      method: "POST",
      path: `/${phoneNumberId}/calls`,
      body: { messaging_product: "whatsapp", ...body },
    });
  }

  /**
   * Starts a business-initiated call. The user must have granted call permission first.
   * `to` accepts a phone number or a BSUID.
   */
  connect(
    to: string,
    session: Pick<CallSession, "sdp"> & { sdpType?: "offer" },
    opts?: CallActionOpts & { bizOpaqueCallbackData?: string },
  ): Promise<WhatsappResponse<{ messaging_product: "whatsapp"; calls: { id: string }[] }>> {
    return this.post(
      {
        ...(isBsuid(to) ? { recipient: to } : { to }),
        action: "connect",
        session: { sdp_type: session.sdpType ?? "offer", sdp: session.sdp },
        biz_opaque_callback_data: opts?.bizOpaqueCallbackData,
      },
      opts,
    );
  }

  /** Optional: prepares the media connection for an inbound call before you `accept` it. */
  preAccept(callId: string, session: CallSession, opts?: CallActionOpts) {
    return this.post<{ messaging_product: "whatsapp"; success: boolean }>(
      { call_id: callId, action: "pre_accept", session: { sdp_type: session.sdpType, sdp: session.sdp } },
      opts,
    );
  }

  /** Accepts an inbound call. Start sending media only after this resolves successfully. */
  accept(callId: string, session: CallSession, opts?: CallActionOpts & { bizOpaqueCallbackData?: string }) {
    return this.post<{ messaging_product: "whatsapp"; success: boolean }>(
      {
        call_id: callId,
        action: "accept",
        session: { sdp_type: session.sdpType, sdp: session.sdp },
        biz_opaque_callback_data: opts?.bizOpaqueCallbackData,
      },
      opts,
    );
  }

  reject(callId: string, opts?: CallActionOpts) {
    return this.post<{ messaging_product: "whatsapp"; success: boolean }>({ call_id: callId, action: "reject" }, opts);
  }

  /** Ends an active call. Not needed when the user hangs up. */
  terminate(callId: string, opts?: CallActionOpts) {
    return this.post<{ messaging_product: "whatsapp"; success: boolean }>({ call_id: callId, action: "terminate" }, opts);
  }

  /** Looks up whether you may call a user, and your remaining permission-request / call limits. Pass a wa_id or BSUID. */
  getPermission(user: string, opts?: CallActionOpts): Promise<WhatsappResponse<CallPermissionState>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request<CallPermissionState>({
      method: "GET",
      path: `/${phoneNumberId}/call_permissions`,
      query: isBsuid(user) ? { recipient: user } : { user_wa_id: user },
    });
  }

  /** Reads the calling configuration of the phone number. */
  async getSettings(opts?: CallActionOpts & { includeSipCredentials?: boolean }): Promise<WhatsappResponse<CallingSettings>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const res = await this.http.request<{ calling?: CallingSettings }>({
      method: "GET",
      path: `/${phoneNumberId}/settings`,
      query: { include_sip_credentials: opts?.includeSipCredentials ? true : undefined },
    });
    if (res.error || !res.data) {
      return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
    }
    return { data: res.data.calling ?? {}, error: null, status: res.status, statusText: res.statusText, raw: res.raw };
  }

  /** Enables/disables calling and sets hours, callback permission and SIP. Changes can take up to 7 days to reach all clients. */
  updateSettings(settings: CallingSettings, opts?: CallActionOpts): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "POST", path: `/${phoneNumberId}/settings`, body: { calling: settings } });
  }
}
