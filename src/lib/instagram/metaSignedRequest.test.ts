import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

vi.mock('server-only', () => ({}))

import { verifyMetaSignedRequest } from './metaSignedRequest'

const SECRET = 'test-app-secret'

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function signWith(secret: string, payload: Record<string, unknown>): string {
  const encodedPayload = base64Url(Buffer.from(JSON.stringify(payload)))
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest()
  return `${base64Url(signature)}.${encodedPayload}`
}

describe('verifyMetaSignedRequest', () => {
  const originalSecret = process.env.INSTAGRAM_APP_SECRET

  beforeEach(() => {
    process.env.INSTAGRAM_APP_SECRET = SECRET
  })

  afterEach(() => {
    process.env.INSTAGRAM_APP_SECRET = originalSecret
  })

  it('verifies a genuinely-signed request and returns its decoded payload', () => {
    const signed = signWith(SECRET, { algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'ig-user-123' })

    const result = verifyMetaSignedRequest(signed)

    expect(result).toEqual({ ok: true, payload: { algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'ig-user-123' } })
  })

  it('rejects a request signed with the WRONG secret — the exact forgery this verification exists to catch', () => {
    const signed = signWith('a-different-secret', { algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'ig-user-123' })

    const result = verifyMetaSignedRequest(signed)

    expect(result).toEqual({ ok: false, reason: 'signature_mismatch', error: expect.any(String) })
  })

  it('rejects a tampered payload even if the original signature is reattached', () => {
    const encodedPayload = base64Url(Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'ig-user-123' })))
    const signature = crypto.createHmac('sha256', SECRET).update(encodedPayload).digest()
    const tamperedPayload = base64Url(Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'attacker-controlled' })))

    const result = verifyMetaSignedRequest(`${base64Url(signature)}.${tamperedPayload}`)

    expect(result).toEqual({ ok: false, reason: 'signature_mismatch', error: expect.any(String) })
  })

  it('rejects a malformed value with no "." separator', () => {
    const result = verifyMetaSignedRequest('not-a-signed-request')
    expect(result).toEqual({ ok: false, reason: 'malformed', error: expect.any(String) })
  })

  it('rejects an unsupported algorithm rather than trusting it', () => {
    const signed = signWith(SECRET, { algorithm: 'MD5', issued_at: 1700000000, user_id: 'ig-user-123' })

    const result = verifyMetaSignedRequest(signed)

    expect(result).toEqual({ ok: false, reason: 'unsupported_algorithm', error: expect.any(String) })
  })

  it('rejects a payload missing user_id', () => {
    const signed = signWith(SECRET, { algorithm: 'HMAC-SHA256', issued_at: 1700000000 })

    const result = verifyMetaSignedRequest(signed)

    expect(result).toEqual({ ok: false, reason: 'malformed', error: expect.any(String) })
  })

  it('fails closed with missing_secret when INSTAGRAM_APP_SECRET is not configured, never verifies against an empty key', () => {
    delete process.env.INSTAGRAM_APP_SECRET
    const signed = signWith(SECRET, { algorithm: 'HMAC-SHA256', issued_at: 1700000000, user_id: 'ig-user-123' })

    const result = verifyMetaSignedRequest(signed)

    expect(result).toEqual({ ok: false, reason: 'missing_secret', error: expect.any(String) })
  })
})
