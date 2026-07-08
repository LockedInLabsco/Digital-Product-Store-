import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase/client'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSignedDownloadUrl } from '@/src/lib/supabase/downloads'
import { sendDownloadEmail } from '@/src/lib/email/resend'
import { verifyPaddleWebhookSignature, getPaddleCustomerEmail, getPaddlePriceId, logPaddleEvent } from '@/src/lib/paddle'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

export async function POST(request: NextRequest) {
  console.log('\n🚀 ===== PADDLE WEBHOOK RECEIVED =====')

  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('Paddle-Signature') || ''

    console.log(`🔐 Signature header received: ${signature ? '✅ yes' : '❌ no'}`)

    // Verify webhook signature
    if (!verifyPaddleWebhookSignature(body, signature)) {
      console.error('❌ Webhook signature verification failed')
      console.log('🚀 ===== END WEBHOOK (INVALID SIGNATURE) =====\n')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the JSON body
    const data = JSON.parse(body)
    const eventType = data?.event_type
    const transaction = data?.data

    if (!eventType || !transaction) {
      console.error('❌ Missing event_type or transaction data')
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    logPaddleEvent(eventType, transaction)

    // Only process successful payment events
    if (eventType === 'transaction.completed') {
      console.log('📦 Processing successful payment...')

      // Extract customer email
      const customerEmail = getPaddleCustomerEmail(transaction)
      if (!customerEmail) {
        console.error('❌ Customer email not found in transaction')
        return NextResponse.json(
          { error: 'Customer email not found' },
          { status: 400 }
        )
      }

      console.log(`📧 Customer Email: ${customerEmail}`)

      // Extract price ID
      const priceId = getPaddlePriceId(transaction)
      if (!priceId) {
        console.error('❌ Price ID not found in transaction')
        return NextResponse.json(
          { error: 'Price ID not found' },
          { status: 400 }
        )
      }

      console.log(`💰 Price ID: ${priceId}`)

      // Find product by paddle_price_id
      console.log(`🔍 Looking up product by price ID...`)
      const { data: product, error: queryError } = await supabase
        .from('products')
        .select('id, title, file_path, slug')
        .eq('paddle_price_id', priceId)
        .single()

      if (queryError || !product) {
        console.error(`❌ Product not found for price ID: ${priceId}`)
        console.error('Error:', queryError)
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }

      console.log(`✅ Product found: ${product.title}`)
      console.log(`   File Path: ${product.file_path}`)

      // Verify file exists
      if (!product.file_path) {
        console.error(`❌ No file_path for product: ${product.title}`)
        return NextResponse.json(
          { error: 'Product file not configured' },
          { status: 400 }
        )
      }

      // Generate signed download URL
      console.log(`🔗 Generating signed URL...`)
      const signedUrl = await getSignedDownloadUrl(
        product.file_path,
        EMAIL_SIGNED_URL_EXPIRY_SECONDS
      )

      if (!signedUrl) {
        console.error(`❌ Failed to generate signed URL`)
        return NextResponse.json(
          { error: 'Failed to generate download link' },
          { status: 500 }
        )
      }

      console.log(`✅ Signed URL generated`)

      // Send download email
      console.log(`📧 Sending download email to ${customerEmail}...`)
      const emailResult = await sendDownloadEmail({
        email: customerEmail,
        productTitle: product.title,
        downloadUrl: signedUrl,
      })

      if (!emailResult.success) {
        console.error(`❌ Email send failed: ${emailResult.error}`)
        // Don't fail the webhook - the payment was successful
        // Customer can contact support if they don't receive the email
      } else {
        console.log(`✅ Email sent successfully`)
      }

      console.log('✅ Payment processed successfully')
      console.log('🚀 ===== END WEBHOOK (SUCCESS) =====\n')
      return NextResponse.json({ success: true })
    }

    // For other events, just acknowledge
    console.log(`📌 Ignoring event type: ${eventType}`)
    console.log('🚀 ===== END WEBHOOK (IGNORED) =====\n')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Exception in Paddle webhook:')
    console.error('   Error:', error)
    console.error('   Message:', error instanceof Error ? error.message : String(error))
    console.log('🚀 ===== END WEBHOOK (ERROR) =====\n')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
