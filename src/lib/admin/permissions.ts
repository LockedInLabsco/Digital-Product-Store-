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
  'personal_brand:read',
  'personal_brand:write',
  'personal_brand:ai',
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

  // Owns the Personal Brand Content OS day-to-day, alongside its
  // existing store-side scope (waitlists/media read, analytics) — this
  // is the role that actually logs content and runs the Instagram sync,
  // not the owner account.
  social_media: [
    'dashboard:read',
    'analytics:read',
    'waitlists:read',
    'media:read',
    'personal_brand:read',
    'personal_brand:write',
    'personal_brand:ai',
  ],

  analyst: ['dashboard:read', 'analytics:read'],

  // Scoped to just the Personal Brand workspace — for a person who
  // should see nothing else in the admin. dashboard:read is the one
  // addition beyond personal_brand:* itself, needed only so this role
  // can render the shared AdminShell top bar/Account page like every
  // other role, not as access to the store dashboard's content.
  personal_brand: ['dashboard:read', 'personal_brand:read', 'personal_brand:write', 'personal_brand:ai'],
}

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return permissionsForRole(role).includes(permission)
}

/**
 * The union of every permission across all roles an admin holds — an
 * admin with ['social_media', 'analyst'] gets everything either role
 * grants, not just one of them. This is the only permission resolution
 * used for a real admin (see toCurrentAdmin in lib/admin/auth.ts); the
 * single-role helpers above stay for testing one role's own grants in
 * isolation.
 */
export function permissionsForRoles(roles: AdminRole[]): AdminPermission[] {
  const combined = new Set<AdminPermission>()
  for (const role of roles) {
    for (const permission of permissionsForRole(role)) combined.add(permission)
  }
  return Array.from(combined)
}

export const ADMIN_ROLES: AdminRole[] = ['owner', 'developer', 'social_media', 'analyst', 'personal_brand']

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Founder',
  developer: 'Developer',
  social_media: 'Social Media',
  analyst: 'Analyst',
  personal_brand: 'Personal Brand',
}
