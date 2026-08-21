import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";
import { WhatsappApiError } from "../http/errors.js";

export interface MediaMetadata {
  id: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  messaging_product: "whatsapp";
}

export class MediaModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  /**
   * Uploads a file to Meta's media store and returns a media ID you can pass
   * to `whatsapp.messages.sendImage/Video/Document/...({ mediaId })`.
   */
  async upload(
    file: Blob | Buffer,
    options: { type: string; filename?: string },
    opts?: { phoneNumberId?: string },
  ): Promise<WhatsappResponse<{ id: string }>> {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    const form = new FormData();
    form.append("messaging_product", "whatsapp");

    const blob = file instanceof Blob ? file : new Blob([new Uint8Array(file)], { type: options.type });
    form.append("file", blob, options.filename ?? "upload");
    form.append("type", options.type);

    return this.http.request<{ id: string }>({
      method: "POST",
      path: `/${phoneNumberId}/media`,
      body: form,
      isFormData: true,
    });
  }

  /** Fetches metadata + a short-lived download URL for a media ID. */
  get(mediaId: string): Promise<WhatsappResponse<MediaMetadata>> {
    return this.http.request<MediaMetadata>({ method: "GET", path: `/${mediaId}` });
  }

  /** Downloads the raw bytes of a media object. Fetches metadata first to resolve the temp URL. */
  async download(mediaId: string): Promise<WhatsappResponse<ArrayBuffer>> {
    const meta = await this.get(mediaId);
    if (meta.error || !meta.data) {
      return { data: null, error: meta.error, status: meta.status, statusText: meta.statusText, raw: meta.raw };
    }

    try {
      const res = await fetch(meta.data.url, { headers: { Authorization: this.http.getAuthHeader() } });
      if (!res.ok) {
        return {
          data: null,
          error: new WhatsappApiError({
            message: `Failed to download media: ${res.status} ${res.statusText}`,
            httpStatus: res.status,
          }),
          status: res.status,
          statusText: res.statusText,
          raw: null,
        };
      }
      const buf = await res.arrayBuffer();
      return { data: buf, error: null, status: res.status, statusText: res.statusText, raw: null };
    } catch (err) {
      return {
        data: null,
        error: new WhatsappApiError({
          message: `Network error downloading media: ${(err as Error).message}`,
          type: "NetworkError",
        }),
        status: 0,
        statusText: "",
        raw: null,
      };
    }
  }

  delete(mediaId: string): Promise<WhatsappResponse<{ success: boolean }>> {
    return this.http.request({ method: "DELETE", path: `/${mediaId}` });
  }
}
