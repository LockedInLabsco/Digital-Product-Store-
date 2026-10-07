/**
 * Verifies Meta's `signed_request` parameter — the mechanism Meta uses
 * to authenticate its own server-to-server calls to the Deauthorize
 * Callback and Data Deletion Request Callback (see
 * src/app/api/admin/social/instagram/deauthorize/route.ts and
 * .../data-deletion/route.ts, the only callers). Verified against
 * Meta's current official documentation
 * (developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback,
 * October 2026) rather than an old tutorial:
 *
 * Format: `<signature>.<payload>`, both base64url-encoded (no padding).
 * `payload` base64url-decodes to a JSON object containing at least
 * `algorithm` (must be the literal string "HMAC-SHA256"), `issued_at`,
 * and `user_id`. The signature is HMAC-SHA256 of the RAW ENCODED
 * payload string (not the decoded JSON), keyed with the app secret —
 * computed and compared here, never trusted as presented.
 *
 * Same App Secret as every other Meta OAuth call in this codebase
 * (INSTAGRAM_APP_SECRET — one Meta app backs Facebook Login, Instagram
 * Login, and these callbacks alike, per facebookOAuth.ts's own header).
 *
 * This file has exactly one job: is this signed_request genuinely from
 * Meta, and if so, what does it say. It does not look up or touch any
 * connected account — see instagramAccountLookup.ts for that, kept
 * separate so the security-critical verification logic stays small and
 * easy to audit in isolation.
 */
import 'server-only'
import crypto from 'node:crypto'

export interface SignedRequestPayload {
  algorithm: string
  issued_at: number
  user_id: string
  expires?: number
  [key: string]: unknown
}

export type VerifySignedRequestResult =
  | { ok: true; payload: SignedRequestPayload }
  | {
      ok: false
      reason: 'missing_secret' | 'malformed' | 'unsupported_algorithm' | 'signature_mismatch'
      error: string
    }

/** Standard base64url (RFC 4648 §5) decode — '-'/'_' swapped back to '+'/'/' before handing to Node's base64 decoder, which tolerates the missing '=' padding Meta's encoding omits. */
function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function verifyMetaSignedRequest(signedRequest: string): VerifySignedRequestResult {
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appSecret) {
    return { ok: false, reason: 'missing_secret', error: 'INSTAGRAM_APP_SECRET is not configured' }
  }

  const parts = signedRequest.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: 'malformed', error: 'signed_request is not in the expected <signature>.<payload> format' }
  }
  const [encodedSignature, encodedPayload] = parts

  let payload: SignedRequestPayload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed', error: 'signed_request payload is not valid JSON' }
  }

  if (payload.algorithm !== 'HMAC-SHA256') {
    return { ok: false, reason: 'unsupported_algorithm', error: `Unsupported signed_request algorithm: ${String(payload.algorithm)}` }
  }
  if (!payload.user_id) {
    return { ok: false, reason: 'malformed', error: 'signed_request payload is missing user_id' }
  }

  const expectedSignature = crypto.createHmac('sha256', appSecret).update(encodedPayload).digest()
  const actualSignature = base64UrlDecode(encodedSignature)

  // Length check first: timingSafeEqual throws (not returns false) on
  // mismatched buffer lengths, and a forged/truncated signature of the
  // wrong length must never reach it.
  const signaturesMatch = expectedSignature.length === actualSignature.length && crypto.timingSafeEqual(expectedSignature, actualSignature)

  if (!signaturesMatch) {
    return { ok: false, reason: 'signature_mismatch', error: 'signed_request signature does not match' }
  }

  return { ok: true, payload }
}
