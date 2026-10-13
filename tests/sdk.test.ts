import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { Whatsapp } from "../src/index.js";
import { parse } from "../src/webhooks/parser.js";
import { verifySignature, verifyHandshake } from "../src/webhooks/verify.js";

type Call = { url: string; method: string; body: any; headers: Record<string, string> };

function mockFetch(responses: Array<{ status?: number; body?: unknown; text?: string; headers?: Record<string, string>; throws?: Error }>) {
  const calls: Call[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string, init: any) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r.throws) throw r.throws;
    const status = r.status ?? 200;
    return new Response(r.text ?? JSON.stringify(r.body ?? {}), { status, headers: r.headers });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

function client(responses: Parameters<typeof mockFetch>[0], extra: Record<string, unknown> = {}) {
  const m = mockFetch(responses);
  const wa = new Whatsapp({
    accessToken: "tok",
    phoneNumberId: "111",
    appSecret: "secret",
    fetch: m.fn,
    maxRetries: 2,
    ...extra,
  });
  return { wa, calls: m.calls };
}

const OK_SEND = { body: { messaging_product: "whatsapp", contacts: [{ input: "1", wa_id: "1" }], messages: [{ id: "wamid.1" }] } };

describe("typing indicator", () => {
  it("markAsRead sends read status only by default", async () => {
    const { wa, calls } = client([{ body: { success: true } }]);
    await wa.messages.markAsRead("wamid.X");
    expect(calls[0].url).toContain("/111/messages");
    expect(calls[0].body).toEqual({ messaging_product: "whatsapp", status: "read", message_id: "wamid.X" });
  });
  it("showTyping adds typing_indicator", async () => {
    const { wa, calls } = client([{ body: { success: true } }]);
    await wa.messages.showTyping("wamid.X");
    expect(calls[0].body).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.X",
      typing_indicator: { type: "text" },
    });
  });
});

describe("BSUID sending", () => {
  it("uses `recipient` for a BSUID and returns userId", async () => {
    const { wa, calls } = client([
      { body: { messaging_product: "whatsapp", contacts: [{ input: "US.123", user_id: "US.123" }], messages: [{ id: "wamid.1" }] } },
    ]);
    const res = await wa.messages.sendText("US.13491208655302741918", { body: "hi" });
    expect(calls[0].body.recipient).toBe("US.13491208655302741918");
    expect(calls[0].body.to).toBeUndefined();
    expect(res.data?.userId).toBe("US.123");
    expect(res.data?.waId).toBe("");
  });
  it("parent BSUID with extra segment is detected", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendText("US.ENT.13491208655302741918", { body: "hi" });
    expect(calls[0].body.recipient).toBe("US.ENT.13491208655302741918");
  });
  it("phone numbers stay in `to`", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendText("15551234567", { body: "hi" });
    expect(calls[0].body.to).toBe("15551234567");
    expect(calls[0].body.recipient).toBeUndefined();
  });
});

describe("Marketing Messages", () => {
  it("posts to /marketing_messages with policy fields", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendMarketingTemplate("15551234567", {
      name: "sale",
      language: "en_US",
      productPolicy: "STRICT",
      messageActivitySharing: false,
    });
    expect(calls[0].url).toContain("/111/marketing_messages");
    expect(calls[0].body).toMatchObject({
      type: "template",
      template: { name: "sale", language: { code: "en_US" } },
      product_policy: "STRICT",
      message_activity_sharing: false,
    });
  });
});

describe("Groups", () => {
  it("sends group messages with recipient_type=group", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendText("GROUPID", { body: "yo" }, { recipientType: "group" });
    expect(calls[0].body.recipient_type).toBe("group");
    expect(calls[0].body.to).toBe("GROUPID");
  });
  it("create / get / invite / join requests / remove participants hit the right routes", async () => {
    const { wa, calls } = client([{ body: {} }]);
    await wa.groups.create({ subject: "S", description: "D", joinApprovalMode: "approval_required" });
    await wa.groups.get("G1", ["subject", "participants"]);
    await wa.groups.getInviteLink("G1");
    await wa.groups.resetInviteLink("G1");
    await wa.groups.approveJoinRequests("G1", ["a", "b"]);
    await wa.groups.rejectJoinRequests("G1", ["c"]);
    await wa.groups.removeParticipants("G1", ["1555"]);
    await wa.groups.delete("G1");
    const summary = calls.map((c) => `${c.method} ${new URL(c.url).pathname.replace(/^\/v[\d.]+/, "")}${new URL(c.url).search}`);
    expect(summary).toEqual([
      "POST /111/groups",
      "GET /G1?fields=subject%2Cparticipants",
      "GET /G1/invite_link",
      "POST /G1/invite_link",
      "POST /G1/join_requests",
      "DELETE /G1/join_requests",
      "DELETE /G1/participants",
      "DELETE /G1",
    ]);
    expect(calls[0].body).toMatchObject({ subject: "S", description: "D", join_approval_mode: "approval_required" });
    expect(calls[4].body.join_requests).toEqual(["a", "b"]);
    expect(calls[6].body.participants).toEqual([{ user: "1555" }]);
  });
});

