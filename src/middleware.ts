import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/src/lib/supabase/middlewareClient'

/**
 * Runs before any /admin/* route renders. Two jobs, deliberately kept
 * separate from the finer-grained admin_users/role check:
 *
 * 1. Refresh the Supabase session cookie on every request (the
 *    documented @supabase/ssr pattern — calling getUser() here is what
 *    keeps a signed-in admin's session alive across requests; without
 *    this, Server Components would see stale/expired tokens).
 * 2. Reject a request with NO Supabase session at all before it ever
 *    reaches a page — this is the fix for the old flash bug: no
 *    protected UI can render, not even for a moment, if there's no
 *    session cookie whatsoever.
 *
 * Membership in admin_users (is this authenticated user actually an
 * admin, and with what role?) is deliberately NOT checked here — that
 * needs a database read, and doing it in the layout
 * (src/app/admin/(protected)/layout.tsx) instead keeps middleware fast
 * and keeps "authenticated" vs "authorized as admin" as distinct,
 * separately-testable checks (see getCurrentAdmin in
 * src/lib/admin/auth.ts). The /admin/login page itself independently
 * checks getCurrentAdmin() to redirect an already-authorized admin
 * straight to /admin.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginRoute = pathname === '/admin/login'

  if (!isAdminRoute) {
    return response
  }

  const supabase = createSupabaseMiddlewareClient(request, response)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isLoginRoute) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
