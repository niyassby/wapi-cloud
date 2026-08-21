import express from "express";
import { Whatsapp } from "../../src/index.js";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  appSecret: process.env.WA_APP_SECRET!,
});

const app = express();

// Raw body is required on the webhook path so the signature can be verified
// against the exact bytes Meta sent — mount express.raw() only here, not globally.
app.use("/webhook", express.raw({ type: "application/json" }));

whatsapp.webhooks.handleExpress(app, "/webhook", {
  verifyToken: process.env.WA_VERIFY_TOKEN!,
});

whatsapp.webhooks.on("message", async (msg) => {
  if (msg.messageType !== "text") return;

  await whatsapp.messages.markAsRead(msg.id);

  const { error } = await whatsapp.messages.reply(msg.from, msg.id, {
    body: `Echo: ${msg.text.body}`,
  });

  if (error) console.error("Reply failed:", error.message);
});

whatsapp.webhooks.on("status", (status) => {
  console.log(`Message ${status.messageId} is now "${status.status}"`);
});

app.listen(3000, () => console.log("Webhook server listening on :3000"));
