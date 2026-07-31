import { cache } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from './client'
import { DatabaseProduct, Product } from '@/src/types/product'
import { transformDatabaseProductToProduct } from './transforms'

export interface ActiveProductsResult {
  products: Product[]
  error: boolean
}

export interface ActiveProductResult {
  product?: Product
  error: boolean
}

export async function getActiveProducts(): Promise<ActiveProductsResult> {
  noStore()

  console.log('[Products] Fetching active Supabase products', {
    supabaseConfigured: Boolean(supabase),
  })

  if (!supabase) {
    console.error('[Products] Supabase public env vars are not configured')
    return { products: [], error: true }
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Products] Supabase product query failed', {
        message: error.message,
        code: error.code,
        details: error.details,
      })
      return { products: [], error: true }
    }

    const products = (data || []).map((dbProduct: DatabaseProduct) =>
      transformDatabaseProductToProduct(dbProduct)
    )

    console.log('[Products] Active product query complete', {
      count: products.length,
      slugs: products.map((product) => product.slug),
    })

    return { products, error: false }
  } catch (error) {
    console.error('[Products] Exception fetching active products', error)
    return { products: [], error: true }
  }
}

export const getActiveProductBySlug = cache(async function getActiveProductBySlug(
  slug: string
): Promise<ActiveProductResult> {
  noStore()

  console.log('[Products] Fetching active Supabase product by slug', {
    slug,
    supabaseConfigured: Boolean(supabase),
  })

  if (!supabase) {
    console.error('[Products] Supabase public env vars are not configured')
    return { product: undefined, error: true }
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[Products] Supabase product-by-slug query failed', {
        slug,
        message: error.message,
        code: error.code,
        details: error.details,
      })
      return { product: undefined, error: true }
    }

    if (!data) {
      console.log('[Products] Active product not found', { slug })
      return { product: undefined, error: false }
    }

    return {
      product: transformDatabaseProductToProduct(data as DatabaseProduct),
      error: false,
    }
  } catch (error) {
    console.error('[Products] Exception fetching product by slug', {
      slug,
      error,
    })
    return { product: undefined, error: true }
  }
})
