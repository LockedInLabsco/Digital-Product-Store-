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

  // Work system (teams/tasks). These gate entry into /admin/work and its
  // API routes only — WHICH teams/tasks a given admin can actually see
  // or touch within that is a separate, relational question answered by
  // getWorkScope() (src/lib/admin/workScope.ts) from wk_team_members,
  // never by this flat table alone. 'work:read_team' is reserved for a
  // future role that should see every team's work without being a lead
  // of each one; nothing is granted it in V1 (team-scoped visibility
  // today comes from actual wk_team_members lead rows, not a role).
  'work:read_own',
  'work:read_team',
  'work:read_all',
  'work:manage_teams',
  'work:manage_all',
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
    // Conservative default (see Work System Phase 1 report, §3): every
    // existing role gets its own Work workspace, nothing company-wide.
    'work:read_own',
  ],

  // Owns the Personal Brand Content OS day-to-day — this is the role
  // that actually logs content and runs the Instagram sync, not the
  // owner account. Scoped to Personal Brand only: no store-side read
  // access (waitlists/media/analytics), since this role's admin UI is
  // its own focused workspace, not a restricted view of the full admin
  // panel — see AdminShell's social-media-only nav branch.
  social_media: [
    'dashboard:read',
    'personal_brand:read',
    'personal_brand:write',
    'personal_brand:ai',
    // Own Work workspace only — does NOT appear in PERSONAL_BRAND_NAV_ITEMS
    // (AdminShell's focused nav for social_media-only admins), consistent
    // with keeping that nav unchanged; still reachable/enforced via direct
    // URL + API, same as every permission check in this codebase.
    'work:read_own',
  ],

  analyst: ['dashboard:read', 'analytics:read', 'work:read_own'],
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

export const ADMIN_ROLES: AdminRole[] = ['owner', 'developer', 'social_media', 'analyst']

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Founder',
  developer: 'Developer',
  social_media: 'Social Media',
  analyst: 'Analyst',
}
