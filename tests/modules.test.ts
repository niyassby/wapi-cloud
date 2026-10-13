import { describe, it, expect, vi } from "vitest";
import { Whatsapp } from "../src/index.js";

interface Call {
  url: string;
  method: string;
  body: any;
  rawBody: any;
  headers: Record<string, string>;
}

function setup(responder: (c: Call) => { status?: number; body?: unknown; bytes?: Uint8Array } = () => ({ body: {} })) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: any) => {
    const isJson = typeof init.body === "string";
    const call: Call = {
      url,
      method: init.method,
      body: isJson ? JSON.parse(init.body) : undefined,
      rawBody: init.body,
      headers: init.headers ?? {},
    };
    calls.push(call);
    const r = responder(call);
    if (r.bytes) return new Response(r.bytes, { status: r.status ?? 200 });
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  });
  const wa = new Whatsapp({
    accessToken: "tok",
    phoneNumberId: "111",
    businessAccountId: "222",
    businessId: "333",
    appId: "app",
    appSecret: "secret",
    fetch: fn as unknown as typeof fetch,
    maxRetries: 0,
  });
  return { wa, calls };
}

const route = (c: Call) => `${c.method} ${new URL(c.url).pathname.replace(/^\/v[\d.]+/, "")}`;
const SEND_OK = { messaging_product: "whatsapp", contacts: [{ input: "1", wa_id: "1" }], messages: [{ id: "wamid.1" }] };

describe("auth + config", () => {
  it("sends bearer token, versioned URL, and supports setAccessToken", async () => {
    const { wa, calls } = setup();
    await wa.phoneNumbers.get();
    wa.setAccessToken("new");
    await wa.phoneNumbers.get();
    expect(calls[0].url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/111$/);
    expect((calls[0].headers as any).Authorization).toBe("Bearer tok");
    expect((calls[1].headers as any).Authorization).toBe("Bearer new");
  });
  it("constructor validates required config", () => {
    expect(() => new Whatsapp({ accessToken: "", phoneNumberId: "1" })).toThrow();
    expect(() => new Whatsapp({ accessToken: "a", phoneNumberId: "" })).toThrow();
  });
  it("returns WhatsappApiError with code + hint for Graph errors", async () => {
    const { wa } = setup(() => ({ status: 400, body: { error: { message: "bad", code: 131047, type: "OAuthException", fbtrace_id: "t" } } }));
    const res = await wa.send("1555", { body: "x" });
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe(131047);
    expect(res.error?.fbtraceId).toBe("t");
    expect(res.error?.message).toContain("24-hour");
  });
  it("shortcut send/sendTemplate work", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    const a = await wa.send("1555", { body: "hi" });
    await wa.sendTemplate("1555", { name: "hello_world", language: "en_US" });
    expect(a.data?.messageId).toBe("wamid.1");
    expect(calls[1].body.template.name).toBe("hello_world");
  });
});

