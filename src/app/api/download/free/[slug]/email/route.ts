import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase/client'
import { getSignedDownloadUrl } from '@/src/lib/supabase/downloads'
import { sendDownloadEmail } from '@/src/lib/email/resend'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  console.log('\n🚀 ===== EMAIL DOWNLOAD API ROUTE CALLED =====')
  try {
    const slug = params.slug
    console.log(`📋 SLUG: ${slug}`)

    if (!slug) {
      console.log('❌ Slug is missing')
      return NextResponse.json(
        { error: 'Missing product slug' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const email = body.email?.trim()
    console.log(`📧 EMAIL: ${email}`)

    if (!email) {
      console.log('❌ Email is missing')
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      console.log(`❌ Email validation failed: ${email}`)
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    console.log(`✅ Email validation passed`)

    console.log(`🔍 Fetching product from Supabase with slug: ${slug}`)
    const { data: product, error: queryError } = await supabase
      .from('products')
      .select('id, title, price, file_path')
      .eq('slug', slug)
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

    if (!filePath) {
      console.error(`❌ No file_path set for product: ${product.title}`)
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
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    console.log(`✅ Signed URL generated (${signedUrl.length} chars)`)

    console.log(`📧 Calling sendDownloadEmail()...`)
    const emailResult = await sendDownloadEmail({
      email,
      productTitle: product.title,
      downloadUrl: signedUrl,
    })

    console.log(`📧 Email result:`, emailResult)

    if (!emailResult.success) {
      console.error(`❌ Email send failed: ${emailResult.error}`)
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      )
    }

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