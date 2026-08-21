export interface InboundMessageBase {
  id: string;
  from: string;
  timestamp: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
}

export type InboundMessageEvent =
  | (InboundMessageBase & { messageType: "text"; text: { body: string } })
  | (InboundMessageBase & { messageType: "image"; image: { id: string; mimeType: string; caption?: string } })
  | (InboundMessageBase & { messageType: "video"; video: { id: string; mimeType: string; caption?: string } })
  | (InboundMessageBase & { messageType: "audio"; audio: { id: string; mimeType: string } })
  | (InboundMessageBase & { messageType: "document"; document: { id: string; mimeType: string; filename?: string } })
  | (InboundMessageBase & { messageType: "sticker"; sticker: { id: string; mimeType: string } })
  | (InboundMessageBase & { messageType: "location"; location: { latitude: number; longitude: number; name?: string; address?: string } })
  | (InboundMessageBase & { messageType: "contacts"; contacts: unknown[] })
  | (InboundMessageBase & { messageType: "interactive"; interactive: { type: string; [key: string]: unknown } })
  | (InboundMessageBase & { messageType: "button"; button: { text: string; payload: string } })
  | (InboundMessageBase & { messageType: "reaction"; reaction: { messageId: string; emoji: string } })
  | (InboundMessageBase & { messageType: "unknown"; raw: unknown });

export interface MessageStatusEvent {
  type: "status";
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string;
  timestamp: string;
  phoneNumberId: string;
  errors?: { code: number; title: string }[];
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
  raw: unknown;
}

export type WhatsappEvent =
  | ({ type: "message" } & InboundMessageEvent)
  | MessageStatusEvent
  | TemplateStatusUpdateEvent
  | AccountAlertEvent;
