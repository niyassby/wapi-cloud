import { HttpClient } from "./http/request.js";
import type { WhatsappConfig, WhatsappResponse } from "./types/common.js";
import { MessagesModule } from "./modules/messages.js";
import { TemplatesModule } from "./modules/templates.js";
import { MediaModule } from "./modules/media.js";
import { ContactsModule } from "./modules/contacts.js";
import { PhoneNumbersModule } from "./modules/phoneNumbers.js";
import { BusinessProfileModule } from "./modules/businessProfile.js";
import { FlowsModule } from "./modules/flows.js";
import { QrCodesModule } from "./modules/qrCodes.js";
import { AnalyticsModule } from "./modules/analytics.js";
import { TwoStepVerificationModule } from "./modules/twoStepVerification.js";
import { CatalogsModule } from "./modules/catalogs.js";
import { ProductsModule } from "./modules/products.js";
import { CommerceSettingsModule } from "./modules/commerceSettings.js";
import { EmbeddedSignupModule } from "./modules/embeddedSignup.js";
import { WebhooksModule } from "./webhooks/index.js";
import type { TextMessageOptions, SendTemplateOptions } from "./types/messages.js";
import type { SendMessageResult } from "./types/messages.js";

export class Whatsapp {
  private http: HttpClient;

  readonly messages: MessagesModule;
  readonly templates: TemplatesModule;
  readonly media: MediaModule;
  readonly contacts: ContactsModule;
  readonly phoneNumbers: PhoneNumbersModule;
  readonly businessProfile: BusinessProfileModule;
  readonly flows: FlowsModule;
  readonly qrCodes: QrCodesModule;
  readonly analytics: AnalyticsModule;
  readonly twoStepVerification: TwoStepVerificationModule;
  readonly catalogs: CatalogsModule;
  readonly products: ProductsModule;
  readonly commerceSettings: CommerceSettingsModule;
  readonly embeddedSignup: EmbeddedSignupModule;
  readonly webhooks: WebhooksModule;

  constructor(config: WhatsappConfig) {
    if (!config.accessToken) throw new Error("Whatsapp: `accessToken` is required.");
    if (!config.phoneNumberId) throw new Error("Whatsapp: `phoneNumberId` is required.");

    this.http = new HttpClient(config);

    this.messages = new MessagesModule(this.http, config.phoneNumberId);
    this.templates = new TemplatesModule(this.http, config.businessAccountId);
    this.media = new MediaModule(this.http, config.phoneNumberId);
    this.contacts = new ContactsModule(this.http, config.phoneNumberId);
    this.phoneNumbers = new PhoneNumbersModule(this.http, config.phoneNumberId, config.businessAccountId);
    this.businessProfile = new BusinessProfileModule(this.http, config.phoneNumberId);
    this.flows = new FlowsModule(this.http, config.businessAccountId);
    this.qrCodes = new QrCodesModule(this.http, config.phoneNumberId);
    this.analytics = new AnalyticsModule(this.http, config.businessAccountId);
    this.twoStepVerification = new TwoStepVerificationModule(this.http, config.phoneNumberId);
    this.catalogs = new CatalogsModule(this.http, config.businessId, this.messages);
    this.products = new ProductsModule(this.http);
    this.commerceSettings = new CommerceSettingsModule(this.http, config.phoneNumberId);
    this.embeddedSignup = new EmbeddedSignupModule(this.http, config.appId, config.appSecret);
    this.webhooks = new WebhooksModule(config.appSecret);
  }

  /** Swap in a new access token at runtime, e.g. after refreshing a short-lived token. */
  setAccessToken(token: string): void {
    this.http.setAccessToken(token);
  }

  /** Raw value of the last `X-Business-Use-Case-Usage` header seen, if any. */
  getRateLimitStatus(): string | null {
    return this.http.getRateLimitStatus();
  }

  /** Sugar for `whatsapp.messages.sendText()` — the most common single call. */
  send(to: string, options: TextMessageOptions): Promise<WhatsappResponse<SendMessageResult>> {
    return this.messages.sendText(to, options);
  }

  /** Sugar for `whatsapp.messages.sendTemplate()`. */
  sendTemplate(to: string, options: SendTemplateOptions): Promise<WhatsappResponse<SendMessageResult>> {
    return this.messages.sendTemplate(to, options);
  }
}
