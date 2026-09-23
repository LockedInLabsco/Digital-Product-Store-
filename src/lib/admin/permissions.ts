import type { AdminPermission, AdminRole } from '@/src/types/admin'

/**
 * Every permission that exists in the system. `owner` is granted all of
 * these explicitly (rather than special-cased as "bypasses checks") so
 * hasPermission()/requirePermission() never need role-specific branches —
 * one lookup table, one code path, for every role including owner.
 */
export const ALL_PERMISSIONS: AdminPermission[] = [
  'dashboard:read',
  'analytics:read',
  'waitlists:read',
  'waitlists:write',
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'media:read',
  'media:write',
  'hero_slider:read',
  'hero_slider:write',
  'team:read',
  'team:manage',
  'settings:read',
  'settings:write',
]

/**
 * The single source of truth for what each role can do. Extend a role by
 * editing its array here — nothing else needs to change. Adding a new
 * role (e.g. 'editor', 'support') means: add it to AdminRole in
 * types/admin.ts, add a check constraint value in the admin_users
 * migration, and add an entry here.
 */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: ALL_PERMISSIONS,

  developer: [
    'dashboard:read',
    'analytics:read',
    'waitlists:read',
    'waitlists:write',
    'products:read',
    'products:write',
    'orders:read',
    'media:read',
    'media:write',
    'hero_slider:read',
    'hero_slider:write',
  ],

  social_media: ['dashboard:read', 'analytics:read', 'waitlists:read', 'media:read'],

  analyst: ['dashboard:read', 'analytics:read'],
}

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return permissionsForRole(role).includes(permission)
}

export const ADMIN_ROLES: AdminRole[] = ['owner', 'developer', 'social_media', 'analyst']

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner',
  developer: 'Developer',
  social_media: 'Social Media',
  analyst: 'Analyst',
}
