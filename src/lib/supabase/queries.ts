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

  // If Supabase is not configured, use hardcoded products
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase not configured, using fallback products')
    return getProducts()
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return getProducts()
    }

    if (!data || data.length === 0) {
      console.log('No products found in Supabase, using fallback products')
      return getProducts()
    }

    // Transform database products to frontend products
    const products = data.map((dbProduct: DatabaseProduct) =>
      transformDatabaseProductToProduct(dbProduct)
    )

    console.log(`Loaded ${products.length} products from Supabase`)
    return products
  } catch (error) {
    console.error('Failed to fetch products from Supabase:', error)
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

  // If Supabase is not configured, use hardcoded products
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase not configured, using fallback product')
    return getHardcodedProductBySlug(slug)
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      console.log(
        `Product "${slug}" not found in Supabase, using fallback product`
      )
      return getHardcodedProductBySlug(slug)
    }

    if (!data) {
      return getHardcodedProductBySlug(slug)
    }

    // Transform database product to frontend product
    const product = transformDatabaseProductToProduct(data as DatabaseProduct)
    console.log(`Loaded product "${slug}" from Supabase`)
    return product
  } catch (error) {
    console.error('Failed to fetch product from Supabase:', error)
    return getHardcodedProductBySlug(slug)
  }
}
