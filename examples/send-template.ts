import { Whatsapp } from "../src/index.js";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  businessAccountId: process.env.WA_WABA_ID!,
});

async function main() {
  // Every call resolves — it never throws for expected API errors.
  const { data: templates, error: listError } = await whatsapp.templates.list({ limit: 10 });

  if (listError) {
    console.error("Could not list templates:", listError.message, listError.code);
    return;
  }

  console.log(`Found ${templates.items.length} templates`);

  const { data: sent, error: sendError } = await whatsapp.messages.sendTemplate("15551234567", {
    name: "order_confirmation",
    language: "en_US",
    components: [
      {
        type: "body",
        parameters: [{ type: "text", text: "Jordan" }],
      },
    ],
  });

  if (sendError) {
    // sendError.code / .type / .isRetryable / .raw are all available for handling.
    console.error("Send failed:", sendError.message);
    return;
  }

  console.log("Sent message:", sent.messageId, "to", sent.waId);
}

main();
