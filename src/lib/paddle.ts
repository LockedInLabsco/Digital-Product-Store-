import crypto from 'crypto'

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

/**
 * Verify Paddle webhook signature
 * Paddle sends webhooks with a signature header that we must verify
 */
export function verifyPaddleWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.error('❌ PADDLE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    const hash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    const isValid = hash === signature
    console.log(`🔐 Webhook signature verification: ${isValid ? '✅ valid' : '❌ invalid'}`)
    return isValid
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Extract customer email from Paddle transaction
 */
export function getPaddleCustomerEmail(transaction: any): string | null {
  // Paddle provides customer email in different formats depending on the event
  const email = transaction?.customer?.email || transaction?.email
  return email || null
}

/**
 * Extract price ID from Paddle transaction
 */
export function getPaddlePriceId(transaction: any): string | null {
  // Price ID is in the items array
  if (transaction?.items && Array.isArray(transaction.items) && transaction.items.length > 0) {
    return transaction.items[0].price_id || null
  }
  return null
}

/**
 * Log Paddle event for debugging
 */
export function logPaddleEvent(eventType: string, data: any): void {
  console.log(`\n🎯 ===== PADDLE WEBHOOK EVENT =====`)
  console.log(`📨 Event Type: ${eventType}`)
  console.log(`📧 Customer Email: ${getPaddleCustomerEmail(data)}`)
  console.log(`💰 Amount: ${data?.amount || 'unknown'}`)
  console.log(`🆔 Price ID: ${getPaddlePriceId(data)}`)
  console.log(`🎯 ===== END PADDLE EVENT =====\n`)
}
