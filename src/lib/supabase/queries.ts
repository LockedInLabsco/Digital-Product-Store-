import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from './client'
import { DatabaseProduct, Product } from '@/src/types/product'
import { transformDatabaseProductToProduct } from './transforms'

export async function getActiveProducts(): Promise<Product[]> {
  noStore()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[Products] Fetching active Supabase products', {
    supabaseUrlConfigured: Boolean(supabaseUrl),
    supabaseAnonKeyConfigured: Boolean(supabaseAnonKey),
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Products] Supabase public env vars are not configured')
    return []
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
      return []
    }

    const products = (data || []).map((dbProduct: DatabaseProduct) =>
      transformDatabaseProductToProduct(dbProduct)
    )

    console.log('[Products] Active product query complete', {
      count: products.length,
      slugs: products.map((product) => product.slug),
    })

    return products
  } catch (error) {
    console.error('[Products] Exception fetching active products', error)
    return []
  }
}

export async function getActiveProductBySlug(
  slug: string
): Promise<Product | undefined> {
  noStore()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[Products] Fetching active Supabase product by slug', {
    slug,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Products] Supabase public env vars are not configured')
    return undefined
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
      return undefined
    }

    if (!data) {
      console.log('[Products] Active product not found', { slug })
      return undefined
    }

    return transformDatabaseProductToProduct(data as DatabaseProduct)
  } catch (error) {
    console.error('[Products] Exception fetching product by slug', {
      slug,
      error,
    })
    return undefined
  }
}
