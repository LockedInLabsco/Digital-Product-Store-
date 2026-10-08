import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request
 * body — required so the webhook receiver never acts on a forged POST.
 * Must run against the raw body string (not a re-serialized JSON.parse
 * round-trip, which can change byte-for-byte formatting and break the
 * signature) and use a constant-time compare, not `===`, so response
 * timing can't leak the correct signature.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false

  const [algo, providedHex] = signatureHeader.split('=')
  if (algo !== 'sha256' || !providedHex) return false

  const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')

  const provided = Buffer.from(providedHex, 'hex')
  const expected = Buffer.from(expectedHex, 'hex')
  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}

export type WebhookSignatureVerifier = 'instagram_login' | 'facebook_login'

export interface WebhookSignatureResult {
  ok: boolean
  verifier?: WebhookSignatureVerifier
}

/**
 * Meta signs every webhook payload with the App Secret of whichever
 * Meta App the subscription was actually registered under — never one
 * fixed, shared secret (developers.facebook.com/docs/graph-api/webhooks/
 * getting-started: "Generate a SHA256 signature using the payload and
 * your app's App Secret"). This project runs two genuinely separate
 * Meta Apps, confirmed in production the same way instagramLoginOAuth.ts
 * already found for the OAuth token exchange (see that file's own doc
 * comment): the legacy Facebook-Login-linked app (INSTAGRAM_APP_SECRET)
 * and the standalone Direct Instagram Login app (INSTAGRAM_LOGIN_APP_SECRET).
 * The webhook subscription could legitimately be registered under
 * either one's dashboard, so both are tried — Instagram Login first,
 * since that's the current primary connection method post-migration —
 * and the caller is told which one matched (for logging) without ever
 * being told which one(s) failed.
 */
export function verifyInstagramWebhookSignature(rawBody: string, signatureHeader: string | null): WebhookSignatureResult {
  const candidates: [WebhookSignatureVerifier, string | undefined][] = [
    ['instagram_login', process.env.INSTAGRAM_LOGIN_APP_SECRET],
    ['facebook_login', process.env.INSTAGRAM_APP_SECRET],
  ]

  for (const [verifier, secret] of candidates) {
    if (secret && verifyWebhookSignature(rawBody, signatureHeader, secret)) {
      return { ok: true, verifier }
    }
  }

  return { ok: false }
}
