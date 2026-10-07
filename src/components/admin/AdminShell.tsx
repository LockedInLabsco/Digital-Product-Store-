import { hasPermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLE_LABELS } from '@/src/lib/admin/permissions'
import { ADMIN_MODE_NAV_ITEMS, ADMIN_MODE_ICONS } from '@/src/lib/admin/adminNav'
import AdminSidebarShell, { type AdminNavItem } from './AdminSidebarShell'
import { PersonalBrandNavProvider } from './PersonalBrandNavContext'
import type { AdminRole, CurrentAdmin } from '@/src/types/admin'

/**
 * The one shared admin shell — mode-filtered navigation (see
 * src/lib/admin/adminNav.ts for the centralized per-mode item lists and
 * src/lib/admin/adminMode.ts for how `mode` itself was resolved, server-
 * side, in the parent layout before this ever rendered), current
 * account, sign-out, content area, rendered as a persistent sidebar
 * (see AdminSidebarShell for the actual layout/interactivity + the mode
 * switcher itself).
 *
 * Permission filtering happens here, server-side, exactly as before —
 * hasPermission() is server-only, so only the resulting plain nav list
 * crosses into the client component. Navigation is filtered for
 * usability only — HIDING a link (or an entire mode) is not
 * authorization; every route behind it independently re-checks the
 * same permission server-side (RequirePermission for pages,
 * requirePermission() for API routes), so a hidden link/mode can never
 * be relied on as the actual access control. `mode` itself is the same
 * story: it decides which nav list is SHOWN, never what a request is
 * ALLOWED to do.
 */
export default function AdminShell({ admin, mode, children }: { admin: CurrentAdmin; mode: AdminRole; children: React.ReactNode }) {
  const navItems: AdminNavItem[] = ADMIN_MODE_NAV_ITEMS[mode].filter((item) => hasPermission(admin, item.permission))

  const availableModes = admin.roles.map((role) => ({ role, label: ADMIN_ROLE_LABELS[role], icon: ADMIN_MODE_ICONS[role] }))

  return (
    <AdminSidebarShell navItems={navItems} email={admin.user.email} currentMode={mode} availableModes={availableModes}>
      <PersonalBrandNavProvider sidebarCoversPersonalBrand={mode === 'social_media'}>{children}</PersonalBrandNavProvider>
    </AdminSidebarShell>
  )
}
