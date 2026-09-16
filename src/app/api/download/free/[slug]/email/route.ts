import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSignedDownloadUrl } from '@/src/lib/supabase/downloads'
import { sendDownloadEmail } from '@/src/lib/email/resend'
import { AttributionPayload } from '@/src/types/attribution'
import { sanitizeAttribution, sanitizeDeviceCategory } from '@/src/lib/analytics/sanitizeAttribution'
import { getDuplicateClaimCutoff, validateFreeClaimInput } from '@/src/lib/free-download/claim'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

interface RecordFreeDownloadInput {
  productId: string | null
  productSlug: string
  productTitle: string
  email: string
  firstName: string
  downloadStatus: 'delivered' | 'failed'
  emailDeliveryStatus: 'sent' | 'failed'
  errorMessage?: string | null
  attribution: Partial<AttributionPayload>
  deviceCategory: string | null
}

async function recordFreeDownload(input: RecordFreeDownloadInput) {
  const { error } = await supabaseServer.from('free_downloads').insert({
    product_id: input.productId,
    product_slug: input.productSlug,
    product_title: input.productTitle,
    email: input.email,
    first_name: input.firstName,
    download_status: input.downloadStatus,
    email_delivery_status: input.emailDeliveryStatus,
    error_message: input.errorMessage || null,
    first_touch_source: input.attribution.first_touch_source || null,
    first_touch_medium: input.attribution.first_touch_medium || null,
    first_touch_campaign: input.attribution.first_touch_campaign || null,
    first_touch_content: input.attribution.first_touch_content || null,
    last_touch_source: input.attribution.last_touch_source || null,
    last_touch_medium: input.attribution.last_touch_medium || null,
    last_touch_campaign: input.attribution.last_touch_campaign || null,
    referrer_domain: input.attribution.referrer_domain || null,
    landing_page: input.attribution.landing_page || null,
    device_category: input.deviceCategory,
  })

  if (error) {
    // Never let analytics logging break the actual delivery flow.
    console.error('[Free Download] Failed to record free_downloads row', error.message)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  console.log('\n🚀 ===== EMAIL DOWNLOAD API ROUTE CALLED =====')
  try {
    const slug = params.slug ? decodeURIComponent(params.slug) : params.slug
    console.log(`📋 SLUG: ${slug}`)

    if (!slug) {
      console.log('❌ Slug is missing')
      return NextResponse.json(
        { error: 'Missing product slug' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = validateFreeClaimInput({
      firstName: body.firstName,
      email: body.email,
    })
    const attribution = sanitizeAttribution(body.attribution)
    const deviceCategory = sanitizeDeviceCategory(body.deviceCategory)

    if (!validation.value) {
      return NextResponse.json(
        {
          error: 'Check your name and email address.',
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 }
      )
    }

    const { firstName, email } = validation.value

    console.log(`🔍 Fetching product from Supabase with slug: ${slug}`)
    const { data: product, error: queryError } = await supabaseServer
      .from('products')
      .select('id, title, price, file_path')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (queryError) {
      console.error(`❌ Supabase query error:`, queryError)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product) {
      console.error(`❌ Product not found for slug: ${slug}`)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Product found:`)
    console.log(`   ID: ${product.id}`)
    console.log(`   TITLE: ${product.title}`)
    console.log(`   PRICE: ${product.price}`)
    console.log(`   FILE_PATH: ${product.file_path}`)

    if (product.price !== 0) {
      console.error(`❌ Product is not free. Price: ${product.price}`)
      return NextResponse.json(
        { error: 'This product is not free' },
        { status: 403 }
      )
    }

    const filePath = product.file_path
    const recordBase = {
      productId: product.id,
      productSlug: slug,
      productTitle: product.title,
      email,
      firstName,
      attribution,
      deviceCategory,
    }

    const { data: recentClaims, error: duplicateCheckError } = await supabaseServer
      .from('free_downloads')
      .select('id')
      .eq('product_id', product.id)
      .eq('email', email)
      .eq('download_status', 'delivered')
      .gte('created_at', getDuplicateClaimCutoff())
      .limit(1)

    if (duplicateCheckError) {
      console.error('[Free Download] Duplicate check failed', duplicateCheckError.message)
    } else if (recentClaims && recentClaims.length > 0) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: 'Your guide was already sent. Check your email.',
      })
    }

    if (!filePath) {
      console.error(`❌ No file_path set for product: ${product.title}`)
      await recordFreeDownload({
        ...recordBase,
        downloadStatus: 'failed',
        emailDeliveryStatus: 'failed',
        errorMessage: 'Product does not have a downloadable file configured',
      })
      return NextResponse.json(
        {
          error: 'This product does not have a downloadable file yet',
          productId: product.id,
        },
        { status: 400 }
      )
    }

    console.log(`✅ File path validated: ${filePath}`)

    console.log(`🔗 Generating signed URL...`)
    const signedUrl = await getSignedDownloadUrl(
      filePath,
      EMAIL_SIGNED_URL_EXPIRY_SECONDS
    )

    if (!signedUrl) {
      console.error(`❌ Failed to generate signed URL for: ${filePath}`)
      await recordFreeDownload({
        ...recordBase,
        downloadStatus: 'failed',
        emailDeliveryStatus: 'failed',
        errorMessage: 'Failed to generate signed download URL',
      })
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    console.log(`📧 Calling sendDownloadEmail()...`)
    const emailResult = await sendDownloadEmail({
      email,
      firstName,
      productTitle: product.title,
      downloadUrl: signedUrl,
      isFree: true,
    })

    console.log(`📧 Email result:`, emailResult)

    if (!emailResult.success) {
      console.error(`❌ Email send failed: ${emailResult.error}`)
      await recordFreeDownload({
        ...recordBase,
        downloadStatus: 'failed',
        emailDeliveryStatus: 'failed',
        errorMessage: emailResult.error || 'Email send failed',
      })
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    await recordFreeDownload({
      ...recordBase,
      downloadStatus: 'delivered',
      emailDeliveryStatus: 'sent',
    })

    console.log(`✅ Email sent successfully!`)
    console.log('🚀 ===== END ROUTE =====\n')
    return NextResponse.json({
      success: true,
      message: 'Check your email for your free guide',
    })
  } catch (error) {
    console.error('❌ Exception in email download API:')
    console.error('   Error:', error)
    console.error('   Message:', error instanceof Error ? error.message : String(error))
    console.log('🚀 ===== END ROUTE (ERROR) =====\n')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
