import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase/client'
import { supabaseServer } from '@/src/lib/supabase/server'

// GET all products (for admin listing)
export async function GET(request: NextRequest) {
  console.log('🔍 [GET /api/admin/products] Fetching all products for admin')

  try {
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
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'slug', 'description', 'short_description', 'price']
    for (const field of requiredFields) {
      if (!body[field]) {
        console.error(`❌ Missing required field: ${field}`)
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    console.log(`📦 Creating product: "${body.title}"`)

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
