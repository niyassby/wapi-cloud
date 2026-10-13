# Changelog

## 1.1.0 - 2026-10-13

### Added
- **Typing indicator:** `messages.showTyping(id)` and `markAsRead(id, { typingIndicator: true })`.
- **Business-scoped user IDs (BSUID):**
  - Send to a BSUID with any send method; it is routed to `recipient` automatically.
  - `SendMessageResult.userId` and the `isBsuid()` helper.
  - Inbound messages and statuses expose `userId`, `parentUserId`, `username`, `profileName` and `sender`.
- **Marketing Messages API:** `messages.sendMarketingTemplate()` (`/marketing_messages`) with `productPolicy` and `messageActivitySharing`.
- **Calling API:** new `whatsapp.calls` module (`connect`, `preAccept`, `accept`, `reject`, `terminate`, `getPermission`, `getSettings`, `updateSettings`) and `messages.sendCallPermissionRequest()`.
- **Groups API:** new `whatsapp.groups` module (create, list, get, update, delete, invite links, join requests, remove participants). Send to a group with `{ recipientType: "group" }`.
- **Send options:** every send method accepts `SendOptions` (`recipientType`, `bizOpaqueCallbackData`, `replyToMessageId`, `phoneNumberId`). `sendTemplate` and `sendReaction` can now reply to a message.
- **Webhooks:**
  - New `call`, `group_update` and `unknown_field` events.
  - Parsed `context`, `referral`, interactive replies (`button_reply`, `list_reply`, `nfm_reply`), `order`, `system` and `unsupported` messages.
  - Parsed status `pricing`, `conversation` and `biz_opaque_callback_data`.
  - `onListenerError` hook.
- `sendFlow`: `flowAction: "data_exchange"`, `flowToken` and `mode`.
- Test suite (`npm test`) and opt-in live tests (`npm run test:live`).

### Changed
- **Types (possibly breaking for TypeScript users):** `from` on inbound messages and `recipientId` on statuses are now optional, because users with usernames may not expose a phone number. Use `sender` to reply.
- Default Graph API version is now `v25.0`.
- Unrecognised webhook fields are emitted as `unknown_field` instead of `account_alert`.
- `handleExpress` sends the 200 response before running listeners and isolates listener errors.
- `handleExpress` returns 400 with a log message if the body is not raw.

### Fixed
- POST requests are no longer retried after timeouts, network errors or 5xx responses, which could send duplicate messages. Opt in with `retryUnsafe`.
- Meta rate-limit error codes are retried even when returned as HTTP 400 or 403.
- The timeout now covers reading the response body, and `Retry-After` date values are handled and capped.
- A 2xx response with a non-JSON body now returns an error.
- `client_secret`, `code` and tokens are redacted from URLs passed to `onRequest` and `onResponse`.
- `media.download` now uses the configured `fetch`, timeout and hooks.
- Corrected the error-code hints (190, 131005, 131021, 131045, 132005, 132007, 133005 and others).
- The webhook verify-token check is timing-safe, and `verifySignature` returns `false` for non-raw payloads instead of throwing.
- Media messages without `link` or `mediaId` are rejected, and `caption`/`filename` are sent only where the API accepts them.
- README webhook example no longer passes a Buffer to `parse`.
