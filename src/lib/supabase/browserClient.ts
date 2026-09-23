'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Browser-side Supabase client for admin auth actions (Google OAuth,
 * email magic link, sign-out) — uses @supabase/ssr's cookie-based
 * storage instead of plain createClient's localStorage, so the session
 * it creates is readable by the server (middleware, Server Components,
 * Route Handlers) via lib/supabase/auth.ts's createSupabaseServerClient.
 *
 * Distinct from lib/supabase/client.ts, which stays as the plain public
 * anon client used for unauthenticated storefront reads — that one
 * never needs to share a session with the server, so it's untouched.
 *
 * A function, not a singleton export, so each Client Component that
 * needs it creates its own instance (the standard @supabase/ssr
 * pattern) — cheap, and avoids any risk of stale state across route
 * changes.
 */
export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
