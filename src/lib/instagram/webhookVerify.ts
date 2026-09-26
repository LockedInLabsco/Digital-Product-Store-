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
