import { supabase } from './client'
import { DatabaseProduct, Product } from '@/src/types/product'
import { transformDatabaseProductToProduct } from './transforms'
import { getProducts, getProductBySlug as getHardcodedProductBySlug } from '@/src/lib/products'

/**
 * Fetch all active products from Supabase
 * Falls back to hardcoded products if Supabase is not configured or fails
 */
export async function getProductsWithFallback(): Promise<Product[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔍 [getProductsWithFallback] Starting product fetch...')
  console.log(`📍 Supabase URL configured: ${!!supabaseUrl}`)
  console.log(`📍 Supabase Anon Key configured: ${!!supabaseAnonKey}`)

  // If Supabase is not configured, use hardcoded products
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️  Supabase not configured, using fallback products')
    return getProducts()
  }

  try {
    console.log('🚀 Querying Supabase products table...')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase Error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
      })
      return getProducts()
    }

    console.log(`✅ Query successful! Raw data received: ${data?.length || 0} products`)

    if (data) {
      console.log('📦 Products from Supabase:', data.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        is_active: p.is_active,
      })))
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No products found in Supabase, using fallback products')
      return getProducts()
    }

    // Transform database products to frontend products
    const products = data.map((dbProduct: DatabaseProduct) =>
      transformDatabaseProductToProduct(dbProduct)
    )

    console.log(`✅ Successfully loaded ${products.length} products from Supabase`)
    console.log('Product titles:', products.map(p => p.title).join(', '))
    return products
  } catch (error) {
    console.error('❌ Exception in getProductsWithFallback:', error)
    return getProducts()
  }
}

/**
 * Fetch a single product by slug from Supabase
 * Falls back to hardcoded products if Supabase is not configured or fails
 */
export async function getProductBySlugWithFallback(
  slug: string
): Promise<Product | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log(`🔍 [getProductBySlugWithFallback] Fetching product: "${slug}"`)
  console.log(`📍 Supabase configured: ${!!supabaseUrl && !!supabaseAnonKey}`)

  // If Supabase is not configured, use hardcoded products
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log(`⚠️  Supabase not configured, using fallback for "${slug}"`)
    return getHardcodedProductBySlug(slug)
  }

  try {
    console.log(`🚀 Querying Supabase for slug="${slug}"`)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      console.log(`⚠️  Supabase error for "${slug}":`, error.message)
      console.log(`⚠️  Using fallback product for "${slug}"`)
      return getHardcodedProductBySlug(slug)
    }

    if (!data) {
      console.log(`⚠️  No data returned for "${slug}", using fallback`)
      return getHardcodedProductBySlug(slug)
    }

    // Transform database product to frontend product
    const product = transformDatabaseProductToProduct(data as DatabaseProduct)
    console.log(`✅ Loaded product "${slug}" from Supabase`)
    return product
  } catch (error) {
    console.error(`❌ Exception fetching "${slug}":`, error)
    return getHardcodedProductBySlug(slug)
  }
}
