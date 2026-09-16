import { NextRequest } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'not4normal_admin_session'

interface CookieStore {
  get(name: string): { value: string } | undefined
}

function isAdminCookieStore(cookies: CookieStore): boolean {
  return cookies.get(ADMIN_SESSION_COOKIE)?.value === 'authenticated'
}

export function isAdminRequest(request: NextRequest): boolean {
  return isAdminCookieStore(request.cookies)
}

/**
 * Same check as isAdminRequest, for Server Components reading the
 * cookie via next/headers' cookies() instead of a NextRequest — used to
 * gate the admin-only draft-waitlist preview on the public page.
 */
export function isAdminSession(cookies: CookieStore): boolean {
  return isAdminCookieStore(cookies)
}
