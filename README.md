<div align="center">

<img src="https://raw.githubusercontent.com/niyassby/wapi-cloud/master/assets/wapi-cloud.svg" alt="wapi-cloud logo" width="600" />

# wapi-cloud

**A promise-based, fully-typed Node.js wrapper for the WhatsApp Cloud API (Meta Graph API)**

[![npm version](https://img.shields.io/npm/v/wapi-cloud.svg?color=25D366\&label=npm)](https://www.npmjs.com/package/wapi-cloud)
[![npm downloads](https://img.shields.io/npm/dm/wapi-cloud.svg?color=25D366)](https://www.npmjs.com/package/wapi-cloud)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)

[Documentation](https://wapi-cloud-docs.vercel.app/) ·
[Quick Start](#-quick-start) ·
[NPM](https://www.npmjs.com/package/wapi-cloud) ·
[Webhooks](#-webhooks) ·
[Examples](./examples) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

## 📚 Documentation

**Full documentation is available at:**

👉 **[Messaging API documentation](https://wapi-cloud-docs.vercel.app/)**
The documentation site contains detailed guides and API references

---

## ✨ Features

* 🔒 **Fully typed** — first-class TypeScript support, narrows correctly on error checks
* 🧵 **Never throws** — every call resolves to a consistent `{ data, error }` result, Supabase-style
* 📦 **Batteries included** — messages, templates, media, contacts, flows, QR codes, analytics
* 🪝 **Webhook helpers** — signature verification, event parsing, and an Express one-liner
* 🔁 **Auto-pagination** — `for await` over any list endpoint
* 🌲 **Tree-shakeable** — ships as ESM + CJS with `.d.ts` via `tsup`

---

## 📦 Install

```bash
npm install wapi-cloud
```

---

## 🚀 Quick Start

### 1. Import and configure

```typescript
import { Whatsapp } from "wapi-cloud";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  businessAccountId: process.env.WA_WABA_ID!,
  appSecret: process.env.WA_APP_SECRET!,
});
```

### 2. Send your first message

```typescript
const { data, error } = await whatsapp.messages.sendText(
  "15551234567",
  {
    body: "Hello from wapi-cloud!",
  }
);

if (error) {
  console.error(error);
} else {
  console.log(data);
}
```

### 📖 Learn more

For the complete setup guide, configuration options, authentication, and examples:

👉 **[Read the Quick Start documentation](https://wapi-cloud-docs.vercel.app/)**

---

## 🎯 Every call returns `{ data, error }`

No `try/catch` needed for expected API failures — every SDK method resolves, never throws, and gives you a consistent result object:

```typescript
const { data: templates, error } = await whatsapp.templates.list();

if (error) {
  console.error(error.code, error.type, error.message);

  // Additional information:
  // error.isRetryable
  // error.raw
  // error.fbtraceId
} else {
  console.log(templates.items);
}
```

> **Why this matters:** `data` and `error` are mutually exclusive — TypeScript narrows correctly once you check `error`.

Every response also carries:

* `status`
* `statusText`
* `raw`

The `raw` property contains the untouched Graph API JSON as an escape hatch.

Config-only failures, such as calling:

```typescript
whatsapp.templates.list();
```

without providing a `businessAccountId`, also return:

```typescript
{
  data: null,
  error
}
```

rather than throwing.

---

## 💬 Sending Messages

### Text

```typescript
await whatsapp.messages.sendText(
  "15551234567",
  {
    body: "Hello!",
  }
);
```

### Template

```typescript
await whatsapp.messages.sendTemplate(
  "15551234567",
  {
    name: "order_confirmation",
    language: "en_US",
    components: [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: "Jordan",
          },
        ],
      },
    ],
  }
);
```

### Image

```typescript
await whatsapp.messages.sendImage(
  "15551234567",
  {
    link: "https://example.com/photo.jpg",
  }
);
```

### Interactive message

```typescript
await whatsapp.messages.sendInteractive(
  "15551234567",
  {
    type: "button",
    body: "Pick one:",
    buttons: [
      {
        id: "yes",
        title: "Yes",
      },
      {
        id: "no",
        title: "No",
      },
    ],
  }
);
```

📚 **[See the complete Messaging API documentation](https://wapi-cloud-docs.vercel.app/)**

---

## 🗂 Templates, Media & Account Management

### Templates

```typescript
const { data } = await whatsapp.templates.create({
  name: "order_confirmation",
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "BODY",
      text: "Hi {{1}}, your order is confirmed.",
    },
  ],
});
```

### Auto-pagination

```typescript
for await (const template of whatsapp.templates.listAll()) {
  console.log(template.name);
}
```

### Media

```typescript
const { data: media } = await whatsapp.media.upload(
  fileBuffer,
  {
    type: "image/png",
  }
);

await whatsapp.messages.sendImage(
  to,
  {
    mediaId: media!.id,
  }
);
```

<details>
<summary><strong>Full module surface</strong></summary>

<br>

| Module                | Description                                |
| --------------------- | ------------------------------------------ |
| `messages`            | Send WhatsApp messages                     |
| `templates`           | Create, list, and manage message templates |
| `media`               | Upload and reference media assets          |
| `contacts`            | Contact management                         |
| `phoneNumbers`        | Phone number configuration                 |
| `businessProfile`     | Business profile details                   |
| `flows`               | WhatsApp Flows                             |
| `qrCodes`             | QR code / short-link management            |
| `analytics`           | Messaging analytics                        |
| `twoStepVerification` | Two-step verification settings             |
| `webhooks`            | Webhook verification and event parsing     |

See [`src/modules/`](./src/modules) for the full source.

📚 For detailed API documentation, visit:

**https://wapi-cloud-docs.vercel.app/**

</details>

---

## 🪝 Webhooks

### Manual style

```typescript
app.post(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
  (req, res) => {
    if (
      !whatsapp.webhooks.verifySignature({
        payload: req.body,
        signatureHeader:
          req.headers["x-hub-signature-256"],
      })
    ) {
      return res.sendStatus(401);
    }

    const events = whatsapp.webhooks.parse(req.body);

    for (const event of events) {
      if (
        event.type === "message" &&
        event.messageType === "text"
      ) {
        whatsapp.messages.sendText(
          event.from,
          {
            body: `Echo: ${event.text.body}`,
          }
        );
      }
    }

    res.sendStatus(200);
  }
);
```

### One-liner style

```typescript
whatsapp.webhooks.handleExpress(
  app,
  "/webhook",
  {
    verifyToken: process.env.WA_VERIFY_TOKEN!,
  }
);

whatsapp.webhooks.on("message", (msg) => {
  // Handle incoming message
});

whatsapp.webhooks.on("status", (status) => {
  // Handle message status
});
```

📁 See [`examples/node-express-webhook`](./examples/node-express-webhook) for a full runnable server.

📚 **[Read the Webhooks documentation](https://wapi-cloud-docs.vercel.app/)**

---

## 📖 Documentation & Resources

| Resource             | Link                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| 📚 Documentation     | [wapi-cloud-docs](https://wapi-cloud-docs.vercel.app/)        |
| 📦 NPM Package       | [npmjs.com/package/wapi-cloud](https://www.npmjs.com/package/wapi-cloud) |
| 💻 GitHub Repository | [github.com/niyassby/wapi-cloud](https://github.com/niyassby/wapi-cloud) |
| 📝 Examples          | [`./examples`](./examples)                                               |
| 🤝 Contributing      | [`CONTRIBUTING.md`](./CONTRIBUTING.md)                                   |
| 📄 License           | [`LICENSE`](./LICENSE)                                                   |

---

## 🛠 Development

Clone the repository:

```bash
git clone https://github.com/niyassby/wapi-cloud.git

cd wapi-cloud

npm install
```

Run type checking:

```bash
npm run typecheck
```

Build the package:

```bash
npm run build
```

The build generates:

* ESM
* CommonJS
* TypeScript declaration files

using `tsup`.

---

## 🤝 Contributing

Contributions are welcome!

Please open an issue to discuss significant changes before submitting a PR.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

[MIT](./LICENSE) © wapi-cloud contributors

---

<div align="center">

<sub>Built with ❤️ for developers integrating WhatsApp into their products.</sub>

<br />

<a href="https://wapi-cloud-docs.vercel.app/">
  📚 Read the full documentation →
</a>

</div>
