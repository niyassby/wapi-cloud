<div align="center">

<img src="https://raw.githubusercontent.com/yourname/wapi-cloud/assets/wapi-cloud.svg" alt="wapi-cloud logo" width="120" />

# wapi-cloud

**A promise-based, fully-typed Node.js wrapper for the WhatsApp Cloud API (Meta Graph API)**

[![npm version](https://img.shields.io/npm/v/wapi-cloud.svg?color=25D366&label=npm)](https://www.npmjs.com/package/wapi-cloud)
[![npm downloads](https://img.shields.io/npm/dm/wapi-cloud.svg?color=25D366)](https://www.npmjs.com/package/wapi-cloud)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/github/actions/workflow/status/yourname/wapi-cloud/ci.yml?branch=main)](https://github.com/yourname/wapi-cloud/actions)

[Quick Start](#-quick-start) · [Docs](#-templates-media--account-management) · [Webhooks](#-webhooks) · [Examples](./examples) · [Contributing](./CONTRIBUTING.md)

</div>

---

## ✨ Features

- 🔒 **Fully typed** — first-class TypeScript support, narrows correctly on error checks
- 🧵 **Never throws** — every call resolves to a consistent `{ data, error }` result, Supabase-style
- 📦 **Batteries included** — messages, templates, media, contacts, flows, QR codes, analytics
- 🪝 **Webhook helpers** — signature verification, event parsing, and an Express one-liner
- 🔁 **Auto-pagination** — `for await` over any list endpoint
- 🌲 **Tree-shakeable** — ships as ESM + CJS with `.d.ts` via `tsup`

---

## 📦 Install

```bash
npm install wapi-cloud
```

## 🚀 Quick Start

```typescript
import { Whatsapp } from "wapi-cloud";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  businessAccountId: process.env.WA_WABA_ID!, // needed for templates/flows/QR/analytics
  appSecret: process.env.WA_APP_SECRET!,      // needed for webhook signature verification
});
```

---

## 🎯 Every call returns `{ data, error }`

No `try/catch` needed for expected API failures — every SDK method resolves, never throws, and gives you a consistent result object:

```typescript
const { data: templates, error } = await whatsapp.templates.list();

if (error) {
  console.error(error.code, error.type, error.message);
  // error.isRetryable, error.raw, error.fbtraceId also available
} else {
  console.log(templates.items);
}
```

> **Why this matters:** `data` and `error` are mutually exclusive — TypeScript narrows correctly once you check `error`. Every response also carries `status`, `statusText`, and `raw` (the untouched Graph API JSON) as an escape hatch.

Config-only failures (e.g. calling `whatsapp.templates.list()` without a `businessAccountId` in the constructor) also come back as `{ data: null, error }` rather than throwing, so the pattern is consistent everywhere.

---

## 💬 Sending Messages

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

**Root-level sugar** for the two most common sends:

```typescript
await whatsapp.send("15551234567", { body: "Hello!" });
await whatsapp.sendTemplate("15551234567", { name: "...", language: "en_US" });
```

---

## 🗂 Templates, Media & Account Management

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

<details>
<summary><strong>Full module surface</strong></summary>

<br>

| Module | Description |
|---|---|
| `templates` | Create, list, and manage message templates |
| `media` | Upload and reference media assets |
| `contacts` | Contact management |
| `phoneNumbers` | Phone number configuration |
| `businessProfile` | Business profile details |
| `flows` | WhatsApp Flows |
| `qrCodes` | QR code / short-link management |
| `analytics` | Messaging analytics |
| `twoStepVerification` | Two-step verification settings |

See [`src/modules/`](./src/modules) for the full source.

</details>

---

## 🪝 Webhooks

**Manual style**

```typescript
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

**One-liner style**

```typescript
whatsapp.webhooks.handleExpress(app, "/webhook", { verifyToken: process.env.WA_VERIFY_TOKEN! });

whatsapp.webhooks.on("message", (msg) => { /* ... */ });
whatsapp.webhooks.on("status", (status) => { /* ... */ });
```

📁 See [`examples/node-express-webhook`](./examples/node-express-webhook) for a full runnable server.

---

## 🛠 Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # emits dist/ via tsup (ESM + CJS + .d.ts)
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss significant changes before submitting a PR. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](./LICENSE) © wapi-cloud contributors

<div align="center">
<sub>Built with ❤️ for developers integrating WhatsApp into their products.</sub>
</div>