import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { isAdminRequest } from '@/src/lib/admin/auth'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// GET all products (for admin listing)
export async function GET(request: NextRequest) {
  console.log('🔍 [GET /api/admin/products] Fetching all products for admin')

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all products including inactive ones
    const { data, error } = await supabaseServer
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${data?.length || 0} products`)
    return NextResponse.json({ products: data || [] })
  } catch (error) {
    console.error('❌ Exception in GET products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  console.log('📝 [POST /api/admin/products] Creating new product')

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'slug', 'description', 'short_description']
    for (const field of requiredFields) {
      if (!body[field]) {
        console.error(`❌ Missing required field: ${field}`)
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      console.error('❌ Missing or invalid required field: price')
      return NextResponse.json(
        { error: 'Missing or invalid required field: price' },
        { status: 400 }
      )
    }

    if (!SLUG_PATTERN.test(body.slug)) {
      console.error(`❌ Invalid slug format: ${body.slug}`)
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "my-product-name")' },
        { status: 400 }
      )
    }

    console.log(`📦 Creating product: "${body.title}"`)

    const { data: existingProduct } = await supabaseServer
      .from('products')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existingProduct) {
      console.error(`❌ Duplicate slug: ${body.slug}`)
      return NextResponse.json(
        { error: `A product with the slug "${body.slug}" already exists. Please choose a different slug.` },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseServer
      .from('products')
      .insert([
        {
          title: body.title,
          slug: body.slug,
          description: body.description,
          short_description: body.short_description,
          price: body.price || 0,
          currency: body.currency || 'USD',
          cover_image_url: body.cover_image_url || null,
          file_path: body.file_path || null,
          paddle_product_id: body.paddle_product_id || null,
          paddle_price_id: body.paddle_price_id || null,
          is_active: body.is_active !== false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('❌ Insert error:', error.message)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A product with the slug "${body.slug}" already exists. Please choose a different slug.` },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    console.log(`✅ Product created:`, data?.[0]?.id)
    return NextResponse.json({ product: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('❌ Exception in POST product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
