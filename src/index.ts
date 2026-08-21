export { Whatsapp } from "./client.js";
export { WhatsappApiError } from "./http/errors.js";

export type { WhatsappConfig, WhatsappResponse, PaginatedResult, PageInfo } from "./types/common.js";

export type {
  SendMessageResult,
  TextMessageOptions,
  MediaRef,
  LocationMessageOptions,
  ContactMessageEntry,
  SendTemplateOptions,
  TemplateComponent,
  TemplateComponentParam,
  SendInteractiveOptions,
  InteractiveButton,
  InteractiveListRow,
  InteractiveListSection,
  SendFlowOptions,
  ReactionOptions,
  SendProductOptions,
  ProductListSection,
  SendProductListOptions,
  SendCatalogOptions,
  SendLocationRequestOptions,
  MediaCarouselCtaCard,
  MediaCarouselQuickReplyCard,
  MediaCarouselCard,
  SendMediaCarouselOptions,
  ProductCarouselCard,
  SendProductCarouselOptions,
  SendCatalogTemplateOptions,
  CarouselTemplateCardInput,
  SendCarouselTemplateOptions,
  TemplateCarouselCard,
  TemplateCarouselCardComponent,
} from "./types/messages.js";
export { templateFlowButton } from "./types/messages.js";

export type {
  WhatsappTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesParams,
  TemplateCategory,
  TemplateStatus,
  TemplateComponentDefinition,
  AnyTemplateComponentDefinition,
  TemplateButtonDefinition,
  CarouselComponentDefinition,
  CarouselCardDefinition,
  CarouselCardComponentDefinition,
} from "./types/templates.js";

export type { MediaMetadata } from "./modules/media.js";
export type { ContactCheckResult } from "./modules/contacts.js";
export type { WhatsappPhoneNumber } from "./modules/phoneNumbers.js";
export type { BusinessProfile, UpdateBusinessProfileInput } from "./modules/businessProfile.js";
export type { WhatsappFlow, FlowCategory, CreateFlowInput } from "./modules/flows.js";
export type { WhatsappQrCode } from "./modules/qrCodes.js";
export type { AnalyticsQuery } from "./modules/analytics.js";
export type {
  ExchangedEmbeddedSignupToken,
  EmbeddedSignupLoginScriptOptions,
} from "./modules/embeddedSignup.js";
export type {
  WhatsappCatalog,
  WhatsappProduct,
  CreateProductInput,
  UpdateProductInput,
  ListProductsParams,
  CommerceSettings,
  UpdateCommerceSettingsInput,
  ProductAvailability,
  ProductCondition,
} from "./types/commerce.js";

export type {
  WhatsappEvent,
  InboundMessageEvent,
  MessageStatusEvent,
  TemplateStatusUpdateEvent,
  AccountAlertEvent,
} from "./webhooks/types.js";
