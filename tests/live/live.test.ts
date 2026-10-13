/**
 * Live smoke tests against the real Graph API. Skipped unless credentials are set.
 *
 *   WA_TOKEN        access token (use a test/system-user token)
 *   WA_PHONE_ID     phone number ID
 *   WA_WABA_ID      WhatsApp Business Account ID (enables templates / phone number list)
 *   WA_TEST_TO      recipient phone number in international format (enables send tests; sends real messages)
 *   WA_TEST_BSUID   optional BSUID of a user who has messaged you (enables BSUID send test)
 *   WA_GROUP_TESTS  set to "1" to also hit the Groups API (needs Groups access)
 *   WA_API_VERSION  optional, e.g. v25.0
 *
 * Run:  npm run test:live
 * Read-only checks run with just the first two variables; nothing is created or deleted.
 */
import { describe, it, expect } from "vitest";
import { Whatsapp } from "../../src/index.js";

const env = process.env;
const enabled = Boolean(env.WA_TOKEN && env.WA_PHONE_ID);

const wa = enabled
  ? new Whatsapp({
      accessToken: env.WA_TOKEN!,
      phoneNumberId: env.WA_PHONE_ID!,
      businessAccountId: env.WA_WABA_ID,
      apiVersion: env.WA_API_VERSION,
    })
  : (undefined as unknown as Whatsapp);

function show(name: string, res: { error: unknown; status: number; raw: unknown }) {
  const err = res.error as { code?: number; message?: string } | null;
  console.log(`[live] ${name}: HTTP ${res.status}${err ? ` ERROR ${err.code} ${err.message}` : " ok"}`);
}

describe.skipIf(!enabled)("live: read-only", () => {
  it("phone number info", async () => {
    const res = await wa.phoneNumbers.get();
    show("phoneNumbers.get", res);
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe(env.WA_PHONE_ID);
  });
  it("business profile", async () => {
    const res = await wa.businessProfile.get();
    show("businessProfile.get", res);
    expect(res.error).toBeNull();
  });
  it("calling settings", async () => {
    const res = await wa.calls.getSettings();
    show("calls.getSettings", res);
    expect(res.error).toBeNull();
  });
  it("QR codes list", async () => {
    const res = await wa.qrCodes.list();
    show("qrCodes.list", res);
    expect(res.error).toBeNull();
  });
  it.skipIf(!env.WA_WABA_ID)("templates list + phone numbers of WABA", async () => {
    const t = await wa.templates.list({ limit: 5 } as any);
    show("templates.list", t);
    expect(t.error).toBeNull();
    const p = await wa.phoneNumbers.list();
    show("phoneNumbers.list", p);
    expect(p.error).toBeNull();
  });
  it("invalid token yields a normalised error, not a throw", async () => {
    const bad = new Whatsapp({ accessToken: "invalid", phoneNumberId: env.WA_PHONE_ID!, apiVersion: env.WA_API_VERSION });
    const res = await bad.phoneNumbers.get();
    expect(res.error).toBeTruthy();
    expect(res.error?.code).toBe(190);
  });
  it.skipIf(env.WA_GROUP_TESTS !== "1")("groups list", async () => {
    const res = await wa.groups.list();
    show("groups.list", res);
    expect(res.error).toBeNull();
  });
});

describe.skipIf(!enabled || !env.WA_TEST_TO)("live: sends (real messages!)", () => {
  const to = env.WA_TEST_TO!;
  it("template hello_world (works outside the 24h window)", async () => {
    const res = await wa.messages.sendTemplate(to, { name: "hello_world", language: "en_US" });
    show("sendTemplate", res);
    expect(res.error).toBeNull();
    expect(res.data?.messageId).toMatch(/^wamid\./);
  });
  it("text, location, reaction target, mark-read + typing (needs an open 24h window)", async () => {
    const text = await wa.messages.sendText(to, { body: "wapi-cloud live test" });
    show("sendText", text);
    if (text.error?.code === 131047) {
      console.log("[live] 24h window closed: reply to the test number from the recipient phone, then re-run.");
      return;
    }
    expect(text.error).toBeNull();
    const id = text.data!.messageId;
    const loc = await wa.messages.sendLocation(to, { latitude: 37.4, longitude: -122.1, name: "Test" });
    show("sendLocation", loc);
    expect(loc.error).toBeNull();
    const react = await wa.messages.sendReaction(to, { messageId: id, emoji: "👍" });
    show("sendReaction", react);
    const buttons = await wa.messages.sendInteractive(to, {
      type: "button",
      bodyText: "Pick one",
      buttons: [{ id: "a", title: "A" }],
    } as any);
    show("sendInteractive(button)", buttons);
    expect(buttons.error).toBeNull();
    const perm = await wa.messages.sendCallPermissionRequest(to, { bodyText: "May we call you?" });
    show("sendCallPermissionRequest", perm);
  });
  it("call permission state", async () => {
    const res = await wa.calls.getPermission(to);
    show("calls.getPermission", res);
  });
  it("marketing messages endpoint (uses a real MARKETING template if WA_MM_TEMPLATE is set)", async () => {
    if (!env.WA_MM_TEMPLATE) return;
    const res = await wa.messages.sendMarketingTemplate(to, {
      name: env.WA_MM_TEMPLATE,
      language: env.WA_MM_LANG ?? "en_US",
      productPolicy: "CLOUD_API_FALLBACK",
    });
    show("sendMarketingTemplate", res);
    expect(res.error).toBeNull();
  });
});

describe.skipIf(!enabled || !env.WA_TEST_BSUID)("live: BSUID", () => {
  it("send text to a BSUID", async () => {
    const res = await wa.messages.sendText(env.WA_TEST_BSUID!, { body: "BSUID test" });
    show("sendText(BSUID)", res);
    expect(res.error).toBeNull();
    expect(res.data?.userId).toBeTruthy();
  });
});
