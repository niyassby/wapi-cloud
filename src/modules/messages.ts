import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import {
  toSendMessageResult,
  type SendMessageResult,
  type TextMessageOptions,
  type MediaRef,
  type LocationMessageOptions,
  type ContactMessageEntry,
  type SendTemplateOptions,
  type SendInteractiveOptions,
  type SendFlowOptions,
  type ReactionOptions,
  type SendProductOptions,
  type SendProductListOptions,
  type SendCatalogOptions,
  type SendLocationRequestOptions,
  type SendMediaCarouselOptions,
  type SendProductCarouselOptions,
  type SendCatalogTemplateOptions,
  type SendCarouselTemplateOptions,
} from "../types/messages.js";

export class MessagesModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  private async send(
    payload: Record<string, unknown>,
    opts?: { phoneNumberId?: string; replyToMessageId?: string },
  ): Promise<WhatsappResponse<SendMessageResult>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      ...payload,
    };
    if (opts?.replyToMessageId) {
      body.context = { message_id: opts.replyToMessageId };
    }

    const res = await this.http.request<Parameters<typeof toSendMessageResult>[0]>({
      method: "POST",
      path: `/${phoneNumberId}/messages`,
      body,
    });

    if (res.error || !res.data) {
      return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
    }

    return {
      data: toSendMessageResult(res.data),
      error: null,
      status: res.status,
      statusText: res.statusText,
      raw: res.raw,
    };
  }

  sendText(to: string, options: TextMessageOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "text",
        text: { body: options.body, preview_url: options.previewUrl ?? false },
      },
      opts,
    );
  }

  sendTemplate(to: string, options: SendTemplateOptions, opts?: { phoneNumberId?: string }) {
    return this.send(
      {
        to,
        type: "template",
        template: {
          name: options.name,
          language: { code: options.language },
          components: options.components,
        },
      },
      opts,
    );
  }

  /**
   * Sends an approved catalog (single-product message) template — the
   * "spm" button type. Product image/title/price are pulled from the
   * catalog automatically; you just supply which product and (optionally)
   * body variables.
   */
  sendCatalogTemplate(to: string, options: SendCatalogTemplateOptions, opts?: { phoneNumberId?: string }) {
    return this.sendTemplate(
      to,
      {
        name: options.name,
        language: options.language,
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "product",
                product: { product_retailer_id: options.productRetailerId, catalog_id: options.catalogId },
              },
            ],
          },
          ...(options.bodyParams ? [{ type: "body" as const, parameters: options.bodyParams }] : []),
        ],
      },
      opts,
    );
  }

  /** Sends an approved media-card-carousel template — up to 10 swipeable cards below the body text. */
  sendCarouselTemplate(to: string, options: SendCarouselTemplateOptions, opts?: { phoneNumberId?: string }) {
    return this.sendTemplate(
      to,
      {
        name: options.name,
        language: options.language,
        components: [
          ...(options.bodyParams ? [{ type: "body" as const, parameters: options.bodyParams }] : []),
          {
            type: "carousel",
            cards: options.cards.map((card, cardIndex) => ({
              card_index: cardIndex,
              components: [
                {
                  type: "header" as const,
                  parameters: [{ type: card.headerType, [card.headerType]: { id: card.headerMediaId } }],
                },
                ...(card.bodyParams ? [{ type: "body" as const, parameters: card.bodyParams }] : []),
                ...(card.buttons ?? []).map((b) => ({
                  type: "button" as const,
                  sub_type: b.subType,
                  index: b.index,
                  parameters: b.parameters,
                })),
              ],
            })),
          },
        ],
      },
      opts,
    );
  }

  private sendMedia(
    to: string,
    type: "image" | "video" | "audio" | "document" | "sticker",
    media: MediaRef,
    opts?: { phoneNumberId?: string; replyToMessageId?: string },
  ) {
    const mediaObj: Record<string, unknown> = media.link ? { link: media.link } : { id: media.mediaId };
    if (media.caption) mediaObj.caption = media.caption;
    if (media.filename) mediaObj.filename = media.filename;

    return this.send({ to, type, [type]: mediaObj }, opts);
  }

  sendImage(to: string, media: MediaRef, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.sendMedia(to, "image", media, opts);
  }

  sendVideo(to: string, media: MediaRef, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.sendMedia(to, "video", media, opts);
  }

  sendAudio(to: string, media: MediaRef, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.sendMedia(to, "audio", media, opts);
  }

  sendDocument(to: string, media: MediaRef, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.sendMedia(to, "document", media, opts);
  }

  sendSticker(to: string, media: MediaRef, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.sendMedia(to, "sticker", media, opts);
  }

  sendLocation(to: string, location: LocationMessageOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "location",
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
        },
      },
      opts,
    );
  }

  /** Sends a body text + "Send location" button, prompting the user to share their current location. */
  sendLocationRequest(to: string, options: SendLocationRequestOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "location_request_message",
          body: { text: options.body },
          action: { name: "send_location" },
        },
      },
      opts,
    );
  }

  sendContacts(to: string, contacts: ContactMessageEntry[], opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "contacts",
        contacts: contacts.map((c) => ({
          name: {
            formatted_name: c.name.formattedName,
            first_name: c.name.firstName,
            last_name: c.name.lastName,
          },
          phones: c.phones?.map((p) => ({ phone: p.phone, type: p.type, wa_id: p.waId })),
          emails: c.emails?.map((e) => ({ email: e.email, type: e.type })),
        })),
      },
      opts,
    );
  }

  sendInteractive(to: string, options: SendInteractiveOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    let interactive: Record<string, unknown>;

    if (options.type === "button") {
      interactive = {
        type: "button",
        header: options.header ? { type: "text", text: options.header } : undefined,
        body: { text: options.body },
        footer: options.footer ? { text: options.footer } : undefined,
        action: { buttons: options.buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) },
      };
    } else if (options.type === "list") {
      interactive = {
        type: "list",
        header: options.header ? { type: "text", text: options.header } : undefined,
        body: { text: options.body },
        footer: options.footer ? { text: options.footer } : undefined,
        action: {
          button: options.buttonText,
          sections: options.sections.map((s) => ({
            title: s.title,
            rows: s.rows.map((r) => ({ id: r.id, title: r.title, description: r.description })),
          })),
        },
      };
    } else {
      interactive = {
        type: "cta_url",
        header: options.header ? { type: "text", text: options.header } : undefined,
        body: { text: options.body },
        footer: options.footer ? { text: options.footer } : undefined,
        action: { name: "cta_url", parameters: { display_text: options.displayText, url: options.url } },
      };
    }

    return this.send({ to, type: "interactive", interactive }, opts);
  }

  sendFlow(to: string, options: SendFlowOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "flow",
          header: options.headerText ? { type: "text", text: options.headerText } : undefined,
          body: { text: options.bodyText },
          footer: options.footerText ? { text: options.footerText } : undefined,
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_id: options.flowId,
              flow_cta: options.cta,
              flow_action: options.flowActionPayload ? "navigate" : "navigate",
              flow_action_payload: options.flowActionPayload,
            },
          },
        },
      },
      opts,
    );
  }

  sendReaction(to: string, options: ReactionOptions, opts?: { phoneNumberId?: string }) {
    return this.send(
      { to, type: "reaction", reaction: { message_id: options.messageId, emoji: options.emoji } },
      opts,
    );
  }

  /** Sends a single product from a catalog (interactive "product" message). */
  sendProduct(to: string, options: SendProductOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "product",
          body: options.body ? { text: options.body } : undefined,
          footer: options.footer ? { text: options.footer } : undefined,
          action: {
            catalog_id: options.catalogId,
            product_retailer_id: options.productRetailerId,
          },
        },
      },
      opts,
    );
  }

  /** Sends up to 30 products across up to 10 sections from a catalog (multi-product message). */
  sendProductList(to: string, options: SendProductListOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "product_list",
          header: { type: "text", text: options.header },
          body: { text: options.body },
          footer: options.footer ? { text: options.footer } : undefined,
          action: {
            catalog_id: options.catalogId,
            sections: options.sections.map((s) => ({
              title: s.title,
              product_items: s.productRetailerIds.map((id) => ({ product_retailer_id: id })),
            })),
          },
        },
      },
      opts,
    );
  }

  /** Sends the entire connected catalog for the customer to browse (interactive "catalog_message"). */
  sendCatalog(to: string, options: SendCatalogOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "catalog_message",
          body: { text: options.body },
          footer: options.footer ? { text: options.footer } : undefined,
          action: {
            name: "catalog_message",
            parameters: options.thumbnailProductRetailerId
              ? { thumbnail_product_retailer_id: options.thumbnailProductRetailerId }
              : undefined,
          },
        },
      },
      opts,
    );
  }

  /** Sends 2–10 products from a catalog as a horizontally scrollable carousel (interactive "carousel" message, card type "product"). */
  sendProductCarousel(to: string, options: SendProductCarouselOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "carousel",
          body: { text: options.body },
          action: {
            cards: options.cards.map((card, cardIndex) => ({
              card_index: cardIndex,
              type: "product",
              action: { catalog_id: card.catalogId, product_retailer_id: card.productRetailerId },
            })),
          },
        },
      },
      opts,
    );
  }

  /** Sends 2–10 image/video cards, each with a URL button or quick-reply button(s) (interactive "carousel" message, card type "cta_url" | "button"). */
  sendMediaCarousel(to: string, options: SendMediaCarouselOptions, opts?: { phoneNumberId?: string; replyToMessageId?: string }) {
    return this.send(
      {
        to,
        type: "interactive",
        interactive: {
          type: "carousel",
          body: { text: options.body },
          action: {
            cards: options.cards.map((card, cardIndex) => {
              const header = card.headerMedia.link
                ? { type: card.headerType, [card.headerType]: { link: card.headerMedia.link } }
                : { type: card.headerType, [card.headerType]: { id: card.headerMedia.mediaId } };

              if (card.type === "cta_url") {
                return {
                  card_index: cardIndex,
                  type: "cta_url",
                  header,
                  body: card.body ? { text: card.body } : undefined,
                  action: { name: "cta_url", parameters: { display_text: card.displayText, url: card.url } },
                };
              }

              // Card-level "type" reuses the same enum as top-level interactive.type —
              // quick-reply buttons live under the "button" type, not "quick_reply"
              // (that name only applies to a button's *sub_type* elsewhere in the API).
              return {
                card_index: cardIndex,
                type: "cta_url",
                header,
                body: card.body ? { text: card.body } : undefined,
                action: { buttons: card.buttons.map((b) => ({ type: "quick_reply", quick_reply: { id: b.id, title: b.title } })) },
              };
            }),
          },
        },
      },
      opts,
    );
  }

  async markAsRead(messageId: string, opts?: { phoneNumberId?: string }): Promise<WhatsappResponse<{ success: boolean }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const res = await this.http.request<{ success: boolean }>({
      method: "POST",
      path: `/${phoneNumberId}/messages`,
      body: { messaging_product: "whatsapp", status: "read", message_id: messageId },
    });
    return res;
  }

  /** Convenience: reply to a specific inbound message with a text body (sets `context.message_id`). */
  reply(to: string, messageId: string, options: TextMessageOptions, opts?: { phoneNumberId?: string }) {
    return this.sendText(to, options, { ...opts, replyToMessageId: messageId });
  }
}
