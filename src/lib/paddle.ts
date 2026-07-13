import crypto from 'crypto'

function normalizePaddleWebhookSecret(secret: string | undefined): string {
  return (secret || '')
    .trim()
    .replace(/^PADDLE_WEBHOOK_SECRET=/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim()
}

const PADDLE_WEBHOOK_SECRET = normalizePaddleWebhookSecret(process.env.PADDLE_WEBHOOK_SECRET)
const PADDLE_API_KEY = process.env.PADDLE_API_KEY

function parsePaddleSignatureHeader(signature: string): {
  timestamp?: string
  hash?: string
} {
  return signature.split(';').reduce(
    (acc, part) => {
      const [rawKey, rawValue] = part.split('=')
      const key = rawKey?.trim()
      const value = rawValue?.trim()

      if (key === 'ts') {
        acc.timestamp = value
      }

      if (key === 'h1') {
        acc.hash = value
      }

      return acc
    },
    {} as { timestamp?: string; hash?: string }
  )
}

export function getPaddleWebhookSecretDebugInfo(): {
  exists: boolean
  length: number
  looksLikeNotificationSecret: boolean
} {
  return {
    exists: Boolean(PADDLE_WEBHOOK_SECRET),
    length: PADDLE_WEBHOOK_SECRET.length,
    looksLikeNotificationSecret: PADDLE_WEBHOOK_SECRET.startsWith('pdl_ntfset_'),
  }
}

/**
 * Paddle Billing signs `${timestamp}:${rawBody}` and sends the timestamp/hash
 * in the Paddle-Signature header as `ts=...;h1=...`.
 */
export function verifyPaddleWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.error('[Paddle Webhook] PADDLE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    const { timestamp, hash } = parsePaddleSignatureHeader(signature)

    if (!timestamp || !hash) {
      console.error('[Paddle Webhook] Invalid Paddle-Signature header format', {
        hasTimestamp: Boolean(timestamp),
        hasHash: Boolean(hash),
        signaturePartCount: signature.split(';').length,
      })
      return false
    }

    const signedPayload = `${timestamp}:${body}`
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex')

    const isValid =
      computedHash.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))

    console.log('[Paddle Webhook] Signature verification result', {
      isValid,
      hasSecret: Boolean(PADDLE_WEBHOOK_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasHash: Boolean(hash),
      receivedHashLength: hash.length,
      computedHashLength: computedHash.length,
      timestamp,
    })

    return isValid
  } catch (error) {
    console.error('[Paddle Webhook] Error verifying signature:', error)
    return false
  }
}

export function getPaddleCustomerEmail(transaction: any): string | null {
  const email =
    transaction?.customer?.email ||
    transaction?.customer_email ||
    transaction?.email ||
    transaction?.customer?.data?.email

  return email || null
}

export function getPaddleCustomerId(transaction: any): string | null {
  return transaction?.customer_id || transaction?.customer?.id || null
}

function getPaddleApiBaseUrl(): string {
  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox')
    .trim()
    .toLowerCase()

  return environment === 'production' || environment === 'live'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'
}

export async function getPaddleCustomerEmailFromApi(
  customerId: string
): Promise<string | null> {
  if (!customerId) {
    return null
  }

  if (!PADDLE_API_KEY) {
    console.error('[Paddle API] PADDLE_API_KEY not configured; cannot fetch customer email')
    return null
  }

  const apiBaseUrl = getPaddleApiBaseUrl()
  const url = `${apiBaseUrl}/customers/${customerId}`

  try {
    console.log('[Paddle API] Fetching customer email by customer ID', {
      customerId,
      apiBaseUrl,
      apiKeyConfigured: Boolean(PADDLE_API_KEY),
    })

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    console.log('[Paddle API] Customer fetch result', {
      customerId,
      status: response.status,
      ok: response.ok,
      emailFound: Boolean(data?.data?.email),
    })

    if (!response.ok) {
      console.error('[Paddle API] Customer fetch failed', data)
      return null
    }

    return data?.data?.email || null
  } catch (error) {
    console.error('[Paddle API] Exception fetching customer email', error)
    return null
  }
}

export function getPaddlePriceId(transaction: any): string | null {
  if (transaction?.items && Array.isArray(transaction.items) && transaction.items.length > 0) {
    return (
      transaction.items[0].price_id ||
      transaction.items[0].price?.id ||
      transaction.items[0].priceId ||
      null
    )
  }

  if (transaction?.details?.line_items && Array.isArray(transaction.details.line_items)) {
    return (
      transaction.details.line_items[0]?.price_id ||
      transaction.details.line_items[0]?.price?.id ||
      null
    )
  }

  return null
}

export function getPaddleCustomData(transaction: any): Record<string, any> {
  return transaction?.custom_data || transaction?.customData || {}
}

export function logPaddleEvent(eventType: string, data: any): void {
  console.log('\n[Paddle Webhook] ===== EVENT =====')
  console.log('[Paddle Webhook] Event Type:', eventType)
  console.log('[Paddle Webhook] Transaction ID:', data?.id || 'unknown')
  console.log('[Paddle Webhook] Customer ID:', getPaddleCustomerId(data) || 'unknown')
  console.log('[Paddle Webhook] Customer Email:', getPaddleCustomerEmail(data) || 'not found')
  console.log('[Paddle Webhook] Price ID:', getPaddlePriceId(data) || 'not found')
  console.log('[Paddle Webhook] Custom Data:', getPaddleCustomData(data))
  console.log('[Paddle Webhook] ===== END EVENT =====\n')
}
