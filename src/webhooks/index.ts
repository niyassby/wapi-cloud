import { verifyHandshake, verifySignature } from "./verify.js";
import { parse } from "./parser.js";
import type { WhatsappEvent } from "./types.js";

type EventName = WhatsappEvent["type"];
type Listener = (event: any) => void;

export class WebhooksModule {
  private listeners = new Map<EventName, Set<Listener>>();

  constructor(private appSecret?: string) {}

  verifyHandshake = verifyHandshake;

  /** Uses `appSecret` from the client config unless one is passed explicitly. */
  verifySignature(params: { payload: string | Buffer; signatureHeader: string | undefined; appSecret?: string }): boolean {
    const secret = params.appSecret ?? this.appSecret;
    if (!secret) {
      throw new Error(
        "Cannot verify webhook signature: no `appSecret` was provided in the Whatsapp client config, and none was passed to verifySignature().",
      );
    }
    return verifySignature({ payload: params.payload, signatureHeader: params.signatureHeader, appSecret: secret });
  }

  parse = parse;

  /** Registers a listener for a specific event type, for use with `handleExpress` or manual `emit`. */
  on<T extends EventName>(event: T, listener: (payload: Extract<WhatsappEvent, { type: T }>) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener);
  }

  off<T extends EventName>(event: T, listener: (payload: Extract<WhatsappEvent, { type: T }>) => void): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  /** Dispatches an already-parsed event to any `on()` listeners registered for its type. */
  emit(event: WhatsappEvent): void {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
  }

  /**
   * One-line setup for an Express app: registers the GET verification route
   * and a POST route that verifies the signature, parses the payload, and
   * dispatches each event to your `on()` listeners.
   *
   * Requires the raw request body (e.g. `express.raw({ type: "application/json" })`
   * mounted on the webhook path) so the signature can be checked against the
   * exact bytes Meta sent.
   */
  handleExpress(app: { get: Function; post: Function }, path: string, options: { verifyToken: string }): void {
    app.get(path, (req: any, res: any) => {
      try {
        const challenge = verifyHandshake({
          mode: req.query["hub.mode"],
          token: req.query["hub.verify_token"],
          challenge: req.query["hub.challenge"],
          expectedToken: options.verifyToken,
        });
        res.status(200).send(challenge);
      } catch {
        res.sendStatus(403);
      }
    });

    app.post(path, (req: any, res: any) => {
      const rawBody: Buffer = req.body;

      if (this.appSecret) {
        const isValid = this.verifySignature({
          payload: rawBody,
          signatureHeader: req.headers["x-hub-signature-256"],
        });
        if (!isValid) {
          res.sendStatus(401);
          return;
        }
      }

      let json: unknown;
      try {
        json = JSON.parse(rawBody.toString("utf-8"));
      } catch {
        res.sendStatus(400);
        return;
      }

      const events = parse(json);
      for (const event of events) this.emit(event);

      res.sendStatus(200);
    });
  }
}
