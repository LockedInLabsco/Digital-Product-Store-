import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials missing for auth')
}

// Server-side auth client (uses service role for admin operations)
export const supabaseAuth = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
)

/**
 * Get current user session (client-side)
 */
export async function getCurrentUser() {
  const { data, error } = await supabaseAuth.auth.admin.listUsers()
  return { data, error }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Auth error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Sign in exception:', error)
    return { success: false, error: 'Failed to sign in' }
  }
}

/**
 * Create admin user (one-time setup)
 * Run this once to create the admin user
 */
export async function createAdminUser(email: string, password: string) {
  try {
    const { data, error } = await supabaseAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
    })

    if (error) {
      console.error('Create user error:', error.message)
      return { success: false, error: error.message }
    }

    console.log('✅ Admin user created:', email)
    return { success: true, data }
  } catch (error) {
    console.error('Create user exception:', error)
    return { success: false, error: 'Failed to create admin user' }
  }
}

/**
 * Verify auth token
 */
export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token)

    if (error || !data.user) {
      return { valid: false, user: null }
    }

    return { valid: true, user: data.user }
  } catch (error) {
    console.error('Token verification error:', error)
    return { valid: false, user: null }
  }
}
