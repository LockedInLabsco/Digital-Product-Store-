/**
 * Admin "mode" — which toolset the sidebar currently shows (Founder,
 * Developer, Social Media, ...) for an admin holding multiple roles.
 * Deliberately modeled as UI/navigation context ONLY, never
 * authorization — see this file's own functions below, none of which
 * gate anything; every route/page keeps using requirePermission()/
 * hasPermission() exactly as before. The one invariant this file
 * enforces is narrower and purely defensive: the mode a cookie claims
 * must be one of the roles this admin ACTUALLY holds right now, or it
 * is ignored — a stale preference can never be read as "this admin is
 * now authorized for X."
 *
 * Deliberately NOT a blocking "choose your mode" screen the way
 * getActiveWorkspaceContext() blocks on an ambiguous Social Workspace —
 * mode always resolves to something sensible (a single role, a
 * remembered valid choice, or a fixed priority order), so logging in
 * never interrupts an admin with a selector they didn't ask for.
 */
import 'server-only'
import { cookies } from 'next/headers'
import type { AdminRole, CurrentAdmin } from '@/src/types/admin'

export const ADMIN_MODE_COOKIE = 'n4n_admin_mode'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * Only used when there is no remembered (or no longer valid) mode
 * preference and the admin holds more than one role — picks the first
 * role in this list the admin actually has. Founder first (the
 * business-wide view is the most likely "home" for anyone who holds
 * it), then Social Media (the other fully-distinct day-to-day app),
 * then Developer, then Analyst (the narrowest role, essentially a
 * read-only subset of Founder's own nav).
 */
const MODE_PRIORITY: AdminRole[] = ['owner', 'social_media', 'developer', 'analyst']

/**
 * Resolves which mode is currently active for this admin: the stored
 * cookie if it names a role they still hold, otherwise their only role
 * (no ambiguity to resolve), otherwise the first role MODE_PRIORITY
 * finds among the roles they hold. Always returns a real role this
 * admin has — never throws, never returns something requiring a
 * blocking choice.
 */
export function resolveActiveAdminMode(admin: CurrentAdmin, cookieMode: string | null): AdminRole {
  if (cookieMode && admin.roles.includes(cookieMode as AdminRole)) {
    return cookieMode as AdminRole
  }
  if (admin.roles.length === 1) {
    return admin.roles[0]
  }
  for (const candidate of MODE_PRIORITY) {
    if (admin.roles.includes(candidate)) return candidate
  }
  // Unreachable while MODE_PRIORITY covers every AdminRole value (it
  // does) and admin.roles is non-empty (guaranteed — see AdminUser's
  // own doc comment) — kept as an explicit, safe fallback rather than a
  // non-null assertion.
  return admin.roles[0]
}

/** Reads the raw mode cookie value for the current request — pass straight into resolveActiveAdminMode. */
export function readAdminModeCookie(): string | null {
  return cookies().get(ADMIN_MODE_COOKIE)?.value || null
}

/** Route Handlers only (cookies().set throws from a Server Component render) — call after independently verifying the admin actually holds this role; this function itself does not check. */
export function setAdminModeCookie(mode: AdminRole): void {
  cookies().set(ADMIN_MODE_COOKIE, mode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}
