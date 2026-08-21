import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Handles the one-time GET handshake Meta sends when you configure a webhook
 * subscription. Returns the challenge string to echo back with a 200, or
 * throws if the verify token doesn't match.
 */
export function verifyHandshake(params: {
  mode: string | undefined;
  token: string | undefined;
  challenge: string | undefined;
  expectedToken: string;
}): string {
  if (params.mode !== "subscribe" || params.token !== params.expectedToken) {
    throw new Error("Webhook verification failed: mode or verify token mismatch.");
  }
  if (!params.challenge) {
    throw new Error("Webhook verification failed: missing hub.challenge.");
  }
  return params.challenge;
}

/**
 * Verifies the `X-Hub-Signature-256` header Meta sends on every POST webhook
 * delivery, using your app secret. `payload` MUST be the raw request body
 * (string or Buffer) — not JSON-parsed — since the signature is computed
 * over the exact bytes sent.
 */
export function verifySignature(params: {
  payload: string | Buffer;
  signatureHeader: string | undefined;
  appSecret: string;
}): boolean {
  if (!params.signatureHeader) return false;

  const [scheme, providedSig] = params.signatureHeader.split("=");
  if (scheme !== "sha256" || !providedSig) return false;

  const expectedSig = createHmac("sha256", params.appSecret)
    .update(params.payload)
    .digest("hex");

  const a = Buffer.from(providedSig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