describe("Calling", () => {
  it("call actions post to /calls", async () => {
    const { wa, calls } = client([{ body: { success: true } }]);
    await wa.calls.preAccept("c1", { sdpType: "answer", sdp: "SDP" });
    await wa.calls.accept("c1", { sdpType: "answer", sdp: "SDP" }, { bizOpaqueCallbackData: "x" });
    await wa.calls.reject("c2");
    await wa.calls.terminate("c3");
    expect(calls.map((c) => c.body.action)).toEqual(["pre_accept", "accept", "reject", "terminate"]);
    expect(calls[0].url).toContain("/111/calls");
    expect(calls[0].body.session).toEqual({ sdp_type: "answer", sdp: "SDP" });
    expect(calls[1].body.biz_opaque_callback_data).toBe("x");
  });
  it("connect uses `to` for phone and `recipient` for BSUID", async () => {
    const { wa, calls } = client([{ body: { calls: [{ id: "c" }] } }]);
    await wa.calls.connect("15551234567", { sdp: "S" });
    await wa.calls.connect("US.999", { sdp: "S" });
    expect(calls[0].body).toMatchObject({ to: "15551234567", action: "connect", session: { sdp_type: "offer", sdp: "S" } });
    expect(calls[1].body.recipient).toBe("US.999");
    expect(calls[1].body.to).toBeUndefined();
  });
  it("permissions query uses user_wa_id or recipient", async () => {
    const { wa, calls } = client([{ body: {} }]);
    await wa.calls.getPermission("15551234567");
    await wa.calls.getPermission("US.999");
    expect(new URL(calls[0].url).searchParams.get("user_wa_id")).toBe("15551234567");
    expect(new URL(calls[1].url).searchParams.get("recipient")).toBe("US.999");
  });
  it("settings read/write", async () => {
    const { wa, calls } = client([{ body: { calling: { status: "ENABLED" } } }, { body: { success: true } }]);
    const got = await wa.calls.getSettings();
    expect(got.data).toEqual({ status: "ENABLED" });
    await wa.calls.updateSettings({ status: "DISABLED" });
    expect(calls[1].body).toEqual({ calling: { status: "DISABLED" } });
  });
  it("call permission request message", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendCallPermissionRequest("1555", { bodyText: "Can we call?" });
    expect(calls[0].body.interactive).toMatchObject({ type: "call_permission_request", action: { name: "call_permission_request" } });
  });
});

describe("HTTP behaviour", () => {
  it("does not retry POST after a network error (no duplicate sends)", async () => {
    const { wa, calls } = client([{ throws: new Error("boom") }]);
    const res = await wa.messages.sendText("1555", { body: "x" });
    expect(res.error).toBeTruthy();
    expect(calls).toHaveLength(1);
  });
  it("does not retry POST on 500", async () => {
    const { wa, calls } = client([{ status: 500, body: { error: { message: "x", code: 1 } } }]);
    await wa.messages.sendText("1555", { body: "x" });
    expect(calls).toHaveLength(1);
  });
  it("retries POST on Graph rate-limit code even with HTTP 400", async () => {
    const { wa, calls } = client([
      { status: 400, body: { error: { message: "rl", code: 130429 } }, headers: { "retry-after": "0" } },
      OK_SEND,
    ]);
    const res = await wa.messages.sendText("1555", { body: "x" });
    expect(calls).toHaveLength(2);
    expect(res.error).toBeNull();
  });
  it("retries GET on 500", async () => {
    const { wa, calls } = client([{ status: 500, body: {} }, { body: { id: "G1" } }]);
    const res = await wa.groups.get("G1");
    expect(calls).toHaveLength(2);
    expect(res.data?.id).toBe("G1");
  }, 10000);
  it("returns an error for a non-JSON 200 body", async () => {
    const { wa } = client([{ text: "<html>" }]);
    const res = await wa.messages.sendText("1555", { body: "x" });
    expect(res.data).toBeNull();
    expect(res.error?.type).toBe("InvalidResponse");
  });
  it("redacts secrets in onRequest hook URLs", async () => {
    const seen: string[] = [];
    const { wa } = client([{ body: { access_token: "t", token_type: "bearer" } }], { onRequest: (r: { url: string }) => seen.push(r.url), appId: "app" });
    await wa.embeddedSignup.exchangeCodeForToken("CODE123");
    expect(seen[0]).toContain("client_secret=REDACTED");
    expect(seen[0]).not.toContain("CODE123");
  });
  it("sendFlow supports data_exchange and media validation rejects empty refs", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendFlow("1555", { flowId: "f", cta: "Go", bodyText: "b", flowAction: "data_exchange", flowToken: "T", mode: "draft" });
    expect(calls[0].body.interactive.action.parameters).toMatchObject({ flow_action: "data_exchange", flow_token: "T", mode: "draft" });
    const bad = await wa.messages.sendImage("1555", {});
    expect(bad.error?.type).toBe("ValidationError");
    expect(calls).toHaveLength(1);
  });
  it("only sends caption on image/video/document", async () => {
    const { wa, calls } = client([OK_SEND]);
    await wa.messages.sendAudio("1555", { link: "https://x/a.mp3", caption: "no" });
    expect(calls[0].body.audio).toEqual({ link: "https://x/a.mp3" });
  });
});

