import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { isAdminRequest } from '@/src/lib/admin/auth'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  console.log(`🔍 [GET /api/admin/products/${id}] Fetching product`)

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Fetched product: "${data.title}"`)
    return NextResponse.json({ product: data })
  } catch (error) {
    console.error('❌ Exception in GET product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  console.log(`✏️ [PUT /api/admin/products/${id}] Updating product`)

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (body.slug && !SLUG_PATTERN.test(body.slug)) {
      console.error(`❌ Invalid slug format: ${body.slug}`)
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "my-product-name")' },
        { status: 400 }
      )
    }

    if (body.slug) {
      const { data: existingProduct } = await supabaseServer
        .from('products')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', id)
        .maybeSingle()

      if (existingProduct) {
        console.error(`❌ Duplicate slug: ${body.slug}`)
        return NextResponse.json(
          { error: `A product with the slug "${body.slug}" already exists. Please choose a different slug.` },
          { status: 409 }
        )
      }
    }

    console.log(`📦 Updating product: "${body.title || 'Unknown'}"`)

    const { data, error } = await supabaseServer
      .from('products')
      .update({
        title: body.title,
        slug: body.slug,
        description: body.description,
        short_description: body.short_description,
        price: body.price,
        currency: body.currency,
        cover_image_url: body.cover_image_url,
        file_path: body.file_path,
        paddle_product_id: body.paddle_product_id,
        paddle_price_id: body.paddle_price_id,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Update error:', error.message)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A product with the slug "${body.slug}" already exists. Please choose a different slug.` },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      console.error('❌ Product not found')
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Product updated: "${data[0].title}"`)
    return NextResponse.json({ product: data[0] })
  } catch (error) {
    console.error('❌ Exception in PUT product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  console.log(`🗑️ [DELETE /api/admin/products/${id}] Deleting product`)

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('products')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Delete error:', error.message)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    console.log(`✅ Product deleted`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Exception in DELETE product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
