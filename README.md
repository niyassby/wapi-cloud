# wacloud-sdk

A Supabase/Firebase-style SDK for the WhatsApp Cloud API (Meta Graph API).

```bash
npm install wacloud-sdk
```

## Quick start

```typescript
import { Whatsapp } from "wacloud-sdk";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  businessAccountId: process.env.WA_WABA_ID!, // needed for templates/flows/QR/analytics
  appSecret: process.env.WA_APP_SECRET!,      // needed for webhook signature verification
});
```

## Every call returns `{ data, error }`

No `try/catch` needed for expected API failures — every SDK method resolves,
never throws, and gives you a Supabase-style result object:

```typescript
const { data: templates, error } = await whatsapp.templates.list();

if (error) {
  console.error(error.code, error.type, error.message);
  // error.isRetryable, error.raw, error.fbtraceId also available
} else {
  console.log(templates.items);
}
```

`data` and `error` are mutually exclusive — TypeScript narrows correctly once
you check `error`. Every response also carries `status`, `statusText`, and
`raw` (the untouched Graph API JSON) as an escape hatch.

Config-only failures (e.g. calling `whatsapp.templates.list()` without a
`businessAccountId` in the constructor) also come back as `{ data: null, error }`
rather than throwing, so the pattern is consistent everywhere.

## Sending messages

```typescript
await whatsapp.messages.sendText("15551234567", { body: "Hello!" });

await whatsapp.messages.sendTemplate("15551234567", {
  name: "order_confirmation",
  language: "en_US",
  components: [{ type: "body", parameters: [{ type: "text", text: "Jordan" }] }],
});

await whatsapp.messages.sendImage("15551234567", { link: "https://example.com/photo.jpg" });

await whatsapp.messages.sendInteractive("15551234567", {
  type: "button",
  body: "Pick one:",
  buttons: [{ id: "yes", title: "Yes" }, { id: "no", title: "No" }],
});
```

Root-level sugar for the two most common sends:

```typescript
await whatsapp.send("15551234567", { body: "Hello!" });
await whatsapp.sendTemplate("15551234567", { name: "...", language: "en_US" });
```

## Templates, media, and account management

```typescript
const { data } = await whatsapp.templates.create({
  name: "order_confirmation",
  category: "UTILITY",
  language: "en_US",
  components: [{ type: "BODY", text: "Hi {{1}}, your order is confirmed." }],
});

for await (const template of whatsapp.templates.listAll()) {
  console.log(template.name); // auto-paginates
}

const { data: media } = await whatsapp.media.upload(fileBuffer, { type: "image/png" });
await whatsapp.messages.sendImage(to, { mediaId: media!.id });
```

See `src/modules/` for the full surface: `templates`, `media`, `contacts`,
`phoneNumbers`, `businessProfile`, `flows`, `qrCodes`, `analytics`,
`twoStepVerification`.

## Webhooks

```typescript
// Manual style
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!whatsapp.webhooks.verifySignature({
    payload: req.body,
    signatureHeader: req.headers["x-hub-signature-256"],
  })) {
    return res.sendStatus(401);
  }

  const events = whatsapp.webhooks.parse(req.body);
  for (const event of events) {
    if (event.type === "message" && event.messageType === "text") {
      whatsapp.messages.sendText(event.from, { body: `Echo: ${event.text.body}` });
    }
  }
  res.sendStatus(200);
});
```

```typescript
// One-liner style
whatsapp.webhooks.handleExpress(app, "/webhook", { verifyToken: process.env.WA_VERIFY_TOKEN! });

whatsapp.webhooks.on("message", (msg) => { /* ... */ });
whatsapp.webhooks.on("status", (status) => { /* ... */ });
```

See `examples/node-express-webhook` for a full runnable server.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build        # emits dist/ via tsup (ESM + CJS + .d.ts)
```

## Project layout

```
src/
  client.ts          Root Whatsapp class
  http/               fetch wrapper, retries, error normalization, pagination
  modules/            One file per resource (messages, templates, media, ...)
  webhooks/           Signature verification, payload parsing, event emitter
  types/              Shared request/response types
examples/
tests/
```

## Roadmap

- [x] Phase 1 — core client, `messages`, `media`, webhook verify/parse
- [x] Phase 2 — `templates`, `phoneNumbers`, `businessProfile`, `contacts`
- [x] Phase 3 — `flows`, `qrCodes`, `analytics`, `twoStepVerification`, webhook event emitter
- [ ] Phase 4 — `MockWhatsapp` test client, CLI scaffolder, framework adapters (`wacloud-sdk/next`, `wacloud-sdk/hono`)

## License

MIT
