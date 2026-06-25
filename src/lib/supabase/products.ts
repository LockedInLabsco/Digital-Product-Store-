import { supabase } from './client'
import { DatabaseProduct, Product } from '@/src/types/product'

/**
 * Fetch products from Supabase
 * Returns null if Supabase is not configured
 */
export async function fetchProductsFromSupabase(): Promise<DatabaseProduct[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return null
    }

    return data as DatabaseProduct[]
  } catch (error) {
    console.error('Failed to fetch products from Supabase:', error)
    return null
  }
}

/**
 * Fetch a single product by slug from Supabase
 */
export async function fetchProductBySlugFromSupabase(
  slug: string
): Promise<DatabaseProduct | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching product from Supabase:', error)
      return null
    }

    return data as DatabaseProduct
  } catch (error) {
    console.error('Failed to fetch product from Supabase:', error)
    return null
  }
}
