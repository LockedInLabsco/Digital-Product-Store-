import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSignedDownloadUrl } from '@/src/lib/supabase/downloads'

const FREE_DOWNLOAD_EXPIRY_SECONDS = 60 * 60 * 24

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing product slug' },
        { status: 400 }
      )
    }

    console.log('Free download request for slug: ' + slug)

    const { data: product, error: queryError } = await supabaseServer
      .from('products')
      .select('id, title, price, file_path')
      .eq('slug', slug)
      .single()

    if (queryError || !product) {
      console.error('Product not found for slug: ' + slug)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.price !== 0) {
      console.error('Product is not free. Price: ' + product.price)
      return NextResponse.json(
        { error: 'This product is not free' },
        { status: 403 }
      )
    }

    const filePath = product.file_path

    if (!filePath) {
      console.error('No file_path set for product: ' + product.title)
      return NextResponse.json(
        {
          error: 'This product does not have a downloadable file yet',
          productId: product.id,
        },
        { status: 400 }
      )
    }

    console.log('Found file_path: ' + filePath)

    const signedUrl = await getSignedDownloadUrl(
      filePath,
      FREE_DOWNLOAD_EXPIRY_SECONDS
    )

    if (!signedUrl) {
      console.error('Failed to generate signed URL for: ' + filePath)
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    console.log('Signed URL generated')

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Error in free download API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}