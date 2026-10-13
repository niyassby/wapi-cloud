/** Context attached to replies, forwards and product inquiries. */
export interface InboundMessageContext {
  /** Sender of the message being replied to (usually your business number). */
  from?: string;
  /** ID of the message being replied to. */
  id?: string;
  forwarded?: boolean;
  frequentlyForwarded?: boolean;
  referredProduct?: { catalogId: string; productRetailerId: string };
}

export interface InboundMessageBase {
  id: string;
  /**
   * Sender's phone number (wa_id). Can be undefined for users who adopted a WhatsApp
   * username: use `userId` (BSUID) to identify them. See `sender`.
   */
  from?: string;
  /** Business-scoped user ID (BSUID) of the sender, when Meta includes it. */
  userId?: string;
  /** Parent BSUID, for businesses with linked portfolios. */
  parentUserId?: string;
  /** WhatsApp username, when the user has adopted one and shared it. */
  username?: string;
  /** Best identifier for replying: the phone number if present, else the BSUID. */
  sender: string;
  /** Sender's WhatsApp profile name from the webhook `contacts` array. */
  profileName?: string;
  timestamp: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  context?: InboundMessageContext;
  /** Click-to-WhatsApp ad referral data, passed through as received. */
  referral?: Record<string, unknown>;
}

export type InteractiveReply =
  | { kind: "button_reply"; id: string; title: string }
  | { kind: "list_reply"; id: string; title: string; description?: string }
  | {
      kind: "nfm_reply";
      name?: string;
      body?: string;
      /** Parsed `response_json` of a Flow response. */
      responseJson?: Record<string, unknown>;
    }
  | { kind: "unknown" };

export type InboundMessageEvent =
  | (InboundMessageBase & { messageType: "text"; text: { body: string } })
  | (InboundMessageBase & { messageType: "image"; image: { id: string; mimeType: string; caption?: string } })
  | (InboundMessageBase & { messageType: "video"; video: { id: string; mimeType: string; caption?: string } })
  | (InboundMessageBase & { messageType: "audio"; audio: { id: string; mimeType: string } })
  | (InboundMessageBase & { messageType: "document"; document: { id: string; mimeType: string; filename?: string } })
  | (InboundMessageBase & { messageType: "sticker"; sticker: { id: string; mimeType: string } })
  | (InboundMessageBase & { messageType: "location"; location: { latitude: number; longitude: number; name?: string; address?: string } })
  | (InboundMessageBase & { messageType: "contacts"; contacts: unknown[] })
  | (InboundMessageBase & {
      messageType: "interactive";
      interactive: { type: string; [key: string]: unknown };
      /** Normalised view of `interactive`, discriminated on `kind`. */
      reply: InteractiveReply;
    })
  | (InboundMessageBase & { messageType: "button"; button: { text: string; payload: string } })
  | (InboundMessageBase & { messageType: "reaction"; reaction: { messageId: string; emoji: string } })
  | (InboundMessageBase & {
      messageType: "order";
      order: {
        catalogId: string;
        text?: string;
        productItems: { productRetailerId: string; quantity: number; itemPrice: number; currency: string }[];
      };
    })
  | (InboundMessageBase & { messageType: "system"; system: Record<string, unknown> })
  | (InboundMessageBase & { messageType: "request_welcome"; raw: unknown })
  | (InboundMessageBase & {
      messageType: "unsupported";
      errors?: { code: number; title: string; message?: string }[];
      raw: unknown;
    })
  | (InboundMessageBase & { messageType: "unknown"; raw: unknown });

export interface MessageStatusEvent {
  type: "status";
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed" | "deleted" | "warning";
  /** Recipient phone number. Can be undefined when the recipient uses a username: see `recipientUserId`. */
  recipientId?: string;
  recipientUserId?: string;
  recipientParentUserId?: string;
  username?: string;
  timestamp: string;
  phoneNumberId: string;
  /** The `biz_opaque_callback_data` you passed when sending, echoed back. */
  bizOpaqueCallbackData?: string;
  conversation?: { id: string; expirationTimestamp?: string; origin?: { type: string } };
  pricing?: { billable?: boolean; pricingModel?: string; category?: string; type?: string };
  errors?: { code: number; title: string; message?: string; error_data?: { details?: string } }[];
}

export interface TemplateStatusUpdateEvent {
  type: "template_status_update";
  messageTemplateId: string;
  messageTemplateName: string;
  messageTemplateLanguage: string;
  event: string;
  reason?: string;
}

export interface AccountAlertEvent {
  type: "account_alert";
  /** Webhook field name, e.g. "phone_number_quality_update" or "account_update". */
  field?: string;
  raw: unknown;
}

/** A webhook field this SDK has no typed event for yet (flows, calls, history, ...). */
export interface UnknownFieldEvent {
  type: "unknown_field";
  field: string;
  value: unknown;
  raw: unknown;
}

/** `calls` webhook: connect (inbound call), terminate, status updates. Fields are passed through as Meta sends them. */
export interface CallEvent {
  type: "call";
  phoneNumberId: string;
  callId: string;
  /** e.g. "connect" or "terminate" for call events; undefined for permission/status payloads. */
  event?: string;
  direction?: "USER_INITIATED" | "BUSINESS_INITIATED" | string;
  from?: string;
  to?: string;
  /** SDP offer for inbound calls (pass to your WebRTC stack, then call `calls.accept`). */
  session?: { sdp_type: string; sdp: string };
  status?: string;
  timestamp?: string;
  bizOpaqueCallbackData?: string;
  raw: unknown;
}

/** Group webhooks: group_lifecycle_update, group_settings_update, group_participants_update, group_status_update. */
export interface GroupUpdateEvent {
  type: "group_update";
  field: string;
  value: unknown;
  raw: unknown;
}

export type WhatsappEvent =
  | ({ type: "message" } & InboundMessageEvent)
  | MessageStatusEvent
  | TemplateStatusUpdateEvent
  | AccountAlertEvent
  | UnknownFieldEvent
  | CallEvent
  | GroupUpdateEvent;
