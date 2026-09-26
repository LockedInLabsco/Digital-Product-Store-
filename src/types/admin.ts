/**
 * Core types for the admin team/role system. `AdminPermission` is the
 * single source of truth for what a route or UI element can require —
 * see lib/admin/permissions.ts for the role -> permissions mapping and
 * lib/admin/auth.ts for how a request's permissions are resolved.
 */

export type AdminRole = 'owner' | 'developer' | 'social_media' | 'analyst' | 'personal_brand'

export type AdminStatus = 'active' | 'disabled'

export type AdminPermission =
  | 'dashboard:read'
  | 'analytics:read'
  | 'waitlists:read'
  | 'waitlists:write'
  | 'products:read'
  | 'products:write'
  | 'orders:read'
  | 'orders:write'
  | 'media:read'
  | 'media:write'
  | 'hero_slider:read'
  | 'hero_slider:write'
  | 'team:read'
  | 'team:manage'
  | 'settings:read'
  | 'settings:write'
  | 'personal_brand:read'
  | 'personal_brand:write'
  | 'personal_brand:ai'

/** Row shape of public.admin_users (email is denormalized onto the row
 * at invite-accept/bootstrap time — see getCurrentAdmin — so the team
 * page never needs a separate privileged auth.users lookup to list it).
 * `roles` holds one or more roles (e.g. ['owner', 'social_media']) —
 * permissions are the union of every role held, see
 * lib/admin/permissions.ts's permissionsForRoles(). Always non-empty. */
export interface AdminUser {
  id: string
  user_id: string
  email: string
  roles: AdminRole[]
  status: AdminStatus
  invited_by: string | null
  created_at: string
  updated_at: string
}

export type AdminInviteStatus = 'pending' | 'accepted' | 'revoked'

/** Row shape of public.admin_invites. */
export interface AdminInvite {
  id: string
  email: string
  roles: AdminRole[]
  status: AdminInviteStatus
  invited_by: string | null
  created_at: string
  expires_at: string
}

/**
 * The resolved identity + authorization for the current request —
 * everything an admin route or page needs, and nothing more (no raw
 * Supabase Auth session/tokens). Returned by getCurrentAdmin().
 */
export interface CurrentAdmin {
  user: {
    id: string
    email: string
  }
  roles: AdminRole[]
  permissions: AdminPermission[]
}