describe("message types", () => {
  it("builds payloads for every simple type", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    const m = wa.messages;
    await m.sendText("1", { body: "t", previewUrl: true });
    await m.sendImage("1", { link: "https://x/i.png", caption: "c" });
    await m.sendVideo("1", { mediaId: "vid", caption: "c" });
    await m.sendAudio("1", { mediaId: "aud" });
    await m.sendDocument("1", { link: "https://x/d.pdf", filename: "d.pdf", caption: "c" });
    await m.sendSticker("1", { mediaId: "stk" });
    await m.sendLocation("1", { latitude: 1, longitude: 2, name: "n", address: "a" });
    await m.sendContacts("1", [{ name: { formattedName: "A B", firstName: "A" }, phones: [{ phone: "+1555", type: "WORK" }] }]);
    await m.sendReaction("1", { messageId: "wamid.x", emoji: "👍" });
    await m.reply("1", "wamid.q", { body: "re" });
    await m.sendLocationRequest("1", { body: "where?" });
    const types = calls.map((c) => c.body.type);
    expect(types).toEqual(["text", "image", "video", "audio", "document", "sticker", "location", "contacts", "reaction", "text", "interactive"]);
    expect(calls[0].body.text).toEqual({ body: "t", preview_url: true });
    expect(calls[1].body.image).toEqual({ link: "https://x/i.png", caption: "c" });
    expect(calls[2].body.video).toEqual({ id: "vid", caption: "c" });
    expect(calls[4].body.document).toEqual({ link: "https://x/d.pdf", caption: "c", filename: "d.pdf" });
    expect(calls[6].body.location).toMatchObject({ latitude: 1, longitude: 2, name: "n", address: "a" });
    expect(calls[8].body.reaction).toMatchObject({ message_id: "wamid.x", emoji: "👍" });
    expect(calls[9].body.context).toEqual({ message_id: "wamid.q" });
    expect(calls[10].body.interactive.type).toBe("location_request_message");
    for (const c of calls) {
      expect(route(c)).toBe("POST /111/messages");
      expect(c.body.messaging_product).toBe("whatsapp");
    }
  });
  it("sendInteractive: buttons, list, cta_url", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    await wa.messages.sendInteractive("1", {
      type: "button",
      bodyText: "pick",
      buttons: [{ id: "a", title: "A" }, { id: "b", title: "B" }],
    } as any);
    await wa.messages.sendInteractive("1", {
      type: "list",
      bodyText: "pick",
      buttonText: "Open",
      sections: [{ title: "S", rows: [{ id: "r1", title: "R1" }] }],
    } as any);
    await wa.messages.sendInteractive("1", { type: "cta_url", bodyText: "go", displayText: "Site", url: "https://x" } as any);
    expect(calls[0].body.interactive.type).toBe("button");
    expect(calls[0].body.interactive.action.buttons).toHaveLength(2);
    expect(calls[1].body.interactive.type).toBe("list");
    expect(calls[1].body.interactive.action.sections[0].rows[0].id).toBe("r1");
    expect(calls[2].body.interactive.type).toBe("cta_url");
    expect(calls[2].body.interactive.action.parameters.url).toBe("https://x");
  });
  it("commerce messages: product, product list, catalog", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    await wa.messages.sendProduct("1", { catalogId: "c", productRetailerId: "p", body: "b" });
    await wa.messages.sendProductList("1", {
      catalogId: "c",
      header: "h",
      body: "b",
      sections: [{ title: "s", productRetailerIds: ["p1", "p2"] }],
    } as any);
    await wa.messages.sendCatalog("1", { body: "b", thumbnailProductRetailerId: "p" });
    expect(calls[0].body.interactive.type).toBe("product");
    expect(calls[1].body.interactive.type).toBe("product_list");
    expect(calls[2].body.interactive.type).toBe("catalog_message");
  });
  it("template with components + flow button helper", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    const { templateFlowButton } = await import("../src/index.js");
    await wa.messages.sendTemplate("1", {
      name: "t",
      language: "en_US",
      components: [{ type: "body", parameters: [{ type: "text", text: "Ann" }] }, templateFlowButton(0, "tok")],
    }, { replyToMessageId: "wamid.q", bizOpaqueCallbackData: "cb" });
    expect(calls[0].body.template.components[1]).toMatchObject({ sub_type: "flow", parameters: [{ type: "action", action: { flow_token: "tok" } }] });
    expect(calls[0].body.context).toEqual({ message_id: "wamid.q" });
    expect(calls[0].body.biz_opaque_callback_data).toBe("cb");
  });
  it("phoneNumberId override changes the path", async () => {
    const { wa, calls } = setup(() => ({ body: SEND_OK }));
    await wa.messages.sendText("1", { body: "x" }, { phoneNumberId: "999" });
    expect(route(calls[0])).toBe("POST /999/messages");
  });
});

