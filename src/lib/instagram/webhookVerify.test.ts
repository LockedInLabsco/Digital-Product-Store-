import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebhookSignature } from './webhookVerify'

const SECRET = 'test-app-secret'

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
}

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ hello: 'world' })
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true)
  })

  it('rejects a body that does not match the signature', () => {
    const body = JSON.stringify({ hello: 'world' })
    const tampered = JSON.stringify({ hello: 'tampered' })
    expect(verifyWebhookSignature(tampered, sign(body), SECRET)).toBe(false)
  })

  it('rejects a signature made with the wrong secret', () => {
    const body = JSON.stringify({ hello: 'world' })
    expect(verifyWebhookSignature(body, sign(body, 'wrong-secret'), SECRET)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyWebhookSignature('{}', null, SECRET)).toBe(false)
  })

  it('rejects a malformed signature header', () => {
    expect(verifyWebhookSignature('{}', 'not-a-real-signature', SECRET)).toBe(false)
    expect(verifyWebhookSignature('{}', 'sha1=deadbeef', SECRET)).toBe(false)
  })

  it('rejects when the app secret is empty', () => {
    expect(verifyWebhookSignature('{}', sign('{}'), '')).toBe(false)
  })
})
