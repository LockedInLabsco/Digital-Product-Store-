import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Session-refreshing Supabase client for middleware.ts. Reads cookies
 * off the incoming request and writes any refreshed session back onto
 * the outgoing response — this is what keeps a signed-in admin's
 * session alive across requests without every Server Component needing
 * to handle token refresh itself (they can't — see
 * lib/supabase/auth.ts's createSupabaseServerClient doc comment).
 */
export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
}