describe("templates", () => {
  it("create / get / update / delete / list", async () => {
    const { wa, calls } = setup(() => ({ body: { data: [], paging: {} } }));
    await wa.templates.create({ name: "n", category: "UTILITY", language: "en_US", components: [{ type: "BODY", text: "hi" }] } as any);
    await wa.templates.get("T1");
    await wa.templates.update("T1", { components: [] } as any);
    await wa.templates.delete("n");
    await wa.templates.list({ limit: 5 } as any);
    expect(calls.map(route)).toEqual([
      "POST /222/message_templates",
      "GET /T1",
      "POST /T1",
      "DELETE /222/message_templates",
      "GET /222/message_templates",
    ]);
    expect(new URL(calls[3].url).searchParams.get("name")).toBe("n");
  });
  it("listAll paginates across pages", async () => {
    let n = 0;
    const { wa } = setup(() => {
      n++;
      return n === 1
        ? { body: { data: [{ id: "1" }, { id: "2" }], paging: { cursors: { after: "A" }, next: "http://next" } } }
        : { body: { data: [{ id: "3" }], paging: { cursors: { after: "B" } } } };
    });
    const ids: string[] = [];
    for await (const t of wa.templates.listAll()) ids.push((t as any).id);
    expect(ids).toEqual(["1", "2", "3"]);
  });
  it("returns ConfigError instead of throwing without businessAccountId", async () => {
    const wa = new Whatsapp({ accessToken: "t", phoneNumberId: "1", fetch: vi.fn() as any });
    const res = await wa.templates.create({ name: "n", category: "UTILITY", language: "en", components: [] } as any);
    expect(res.error?.type).toBe("ConfigError");
  });
});

describe("media", () => {
  it("upload sends multipart form; get/delete use media id", async () => {
    const { wa, calls } = setup(() => ({ body: { id: "M1" } }));
    const up = await wa.media.upload(Buffer.from("abc"), { type: "image/png", filename: "a.png" });
    await wa.media.get("M1");
    await wa.media.delete("M1");
    expect(up.data?.id).toBe("M1");
    expect(route(calls[0])).toBe("POST /111/media");
    expect(calls[0].rawBody).toBeInstanceOf(FormData);
    expect((calls[0].headers as any)["Content-Type"]).toBeUndefined();
    expect((calls[0].rawBody as FormData).get("type")).toBe("image/png");
    expect(calls.slice(1).map(route)).toEqual(["GET /M1", "DELETE /M1"]);
  });
  it("download resolves temp URL through the configured fetch with auth", async () => {
    const { wa, calls } = setup((c) =>
      c.url.includes("lookaside") ? { bytes: new Uint8Array([1, 2, 3]) } : { body: { url: "https://lookaside.example/file", mime_type: "image/png" } },
    );
    const res = await wa.media.download("M1");
    expect(new Uint8Array(res.data!)).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls).toHaveLength(2);
    expect((calls[1].headers as any).Authorization).toBe("Bearer tok");
  });
});

describe("account management", () => {
  it("phone numbers", async () => {
    const { wa, calls } = setup();
    await wa.phoneNumbers.list();
    await wa.phoneNumbers.get("P2");
    await wa.phoneNumbers.register({ pin: "123456" });
    await wa.phoneNumbers.deregister();
    await wa.phoneNumbers.requestVerificationCode({ codeMethod: "SMS" } as any);
    await wa.phoneNumbers.verifyCode({ code: "000000" });
    await wa.phoneNumbers.updateSettings({ calling: { status: "ENABLED" } });
    expect(calls.map(route)).toEqual([
      "GET /222/phone_numbers",
      "GET /P2",
      "POST /111/register",
      "POST /111/deregister",
      "POST /111/request_code",
      "POST /111/verify_code",
      "POST /111/settings",
    ]);
    expect(calls[2].body).toMatchObject({ messaging_product: "whatsapp", pin: "123456" });
  });
  it("business profile, two-step verification, commerce settings, QR codes", async () => {
    const { wa, calls } = setup(() => ({ body: { data: [{}] } }));
    await wa.businessProfile.get();
    await wa.businessProfile.update({ about: "hi" } as any);
    await wa.twoStepVerification.set({ pin: "123456" });
    await wa.commerceSettings.get();
    await wa.commerceSettings.update({ isCartEnabled: true } as any);
    await wa.qrCodes.create({ prefilledMessage: "hello" });
    await wa.qrCodes.list();
    await wa.qrCodes.get("Q1");
    await wa.qrCodes.update("Q1", { prefilledMessage: "x" } as any);
    await wa.qrCodes.delete("Q1");
    expect(calls.map(route)).toEqual([
      "GET /111/whatsapp_business_profile",
      "POST /111/whatsapp_business_profile",
      "POST /111",
      "GET /111/whatsapp_commerce_settings",
      "POST /111/whatsapp_commerce_settings",
      "POST /111/message_qrdls",
      "GET /111/message_qrdls",
      "GET /111/message_qrdls/Q1",
      "POST /111/message_qrdls/Q1",
      "DELETE /111/message_qrdls/Q1",
    ]);
    expect(calls[2].body).toEqual({ pin: "123456" });
    expect(calls[5].body.prefilled_message).toBe("hello");
  });
  it("block / unblock users", async () => {
    const { wa, calls } = setup(() => ({ body: { data: [] } }));
    await wa.contacts.block(["1555"]);
    await wa.contacts.unblock(["1555"]);
    await wa.contacts.listBlocked();
    expect(calls.map(route)).toEqual(["POST /111/block_users", "DELETE /111/block_users", "GET /111/block_users"]);
    expect(calls[0].body.block_users).toEqual([{ user: "1555" }]);
  });
  it("analytics queries WABA fields", async () => {
    const { wa, calls } = setup();
    await wa.analytics.getMessagingAnalytics({ start: new Date(1_700_000_000_000), end: 1_700_086_400 });
    await wa.analytics.getConversationAnalytics({ start: 1, end: 2 });
    await wa.analytics.getPricingAnalytics({ start: 1, end: 2 });
    const fields = calls.map((c) => new URL(c.url).searchParams.get("fields") ?? "");
    expect(fields[0]).toContain("analytics");
    expect(fields[0]).toContain("start(1700000000)");
    expect(fields[1]).toContain("conversation_analytics");
    expect(fields[2]).toContain("pricing_analytics");
  });
});

