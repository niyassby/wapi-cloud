import type {
  WhatsappEvent,
  InboundMessageEvent,
  InboundMessageContext,
  InteractiveReply,
  MessageStatusEvent,
  TemplateStatusUpdateEvent,
  CallEvent,
} from "./types.js";

interface RawContact {
  wa_id?: string;
  user_id?: string;
  parent_user_id?: string;
  profile?: { name?: string; username?: string };
}

interface RawWebhookPayload {
  object?: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product?: string;
        metadata?: { display_phone_number: string; phone_number_id: string };
        contacts?: RawContact[];
        messages?: any[];
        statuses?: any[];
        message_template_id?: string;
        message_template_name?: string;
        message_template_language?: string;
        event?: string;
        reason?: string;
        [key: string]: unknown;
      };
    }[];
  }[];
}

const ACCOUNT_FIELDS = new Set([
  "account_alerts",
  "account_update",
  "account_review_update",
  "phone_number_quality_update",
  "phone_number_name_update",
  "business_capability_update",
]);

function findContact(contacts: RawContact[], raw: any): RawContact | undefined {
  const match = contacts.find(
    (c) =>
      (raw.from && c.wa_id === raw.from) ||
      (raw.from_user_id && c.user_id === raw.from_user_id) ||
      (raw.user_id && c.user_id === raw.user_id),
  );
  return match ?? (contacts.length === 1 ? contacts[0] : undefined);
}

function parseContext(ctx: any): InboundMessageContext | undefined {
  if (!ctx) return undefined;
  return {
    from: ctx.from,
    id: ctx.id,
    forwarded: ctx.forwarded,
    frequentlyForwarded: ctx.frequently_forwarded,
    referredProduct: ctx.referred_product
      ? { catalogId: ctx.referred_product.catalog_id, productRetailerId: ctx.referred_product.product_retailer_id }
      : undefined,
  };
}

function parseInteractiveReply(i: any): InteractiveReply {
  if (i?.button_reply) return { kind: "button_reply", id: i.button_reply.id, title: i.button_reply.title };
  if (i?.list_reply) {
    return { kind: "list_reply", id: i.list_reply.id, title: i.list_reply.title, description: i.list_reply.description };
  }
  if (i?.nfm_reply) {
    let responseJson: Record<string, unknown> | undefined;
    try {
      const rj = i.nfm_reply.response_json;
      responseJson = typeof rj === "string" ? JSON.parse(rj) : rj;
    } catch {
      responseJson = undefined;
    }
    return { kind: "nfm_reply", name: i.nfm_reply.name, body: i.nfm_reply.body, responseJson };
  }
  return { kind: "unknown" };
}

function parseMessage(
  raw: any,
  phoneNumberId: string,
  displayPhoneNumber: string,
  contacts: RawContact[],
): { type: "message" } & InboundMessageEvent {
  const contact = findContact(contacts, raw);
  const from: string | undefined = raw.from ?? contact?.wa_id;
  const userId: string | undefined = raw.from_user_id ?? raw.user_id ?? contact?.user_id;
  const base = {
    id: raw.id,
    from,
    userId,
    parentUserId: (raw.from_parent_user_id ?? raw.parent_user_id ?? contact?.parent_user_id) as string | undefined,
    username: (raw.username ?? contact?.profile?.username) as string | undefined,
    sender: from ?? userId ?? "",
    profileName: contact?.profile?.name,
    timestamp: raw.timestamp,
    phoneNumberId,
    displayPhoneNumber,
    context: parseContext(raw.context),
    referral: raw.referral as Record<string, unknown> | undefined,
  };

  switch (raw.type) {
    case "text":
      return { type: "message", ...base, messageType: "text", text: { body: raw.text?.body ?? "" } };
    case "image":
      return {
        type: "message",
        ...base,
        messageType: "image",
        image: { id: raw.image?.id, mimeType: raw.image?.mime_type, caption: raw.image?.caption },
      };
    case "video":
      return {
        type: "message",
        ...base,
        messageType: "video",
        video: { id: raw.video?.id, mimeType: raw.video?.mime_type, caption: raw.video?.caption },
      };
    case "audio":
      return { type: "message", ...base, messageType: "audio", audio: { id: raw.audio?.id, mimeType: raw.audio?.mime_type } };
    case "document":
      return {
        type: "message",
        ...base,
        messageType: "document",
        document: { id: raw.document?.id, mimeType: raw.document?.mime_type, filename: raw.document?.filename },
      };
    case "sticker":
      return {
        type: "message",
        ...base,
        messageType: "sticker",
        sticker: { id: raw.sticker?.id, mimeType: raw.sticker?.mime_type },
      };
    case "location":
      return {
        type: "message",
        ...base,
        messageType: "location",
        location: {
          latitude: raw.location?.latitude,
          longitude: raw.location?.longitude,
          name: raw.location?.name,
          address: raw.location?.address,
        },
      };
    case "contacts":
      return { type: "message", ...base, messageType: "contacts", contacts: raw.contacts ?? [] };
    case "interactive": {
      const interactive = raw.interactive ?? { type: "unknown" };
      return { type: "message", ...base, messageType: "interactive", interactive, reply: parseInteractiveReply(interactive) };
    }
    case "button":
      return {
        type: "message",
        ...base,
        messageType: "button",
        button: { text: raw.button?.text ?? "", payload: raw.button?.payload ?? "" },
      };
    case "reaction":
      return {
        type: "message",
        ...base,
        messageType: "reaction",
        reaction: { messageId: raw.reaction?.message_id ?? "", emoji: raw.reaction?.emoji ?? "" },
      };
    case "order":
      return {
        type: "message",
        ...base,
        messageType: "order",
        order: {
          catalogId: raw.order?.catalog_id,
          text: raw.order?.text,
          productItems: (raw.order?.product_items ?? []).map((p: any) => ({
            productRetailerId: p.product_retailer_id,
            quantity: p.quantity,
            itemPrice: p.item_price,
            currency: p.currency,
          })),
        },
      };
    case "system":
      return { type: "message", ...base, messageType: "system", system: raw.system ?? {} };
    case "request_welcome":
      return { type: "message", ...base, messageType: "request_welcome", raw };
    case "unsupported":
      return { type: "message", ...base, messageType: "unsupported", errors: raw.errors, raw };
    default:
      return { type: "message", ...base, messageType: "unknown", raw };
  }
}