describe("Webhooks", () => {
  const sign = (body: string) => "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");

  it("verifies signature, rejects bad / non-raw input without throwing", () => {
    const body = '{"a":1}';
    expect(verifySignature({ payload: body, signatureHeader: sign(body), appSecret: "secret" })).toBe(true);
    expect(verifySignature({ payload: body, signatureHeader: "sha256=00", appSecret: "secret" })).toBe(false);
    expect(verifySignature({ payload: { a: 1 } as any, signatureHeader: sign(body), appSecret: "secret" })).toBe(false);
  });
  it("handshake is checked", () => {
    expect(verifyHandshake({ mode: "subscribe", token: "t", challenge: "c", expectedToken: "t" })).toBe("c");
    expect(() => verifyHandshake({ mode: "subscribe", token: "x", challenge: "c", expectedToken: "t" })).toThrow();
    expect(() => verifyHandshake({ mode: "subscribe", token: undefined, challenge: "c", expectedToken: "t" })).toThrow();
  });

  const wrap = (field: string, value: any) => ({ object: "whatsapp_business_account", entry: [{ id: "w", changes: [{ field, value }] }] });
  const meta = { display_phone_number: "1", phone_number_id: "111" };

  it("parses a BSUID-only sender with profile + context", () => {
    const [ev] = parse(
      wrap("messages", {
        metadata: meta,
        contacts: [{ user_id: "US.1", parent_user_id: "US.ENT.1", profile: { name: "Ann", username: "@ann" } }],
        messages: [{ from_user_id: "US.1", from_parent_user_id: "US.ENT.1", id: "m", timestamp: "1", type: "text", text: { body: "hi" }, context: { id: "p", forwarded: true } }],
      }),
    ) as any;
    expect(ev).toMatchObject({
      type: "message",
      messageType: "text",
      from: undefined,
      userId: "US.1",
      parentUserId: "US.ENT.1",
      username: "@ann",
      sender: "US.1",
      profileName: "Ann",
      context: { id: "p", forwarded: true },
    });
  });
  it("parses phone sender, interactive replies and flow responses", () => {
    const evs = parse(
      wrap("messages", {
        metadata: meta,
        contacts: [{ wa_id: "1555", profile: { name: "Bob" } }],
        messages: [
          { from: "1555", id: "1", timestamp: "1", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "b", title: "Yes" } } },
          { from: "1555", id: "2", timestamp: "1", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "l", title: "T", description: "D" } } },
          { from: "1555", id: "3", timestamp: "1", type: "interactive", interactive: { type: "nfm_reply", nfm_reply: { name: "flow", response_json: '{"x":1}' } } },
          { from: "1555", id: "4", timestamp: "1", type: "order", order: { catalog_id: "c", product_items: [{ product_retailer_id: "p", quantity: 2, item_price: 5, currency: "USD" }] } },
        ],
      }),
    ) as any[];
    expect(evs[0]).toMatchObject({ sender: "1555", profileName: "Bob", reply: { kind: "button_reply", id: "b", title: "Yes" } });
    expect(evs[1].reply).toEqual({ kind: "list_reply", id: "l", title: "T", description: "D" });
    expect(evs[2].reply).toMatchObject({ kind: "nfm_reply", responseJson: { x: 1 } });
    expect(evs[3].order.productItems[0]).toEqual({ productRetailerId: "p", quantity: 2, itemPrice: 5, currency: "USD" });
  });
  it("parses statuses with BSUID, pricing and callback data", () => {
    const [ev] = parse(
      wrap("messages", {
        metadata: meta,
        statuses: [{ id: "m", status: "delivered", timestamp: "1", recipient_user_id: "US.1", biz_opaque_callback_data: "cb", pricing: { billable: true, pricing_model: "PMP", category: "marketing" }, conversation: { id: "cv" } }],
      }),
    ) as any;
    expect(ev).toMatchObject({ type: "status", recipientUserId: "US.1", bizOpaqueCallbackData: "cb", pricing: { billable: true, pricingModel: "PMP", category: "marketing" }, conversation: { id: "cv" } });
  });
  it("keeps system user_changed_user_id message", () => {
    const [ev] = parse(
      wrap("messages", { metadata: meta, messages: [{ from: "1", id: "s", timestamp: "1", type: "system", system: { type: "user_changed_user_id", user_id: "US.2" } }] }),
    ) as any;
    expect(ev.messageType).toBe("system");
    expect(ev.system.user_id).toBe("US.2");
  });
  it("emits call, group_update, account_alert and unknown_field events", () => {
    const [call] = parse(wrap("calls", { metadata: meta, calls: [{ id: "c1", event: "connect", direction: "USER_INITIATED", from: "1555", session: { sdp_type: "offer", sdp: "S" } }] })) as any;
    expect(call).toMatchObject({ type: "call", callId: "c1", event: "connect", from: "1555" });
    expect((parse(wrap("group_lifecycle_update", { x: 1 }))[0] as any).type).toBe("group_update");
    expect((parse(wrap("account_update", {}))[0] as any).type).toBe("account_alert");
    expect((parse(wrap("flows", {}))[0] as any).type).toBe("unknown_field");
  });
  it("emit isolates throwing and rejecting listeners", async () => {
    const { wa } = client([{}]);
    const good = vi.fn();
    const errs: unknown[] = [];
    wa.webhooks.onListenerError = (e) => errs.push(e);
    wa.webhooks.on("status", () => {
      throw new Error("sync");
    });
    wa.webhooks.on("status", async () => {
      throw new Error("async");
    });
    wa.webhooks.on("status", good);
    wa.webhooks.emit({ type: "status", messageId: "m", status: "sent", timestamp: "1", phoneNumberId: "1" });
    await new Promise((r) => setTimeout(r, 10));
    expect(good).toHaveBeenCalled();
    expect(errs).toHaveLength(2);
  });
  it("handleExpress: acks 200 before listeners, 401 on bad signature, 400 on parsed body", async () => {
    const { wa } = client([{}]);
    const routes: Record<string, any> = {};
    wa.webhooks.handleExpress({ get: (p: string, h: any) => (routes["GET"] = h), post: (p: string, h: any) => (routes["POST"] = h) }, "/wh", { verifyToken: "t" });
    const mkRes = () => {
      const r: any = { code: 0 };
      r.sendStatus = (c: number) => (r.code = c);
      r.status = (c: number) => ((r.code = c), r);
      r.send = () => r;
      return r;
    };
    const payload = JSON.stringify(wrap("messages", { metadata: meta, statuses: [{ id: "m", status: "sent", timestamp: "1", recipient_id: "1" }] }));
    const order: string[] = [];
    wa.webhooks.on("status", () => order.push("listener"));
    const res = mkRes();
    const origSend = res.sendStatus;
    res.sendStatus = (c: number) => (order.push("ack"), origSend(c));
    routes.POST({ body: Buffer.from(payload), headers: { "x-hub-signature-256": sign(payload) } }, res);
    expect(res.code).toBe(200);
    expect(order).toEqual(["ack", "listener"]);

    const bad = mkRes();
    routes.POST({ body: Buffer.from(payload), headers: { "x-hub-signature-256": "sha256=00" } }, bad);
    expect(bad.code).toBe(401);

    vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = mkRes();
    routes.POST({ body: { already: "parsed" }, headers: {} }, parsed);
    expect(parsed.code).toBe(400);

    const g = mkRes();
    routes.GET({ query: { "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "c" } }, g);
    expect(g.code).toBe(403);
  });
});
