import { NextRequest } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'not4normal_admin_session'

export function isAdminRequest(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === 'authenticated'
}