function parseStatus(raw: any, phoneNumberId: string): MessageStatusEvent {
  return {
    type: "status",
    messageId: raw.id,
    status: raw.status,
    recipientId: raw.recipient_id,
    recipientUserId: raw.recipient_user_id,
    recipientParentUserId: raw.recipient_parent_user_id,
    username: raw.username,
    timestamp: raw.timestamp,
    phoneNumberId,
    bizOpaqueCallbackData: raw.biz_opaque_callback_data,
    conversation: raw.conversation
      ? {
          id: raw.conversation.id,
          expirationTimestamp: raw.conversation.expiration_timestamp,
          origin: raw.conversation.origin,
        }
      : undefined,
    pricing: raw.pricing
      ? {
          billable: raw.pricing.billable,
          pricingModel: raw.pricing.pricing_model,
          category: raw.pricing.category,
          type: raw.pricing.type,
        }
      : undefined,
    errors: raw.errors,
  };
}

/**
 * Parses a raw (already JSON-parsed) webhook body from Meta into a flat list
 * of typed events. Handles multiple entries/changes/messages in a single
 * delivery, which Meta batches in some cases.
 */
export function parse(payload: unknown): WhatsappEvent[] {
  const body = payload as RawWebhookPayload;
  const events: WhatsappEvent[] = [];

  if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    return events;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      const { field, value } = change;

      if (field === "messages") {
        const phoneNumberId = value.metadata?.phone_number_id ?? "";
        const displayPhoneNumber = value.metadata?.display_phone_number ?? "";
        const contacts = value.contacts ?? [];

        for (const msg of value.messages ?? []) {
          events.push(parseMessage(msg, phoneNumberId, displayPhoneNumber, contacts));
        }
        for (const status of value.statuses ?? []) {
          events.push(parseStatus(status, phoneNumberId));
        }
      } else if (field === "message_template_status_update") {
        const tmplEvent: TemplateStatusUpdateEvent = {
          type: "template_status_update",
          messageTemplateId: String(value.message_template_id ?? ""),
          messageTemplateName: String(value.message_template_name ?? ""),
          messageTemplateLanguage: String(value.message_template_language ?? ""),
          event: String(value.event ?? ""),
          reason: value.reason as string | undefined,
        };
        events.push(tmplEvent);
      } else if (field === "calls") {
        const phoneNumberId = value.metadata?.phone_number_id ?? "";
        for (const call of (value.calls ?? []) as any[]) {
          const ev: CallEvent = {
            type: "call",
            phoneNumberId,
            callId: call.id,
            event: call.event,
            direction: call.direction,
            from: call.from,
            to: call.to,
            session: call.session,
            status: call.status,
            timestamp: call.timestamp,
            bizOpaqueCallbackData: call.biz_opaque_callback_data,
            raw: call,
          };
          events.push(ev);
        }
        // Call status webhooks arrive in `statuses` with type "call".
        for (const st of (value.statuses ?? []) as any[]) {
          events.push({
            type: "call",
            phoneNumberId,
            callId: st.id,
            status: st.status,
            timestamp: st.timestamp,
            to: st.recipient_id,
            bizOpaqueCallbackData: st.biz_opaque_callback_data,
            raw: st,
          });
        }
      } else if (field.startsWith("group_")) {
        events.push({ type: "group_update", field, value, raw: change });
      } else if (ACCOUNT_FIELDS.has(field)) {
        events.push({ type: "account_alert", field, raw: change });
      } else {
        events.push({ type: "unknown_field", field, value, raw: change });
      }
    }
  }

  return events;
}
