import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Session-aware Supabase client for Server Components and Route
 * Handlers — reads the current request's Supabase Auth session from
 * cookies (refreshed by middleware.ts on every request) via the anon
 * key, so it only ever sees what RLS allows for the signed-in user.
 *
 * This is NOT the privileged client — for that, use `supabaseServer`
 * from lib/supabase/server.ts (service-role key, bypasses RLS, used for
 * admin_users/admin_invites reads+writes and other privileged
 * operations). Keeping these two clients in separate files/exports is
 * deliberate: it makes "which client am I using and why" obvious at
 * every call site instead of one client silently doing both jobs.
 *
 * Cookie writes are wrapped in try/catch because Server Components are
 * not allowed to set cookies (only Route Handlers/Server Actions/
 * middleware can) — middleware.ts is what actually persists a refreshed
 * session; a Server Component just needs to be able to read it without
 * throwing.
 */
export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component render, which can't set
          // cookies — no-op; middleware.ts owns refreshing/persisting
          // the session cookie on every request instead.
        }
      },
    },
  })
}

/** The current request's authenticated Supabase Auth user, or null. Does
 * NOT check admin_users membership — see getCurrentAdmin() in
 * lib/admin/auth.ts for the full authentication + authorization check. */
export async function getSupabaseUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
