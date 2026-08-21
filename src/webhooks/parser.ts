import type { WhatsappEvent, InboundMessageEvent, MessageStatusEvent, TemplateStatusUpdateEvent } from "./types.js";

interface RawWebhookPayload {
  object?: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product?: string;
        metadata?: { display_phone_number: string; phone_number_id: string };
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

function parseMessage(raw: any, phoneNumberId: string, displayPhoneNumber: string): { type: "message" } & InboundMessageEvent {
  const base = {
    id: raw.id,
    from: raw.from,
    timestamp: raw.timestamp,
    phoneNumberId,
    displayPhoneNumber,
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
    case "interactive":
      return { type: "message", ...base, messageType: "interactive", interactive: raw.interactive ?? { type: "unknown" } };
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
    timestamp: raw.timestamp,
    phoneNumberId,
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

        for (const msg of value.messages ?? []) {
          events.push(parseMessage(msg, phoneNumberId, displayPhoneNumber));
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
      } else {
        events.push({ type: "account_alert", raw: change });
      }
    }
  }

  return events;
}
