import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { verifyInstagramWebhookSignature, verifyWebhookSignature } from './webhookVerify'

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

describe('verifyInstagramWebhookSignature', () => {
  const INSTAGRAM_LOGIN_SECRET = 'instagram-login-secret'
  const FACEBOOK_LOGIN_SECRET = 'facebook-login-secret'
  const originalLoginSecret = process.env.INSTAGRAM_LOGIN_APP_SECRET
  const originalAppSecret = process.env.INSTAGRAM_APP_SECRET

  beforeEach(() => {
    process.env.INSTAGRAM_LOGIN_APP_SECRET = INSTAGRAM_LOGIN_SECRET
    process.env.INSTAGRAM_APP_SECRET = FACEBOOK_LOGIN_SECRET
  })

  afterEach(() => {
    process.env.INSTAGRAM_LOGIN_APP_SECRET = originalLoginSecret
    process.env.INSTAGRAM_APP_SECRET = originalAppSecret
  })

  it('accepts a webhook signed with the Direct Instagram Login app secret and reports that verifier', () => {
    const body = JSON.stringify({ entry: [{ id: '123' }] })
    const result = verifyInstagramWebhookSignature(body, sign(body, INSTAGRAM_LOGIN_SECRET))
    expect(result).toEqual({ ok: true, verifier: 'instagram_login' })
  })

  it('still accepts a legacy webhook signed with the Facebook Login app secret, reporting that verifier', () => {
    const body = JSON.stringify({ entry: [{ id: '123' }] })
    const result = verifyInstagramWebhookSignature(body, sign(body, FACEBOOK_LOGIN_SECRET))
    expect(result).toEqual({ ok: true, verifier: 'facebook_login' })
  })

  it('rejects a signature that matches neither configured secret', () => {
    const body = JSON.stringify({ entry: [{ id: '123' }] })
    const result = verifyInstagramWebhookSignature(body, sign(body, 'some-other-secret'))
    expect(result).toEqual({ ok: false })
  })

  it('rejects a missing signature header', () => {
    expect(verifyInstagramWebhookSignature('{}', null)).toEqual({ ok: false })
  })

  it('rejects when the raw body was mutated after signing', () => {
    const body = JSON.stringify({ entry: [{ id: '123' }] })
    const mutated = JSON.stringify({ entry: [{ id: '456' }] })
    const result = verifyInstagramWebhookSignature(mutated, sign(body, INSTAGRAM_LOGIN_SECRET))
    expect(result).toEqual({ ok: false })
  })

  it('still works if only the legacy secret is configured (Instagram Login not set up)', () => {
    delete process.env.INSTAGRAM_LOGIN_APP_SECRET
    const body = JSON.stringify({ entry: [{ id: '123' }] })
    const result = verifyInstagramWebhookSignature(body, sign(body, FACEBOOK_LOGIN_SECRET))
    expect(result).toEqual({ ok: true, verifier: 'facebook_login' })
  })
})
