import { hasPermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLE_LABELS } from '@/src/lib/admin/permissions'
import AdminSidebarShell, { type AdminNavItem } from './AdminSidebarShell'
import type { AdminPermission, CurrentAdmin } from '@/src/types/admin'

interface NavItem extends AdminNavItem {
  permission: AdminPermission
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read', icon: 'dashboard' },
  { href: '/admin/analytics', label: 'Analytics', permission: 'analytics:read', icon: 'analytics' },
  { href: '/admin/waitlists', label: 'Waitlists', permission: 'waitlists:read', icon: 'waitlists' },
  { href: '/admin/products', label: 'Products', permission: 'products:read', icon: 'products' },
  { href: '/admin/orders', label: 'Orders', permission: 'orders:read', icon: 'orders' },
  { href: '/admin/media', label: 'Media', permission: 'media:read', icon: 'media' },
  { href: '/admin/hero-slider', label: 'Hero Slider', permission: 'hero_slider:read', icon: 'hero_slider' },
  { href: '/admin/personal-brand', label: 'Personal Brand', permission: 'personal_brand:read', icon: 'personal_brand' },
  { href: '/admin/team', label: 'Team', permission: 'team:read', icon: 'team' },
  { href: '/admin/account', label: 'Account', permission: 'dashboard:read', icon: 'account' },
]

/**
 * The one shared admin shell — permission-filtered navigation, current
 * account, sign-out, content area, rendered as a persistent sidebar (see
 * AdminSidebarShell for the actual layout/interactivity). Filtering here
 * happens server-side since hasPermission() needs the server-only
 * admin/auth module; only the resulting plain nav list crosses into the
 * client component. Navigation is filtered for usability only — HIDING
 * a link is not authorization; every route behind it independently
 * re-checks the same permission server-side (RequirePermission for
 * pages, requirePermission() for API routes), so a hidden link can't be
 * relied on as the actual access control.
 */
export default function AdminShell({ admin, children }: { admin: CurrentAdmin; children: React.ReactNode }) {
  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(admin, item.permission))

  return (
    <AdminSidebarShell navItems={visibleNavItems} email={admin.user.email} roleLabel={ADMIN_ROLE_LABELS[admin.role]}>
      {children}
    </AdminSidebarShell>
  )
}
