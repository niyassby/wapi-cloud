import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import { WhatsappApiError } from "../http/errors.js";

export interface ExchangedEmbeddedSignupToken {
  accessToken: string;
  tokenType: string;
}

export interface EmbeddedSignupLoginScriptOptions {
  /** Your Meta App ID (same as `appId` in the Whatsapp client config). */
  appId: string;
  /** The Facebook Login for Business configuration ID for your Embedded Signup flow. */
  configId: string;
  graphApiVersion?: string;
  /** DOM id of the button that should trigger the signup popup. Defaults to "wa-embedded-signup-btn". */
  triggerElementId?: string;
}

export class EmbeddedSignupModule {
  constructor(
    private http: HttpClient,
    private appId?: string,
    private appSecret?: string,
  ) {}

  private requireAppCreds(): WhatsappApiError | null {
    if (!this.appId || !this.appSecret) {
      return new WhatsappApiError({
        message: "`appId` and `appSecret` are required in the Whatsapp client config to use whatsapp.embeddedSignup.exchangeCodeForToken().",
        type: "ConfigError",
      });
    }
    return null;
  }

  /**
   * Server-side step after a customer completes Embedded Signup in the browser:
   * exchanges the short-lived `code` returned to the spawning window for a
   * Business Integration System User access token you can use to call the
   * Graph API on the customer's behalf.
   */
  async exchangeCodeForToken(code: string): Promise<WhatsappResponse<ExchangedEmbeddedSignupToken>> {
    const configErr = this.requireAppCreds();
    if (configErr) return { data: null, error: configErr, status: 0, statusText: "", raw: null };

    const res = await this.http.request<{ access_token: string; token_type: string }>({
      method: "GET",
      path: "/oauth/access_token",
      query: { client_id: this.appId, client_secret: this.appSecret, code },
    });

    if (res.error || !res.data) {
      return { data: null, error: res.error, status: res.status, statusText: res.statusText, raw: res.raw };
    }

    return {
      data: { accessToken: res.data.access_token, tokenType: res.data.token_type },
      error: null,
      status: res.status,
      statusText: res.statusText,
      raw: res.raw,
    };
  }

  /**
   * Subscribes your app to receive webhooks for the customer's new WABA —
   * required once, right after exchanging the code. Pass the customer's
   * token (from `exchangeCodeForToken`) as `accessTokenOverride` since this
   * call must be made on the customer's WABA, not your own.
   */
  subscribeToWaba(
    businessAccountId: string,
    opts?: { accessTokenOverride?: string },
  ): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({
      method: "POST",
      path: `/${businessAccountId}/subscribed_apps`,
      accessTokenOverride: opts?.accessTokenOverride,
    });
  }

  /**
   * Generates the `<script>` + button snippet for launching Embedded Signup
   * (`FB.login()` with your Login for Business config). This SDK runs
   * server-side and can't open the popup itself — this just saves you from
   * hand-copying Meta's JS SDK boilerplate. Drop the returned string into
   * your frontend, and point its fetch call at a backend route that calls
   * `whatsapp.embeddedSignup.exchangeCodeForToken(code)`.
   */
  getLoginScript(options: EmbeddedSignupLoginScriptOptions): string {
    const version = options.graphApiVersion ?? "v21.0";
    const triggerId = options.triggerElementId ?? "wa-embedded-signup-btn";

    return `
<script>
  window.fbAsyncInit = function () {
    FB.init({ appId: '${options.appId}', cookie: true, xfbml: true, version: '${version}' });
  };
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');

  function launchWhatsAppEmbeddedSignup() {
    FB.login(function (response) {
      if (response.authResponse && response.authResponse.code) {
        // Send this code to your backend, then call
        // whatsapp.embeddedSignup.exchangeCodeForToken(code) server-side.
        fetch('/api/whatsapp/embedded-signup/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: response.authResponse.code }),
        });
      }
    }, {
      config_id: '${options.configId}',
      response_type: 'code',
      override_default_response_type: true,
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('${triggerId}');
    if (btn) btn.addEventListener('click', launchWhatsAppEmbeddedSignup);
  });

  // Embedded Signup also posts a { type: "WA_EMBEDDED_SIGNUP", event: "FINISH",
  // data: { phone_number_id, waba_id } } message via window.postMessage — listen
  // for that separately if you need the IDs before FB.login's callback fires.
</script>
<button id="${triggerId}" type="button">Connect WhatsApp</button>
`.trim();
  }
}
