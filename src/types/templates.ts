export type TemplateCategory = "AUTHENTICATION" | "MARKETING" | "UTILITY";
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";

export interface TemplateButtonDefinition {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "SPM" | "FLOW";
  /** Button label. Not used for type "SPM" — Meta forces the label to "View". */
  text?: string;
  url?: string;
  phone_number?: string;
  /** Example value(s) for a URL button that uses a `{{1}}` variable. */
  example?: string[];
  /** Required for type "FLOW" if the flow already exists. */
  flow_id?: string;
  /** Alternative to `flow_id` for type "FLOW" — lets Meta resolve the flow by name at review time. */
  flow_name?: string;
  /** "navigate" (default) or "data_exchange", for type "FLOW". */
  flow_action?: "navigate" | "data_exchange";
  /** Required when `flow_action` is "navigate" — the ID of the first screen to open. */
  navigate_screen?: string;
}

export interface TemplateComponentDefinition {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS" | "CALL_PERMISSION_REQUEST";
  /** "PRODUCT" is used for catalog (single-product message) templates. */
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "PRODUCT";
  text?: string;
  buttons?: TemplateButtonDefinition[];
  example?: Record<string, unknown>;
}

/** A single card within a carousel template — a header (image/video) + optional body + buttons. */
export interface CarouselCardComponentDefinition {
  type: "HEADER" | "BODY" | "BUTTONS";
  format?: "IMAGE" | "VIDEO";
  text?: string;
  buttons?: TemplateButtonDefinition[];
  example?: Record<string, unknown>;
}

export interface CarouselCardDefinition {
  components: CarouselCardComponentDefinition[];
}

/** The top-level "carousel" component in a media-card-carousel template. Always paired with a BODY component. */
export interface CarouselComponentDefinition {
  type: "CAROUSEL";
  /** 2–10 cards. All cards must share the same header format and button layout. */
  cards: CarouselCardDefinition[];
}

/** Any component that can appear in a template's `components` array at creation time. */
export type AnyTemplateComponentDefinition = TemplateComponentDefinition | CarouselComponentDefinition;

export interface WhatsappTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  components: AnyTemplateComponentDefinition[];
  rejected_reason?: string;
}

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  language: string;
  components: AnyTemplateComponentDefinition[];
  /** Set to "named" if body/header text uses `{{param_name}}` instead of `{{1}}` positional variables. */
  parameter_format?: "positional" | "named";
}

export interface UpdateTemplateInput {
  category?: TemplateCategory;
  components?: AnyTemplateComponentDefinition[];
}

export interface ListTemplatesParams {
  limit?: number;
  after?: string;
  before?: string;
  status?: TemplateStatus;
  name?: string;
}
