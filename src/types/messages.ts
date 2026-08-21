export interface SendMessageResult {
  messageId: string;
  waId: string;
}

interface RawSendMessageResponse {
  messaging_product: "whatsapp";
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export function toSendMessageResult(raw: RawSendMessageResponse): SendMessageResult {
  return {
    messageId: raw.messages?.[0]?.id ?? "",
    waId: raw.contacts?.[0]?.wa_id ?? "",
  };
}

export interface TextMessageOptions {
  body: string;
  previewUrl?: boolean;
}

export interface MediaRef {
  /** Publicly accessible URL Meta will fetch the media from. */
  link?: string;
  /** ID of media previously uploaded via `whatsapp.media.upload()`. */
  mediaId?: string;
  caption?: string;
  filename?: string;
}

export interface LocationMessageOptions {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactMessageEntry {
  name: { formattedName: string; firstName?: string; lastName?: string };
  phones?: { phone: string; type?: "HOME" | "WORK"; waId?: string }[];
  emails?: { email: string; type?: "HOME" | "WORK" }[];
}

export interface TemplateComponentParam {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video" | "product" | "action" | "payload";
  text?: string;
  /** Required when the template uses named parameters (`parameter_format: "named"` at creation time). */
  parameter_name?: string;
  /** Used with `type: "product"` for catalog (single-product message) templates. */
  product?: { product_retailer_id: string; catalog_id: string };
  /** Used with `type: "action"` — e.g. a flow-trigger button's `{ flow_token }`. */
  action?: { flow_token?: string; [key: string]: unknown };
  /** Used with `type: "payload"` for quick-reply buttons. */
  payload?: string;
  [key: string]: unknown;
}

/** A single component within a carousel card (header, optional body, buttons) when sending a template message. */
export interface TemplateCarouselCardComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url" | "flow";
  index?: number | string;
  parameters: TemplateComponentParam[];
}

export interface TemplateCarouselCard {
  /** Zero-indexed position of this card, matching the order cards were defined in at template creation. */
  card_index: number;
  components: TemplateCarouselCardComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button" | "carousel";
  sub_type?: "quick_reply" | "url" | "flow" | "catalog";
  index?: number | string;
  /** Used for type "header" | "body" | "button". Omit when type is "carousel". */
  parameters?: TemplateComponentParam[];
  /** Used only when type is "carousel". */
  cards?: TemplateCarouselCard[];
}

/** Convenience builder for a template's "flow" button component — the shape from Meta's docs:
 *  `{ type: "button", sub_type: "flow", index, parameters: [{ type: "action", action: { flow_token } }] }` */
export function templateFlowButton(index: number, flowToken?: string): TemplateComponent {
  return {
    type: "button",
    sub_type: "flow",
    index,
    parameters: [{ type: "action", action: flowToken ? { flow_token: flowToken } : {} }],
  };
}

export interface SendTemplateOptions {
  name: string;
  language: string; // e.g. "en_US"
  components?: TemplateComponent[];
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export type SendInteractiveOptions =
  | { type: "button"; body: string; header?: string; footer?: string; buttons: InteractiveButton[] }
  | { type: "list"; body: string; header?: string; footer?: string; buttonText: string; sections: InteractiveListSection[] }
  | { type: "cta_url"; body: string; header?: string; footer?: string; displayText: string; url: string };

export interface SendFlowOptions {
  flowId: string;
  cta: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  flowActionPayload?: { screen: string; data?: Record<string, unknown> };
}

export interface SendProductOptions {
  catalogId: string;
  productRetailerId: string;
  body?: string;
  footer?: string;
}

export interface ProductListSection {
  title: string;
  productRetailerIds: string[];
}

export interface SendProductListOptions {
  catalogId: string;
  header: string;
  body: string;
  footer?: string;
  sections: ProductListSection[];
}

export interface ProductCarouselCard {
  catalogId: string;
  productRetailerId: string;
}

export interface SendProductCarouselOptions {
  body: string;
  /** 2–10 product cards, shown left to right in the order given. */
  cards: ProductCarouselCard[];
}

export interface SendLocationRequestOptions {
  /** Message body text. Supports URLs. Max 1024 characters. */
  body: string;
}

export interface SendCatalogOptions {
  body: string;
  footer?: string;
  /** Product shown as the catalog's thumbnail in the message bubble. Defaults to the catalog's hero item if omitted. */
  thumbnailProductRetailerId?: string;
}

export interface SendCatalogTemplateOptions {
  name: string;
  language: string;
  catalogId: string;
  productRetailerId: string;
  /** Body variables, if the approved template's body text uses `{{1}}`/`{{param_name}}` placeholders. */
  bodyParams?: TemplateComponentParam[];
}

export interface CarouselTemplateCardInput {
  headerType: "image" | "video";
  /** Media ID from `whatsapp.media.upload()` for this card's header asset. */
  headerMediaId: string;
  /** Card body variables, if the card's body text uses variables. */
  bodyParams?: TemplateComponentParam[];
  /** Buttons on this card, in the same order/type as defined on the approved template. */
  buttons?: { subType: "quick_reply" | "url" | "flow"; index: number; parameters: TemplateComponentParam[] }[];
}

export interface SendCarouselTemplateOptions {
  name: string;
  language: string;
  /** Variables for the message body shown above the carousel, if it uses variables. */
  bodyParams?: TemplateComponentParam[];
  /** 2–10 cards, matching the number and structure defined on the approved template. */
  cards: CarouselTemplateCardInput[];
}

export interface ReactionOptions {
  messageId: string;
  emoji: string; // empty string removes the reaction
}

export interface MediaCarouselCtaCard {
  type: "cta_url";
  headerType: "image" | "video";
  headerMedia: MediaRef;
  /** Optional card body text. */
  body?: string;
  /** Label on the URL button. Max 20 characters. */
  displayText: string;
  url: string;
}

export interface MediaCarouselQuickReplyCard {
  type: "quick_reply";
  headerType: "image" | "video";
  headerMedia: MediaRef;
  body?: string;
  /** 1–2 quick-reply buttons. Type/count must match across every card in the carousel. */
  buttons: InteractiveButton[];
}

export type MediaCarouselCard = MediaCarouselCtaCard | MediaCarouselQuickReplyCard;

export interface SendMediaCarouselOptions {
  /** Required — shown above the cards. Card-level headers/footers are not supported. */
  body: string;
  /** 2–10 cards. Header format and button type/count must be consistent across all cards. */
  cards: MediaCarouselCard[];
}
