import type { HttpClient } from "../http/request.js";
import type { WhatsappResponse } from "../types/common.js";

export type GroupJoinApprovalMode = "approval_required" | "auto_approve";
export type GroupField =
  | "join_approval_mode"
  | "subject"
  | "description"
  | "suspended"
  | "creation_timestamp"
  | "participants"
  | "total_participant_count";

export interface CreateGroupInput {
  /** Max 128 characters. */
  subject: string;
  /** Max 2048 characters. */
  description?: string;
  /** Defaults to "auto_approve" on Meta's side. */
  joinApprovalMode?: GroupJoinApprovalMode;
}

export interface WhatsappGroup {
  messaging_product?: "whatsapp";
  id: string;
  subject?: string;
  description?: string;
  suspended?: boolean;
  creation_timestamp?: string;
  total_participant_count?: number;
  participants?: { wa_id?: string; user_id?: string }[];
  join_approval_mode?: GroupJoinApprovalMode;
}

export interface GroupJoinRequest {
  join_request_id: string;
  wa_id?: string;
  creation_timestamp: number;
}

interface JoinRequestResult {
  messaging_product: "whatsapp";
  failed_join_requests?: { join_request_id: string; errors?: unknown[] }[];
  errors?: unknown[];
}

interface GroupOpts {
  phoneNumberId?: string;
}

/**
 * WhatsApp Groups API. Participants cannot be added directly: share the invite link
 * (e.g. in a template) and approve join requests. Send messages to a group with
 * `whatsapp.messages.sendText(groupId, ..., { recipientType: "group" })`.
 */
export class GroupsModule {
  constructor(
    private http: HttpClient,
    private defaultPhoneNumberId: string,
  ) {}

  /**
   * Creates a group. The group ID and invite link are delivered via the
   * `group_lifecycle_update` webhook (`group_update` event); the response shape is
   * not documented, so inspect `raw`.
   */
  create(input: CreateGroupInput, opts?: GroupOpts) {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request<{ messaging_product?: "whatsapp"; id?: string; [key: string]: unknown }>({
      method: "POST",
      path: `/${phoneNumberId}/groups`,
      body: {
        messaging_product: "whatsapp",
        subject: input.subject,
        description: input.description,
        join_approval_mode: input.joinApprovalMode,
      },
    });
  }

  /** Lists active groups of the phone number. */
  list(
    params?: { limit?: number; after?: string; before?: string },
    opts?: GroupOpts,
  ): Promise<
    WhatsappResponse<{
      data: { groups: { id: string; subject: string; created_at: string }[] };
      paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
    }>
  > {
    const phoneNumberId = opts?.phoneNumberId ?? this.defaultPhoneNumberId;
    return this.http.request({ method: "GET", path: `/${phoneNumberId}/groups`, query: params });
  }

  /** Gets group info. Request `fields` explicitly, otherwise only the ID is returned. */
  get(groupId: string, fields?: GroupField[]): Promise<WhatsappResponse<WhatsappGroup>> {
    return this.http.request({ method: "GET", path: `/${groupId}`, query: { fields: fields?.join(",") } });
  }

  /** Updates subject and/or description. Profile pictures need a multipart upload and aren't supported yet. */
  update(groupId: string, input: { subject?: string; description?: string }) {
    return this.http.request<{ success?: boolean }>({
      method: "POST",
      path: `/${groupId}`,
      body: { messaging_product: "whatsapp", ...input },
    });
  }

  /** Deletes the group and removes every participant, including the business. */
  delete(groupId: string) {
    return this.http.request<{ success?: boolean }>({ method: "DELETE", path: `/${groupId}` });
  }

  getInviteLink(groupId: string): Promise<WhatsappResponse<{ messaging_product: "whatsapp"; invite_link: string }>> {
    return this.http.request({ method: "GET", path: `/${groupId}/invite_link` });
  }

  /** Generates a new invite link; previously shared links stop working. */
  resetInviteLink(groupId: string): Promise<WhatsappResponse<{ messaging_product: "whatsapp"; invite_link: string }>> {
    return this.http.request({
      method: "POST",
      path: `/${groupId}/invite_link`,
      body: { messaging_product: "whatsapp" },
    });
  }

  listJoinRequests(
    groupId: string,
  ): Promise<WhatsappResponse<{ data: GroupJoinRequest[]; paging?: { cursors?: { before?: string; after?: string } } }>> {
    return this.http.request({ method: "GET", path: `/${groupId}/join_requests` });
  }

  approveJoinRequests(
    groupId: string,
    joinRequestIds: string[],
  ): Promise<WhatsappResponse<JoinRequestResult & { approved_join_requests: string[] }>> {
    return this.http.request({
      method: "POST",
      path: `/${groupId}/join_requests`,
      body: { messaging_product: "whatsapp", join_requests: joinRequestIds },
    });
  }

  rejectJoinRequests(
    groupId: string,
    joinRequestIds: string[],
  ): Promise<WhatsappResponse<JoinRequestResult & { rejected_join_requests: string[] }>> {
    return this.http.request({
      method: "DELETE",
      path: `/${groupId}/join_requests`,
      body: { messaging_product: "whatsapp", join_requests: joinRequestIds },
    });
  }

  /** Removes up to 8 participants (phone numbers or wa_ids). Removed users cannot rejoin via the invite link. */
  removeParticipants(groupId: string, users: string[]) {
    return this.http.request<{ success?: boolean }>({
      method: "DELETE",
      path: `/${groupId}/participants`,
      body: { messaging_product: "whatsapp", participants: users.map((user) => ({ user })) },
    });
  }
}
