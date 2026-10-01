import { hasPermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLE_LABELS } from '@/src/lib/admin/permissions'
import AdminSidebarShell, { type AdminNavItem } from './AdminSidebarShell'
import { PersonalBrandNavProvider } from './PersonalBrandNavContext'
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
  { href: '/admin/work', label: 'Work', permission: 'work:read_own', icon: 'work' },
  { href: '/admin/team', label: 'Team', permission: 'team:read', icon: 'team' },
  { href: '/admin/account', label: 'Account', permission: 'dashboard:read', icon: 'account' },
]

// The focused workspace for an admin whose ONLY role is social_media —
// the same Personal Brand pages the "Personal Brand" section above links
// to, just surfaced directly instead of behind one general-admin entry.
// An admin holding social_media alongside another role (e.g. owner)
// still gets the regular NAV_ITEMS above, since that other role's own
// nav items must stay reachable too.
const PERSONAL_BRAND_NAV_ITEMS: NavItem[] = [
  { href: '/admin/personal-brand', label: 'Dashboard', permission: 'personal_brand:read', icon: 'dashboard' },
  { href: '/admin/personal-brand/content', label: 'Content', permission: 'personal_brand:read', icon: 'content' },
  { href: '/admin/personal-brand/formats', label: 'Winning Formats', permission: 'personal_brand:read', icon: 'formats' },
  { href: '/admin/personal-brand/ideas', label: 'Ideas', permission: 'personal_brand:read', icon: 'ideas' },
  { href: '/admin/personal-brand/experiments', label: 'Experiments', permission: 'personal_brand:read', icon: 'experiments' },
  { href: '/admin/personal-brand/planner', label: 'AI Planner', permission: 'personal_brand:read', icon: 'planner' },
  { href: '/admin/personal-brand/automations', label: 'DM Automations', permission: 'personal_brand:read', icon: 'automations' },
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
  const isSocialMediaOnly = admin.roles.length === 1 && admin.roles[0] === 'social_media'
  const navSource = isSocialMediaOnly ? PERSONAL_BRAND_NAV_ITEMS : NAV_ITEMS
  const visibleNavItems = navSource.filter((item) => hasPermission(admin, item.permission))
  const roleLabels = admin.roles.map((role) => ADMIN_ROLE_LABELS[role])

  return (
    <AdminSidebarShell navItems={visibleNavItems} email={admin.user.email} roleLabels={roleLabels}>
      <PersonalBrandNavProvider sidebarCoversPersonalBrand={isSocialMediaOnly}>{children}</PersonalBrandNavProvider>
    </AdminSidebarShell>
  )
}