describe("flows", () => {
  it("full lifecycle", async () => {
    const { wa, calls } = setup(() => ({ body: { id: "F1", data: [] } }));
    await wa.flows.create({ name: "f", categories: ["LEAD_GENERATION"] as any, flowJson: { version: "7.0" } });
    await wa.flows.updateJson("F1", { version: "7.0", screens: [] });
    await wa.flows.publish("F1");
    await wa.flows.deprecate("F1");
    await wa.flows.get("F1");
    await wa.flows.list();
    await wa.flows.delete("F1");
    expect(calls.map(route)).toEqual([
      "POST /222/flows",
      "POST /F1/assets",
      "POST /F1/publish",
      "POST /F1/deprecate",
      "GET /F1",
      "GET /222/flows",
      "DELETE /F1",
    ]);
    expect(typeof calls[0].body.flow_json).toBe("string");
    expect(calls[1].rawBody).toBeInstanceOf(FormData);
  });
});

describe("catalog + products", () => {
  it("catalogs and products CRUD", async () => {
    const { wa, calls } = setup(() => ({ body: { data: [], id: "x" } }));
    await wa.catalogs.list();
    await wa.catalogs.get("C1");
    await wa.catalogs.listConnectedToWaba("222");
    await wa.products.list("C1");
    await wa.products.get("P1");
    await wa.products.create("C1", { retailerId: "sku", name: "N", price: 1000, currency: "USD", imageUrl: "https://x/i.png" });
    await wa.products.update("P1", { name: "N2" } as any);
    await wa.products.delete("P1");
    expect(calls.map(route)).toEqual([
      "GET /333/owned_product_catalogs",
      "GET /C1",
      "GET /222/product_catalogs",
      "GET /C1/products",
      "GET /P1",
      "POST /C1/products",
      "POST /P1",
      "DELETE /P1",
    ]);
    expect(calls[5].body).toMatchObject({ retailer_id: "sku", name: "N", currency: "USD" });
  });
});

describe("embedded signup", () => {
  it("exchanges code, subscribes WABA, generates script", async () => {
    const { wa, calls } = setup((c) => (c.url.includes("oauth") ? { body: { access_token: "AT", token_type: "bearer" } } : { body: { success: true } }));
    const ex = await wa.embeddedSignup.exchangeCodeForToken("CODE");
    expect(ex.data).toEqual({ accessToken: "AT", tokenType: "bearer" });
    await wa.embeddedSignup.subscribeToWaba("W9", { accessTokenOverride: "AT" } as any);
    expect(route(calls[1])).toBe("POST /W9/subscribed_apps");
    const script = wa.embeddedSignup.getLoginScript({ configId: "cfg" } as any);
    expect(script).toContain("FB.login");
    expect(script).toContain("cfg");
  });
});
