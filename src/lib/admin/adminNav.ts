/**
 * Centralized navigation-by-mode definitions — the single place that
 * decides what each admin "mode" (Founder/Developer/Social Media/
 * Analyst) shows in the sidebar, replacing the two ad hoc arrays that
 * used to live inline in AdminShell.tsx. Filtering by permission still
 * happens in AdminShell (hasPermission() is server-only, same as
 * before) — this file only owns WHICH items belong to WHICH mode and
 * WHAT they link to; it grants nothing by itself.
 *
 * One mode per AdminRole (see src/lib/admin/adminMode.ts) — 'owner' and
 * 'analyst' deliberately share the same BUSINESS_NAV_ITEMS array rather
 * than Analyst getting its own curated list: there is no Analyst-
 * specific toolset in this app today, Analyst is simply a narrower
 * (permission-filtered) view of the same business nav Founder sees —
 * exactly how it already worked before this redesign, just now named
 * and centralized instead of implicit.
 */
import type { AdminNavIconKey } from '@/src/components/admin/AdminSidebarShell'
import type { AdminPermission, AdminRole } from '@/src/types/admin'

export interface AdminModeNavItem {
  href: string
  label: string
  permission: AdminPermission
  icon: AdminNavIconKey
}

/** Founder mode — the overall business/admin areas. Deliberately does
 * NOT list Social Media's own detail pages (Content, Ideas, Formats,
 * ...) — switching to Social Media mode is how a Founder who also holds
 * that role reaches those now, not a duplicated link here. */
const BUSINESS_NAV_ITEMS: AdminModeNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read', icon: 'dashboard' },
  { href: '/admin/analytics', label: 'Analytics', permission: 'analytics:read', icon: 'analytics' },
  { href: '/admin/waitlists', label: 'Waitlists', permission: 'waitlists:read', icon: 'waitlists' },
  { href: '/admin/products', label: 'Products', permission: 'products:read', icon: 'products' },
  { href: '/admin/orders', label: 'Orders', permission: 'orders:read', icon: 'orders' },
  { href: '/admin/media', label: 'Media', permission: 'media:read', icon: 'media' },
  { href: '/admin/hero-slider', label: 'Hero Slider', permission: 'hero_slider:read', icon: 'hero_slider' },
  { href: '/admin/work', label: 'Work', permission: 'work:read_own', icon: 'work' },
  { href: '/admin/team', label: 'Team', permission: 'team:read', icon: 'team' },
  { href: '/admin/account', label: 'Account', permission: 'dashboard:read', icon: 'account' },
]

/**
 * Developer mode — deliberately minimal. The `developer` role's actual
 * granted permissions today (see permissions.ts) are mostly store/ops
 * permissions (waitlists, products, orders, media, hero_slider) that
 * predate this mode redesign — real server-side access to those routes
 * is UNCHANGED (still reachable directly, or via Founder mode for an
 * admin who also holds 'owner'), but they are not business/founder
 * pages, so they are not duplicated into this list just to make
 * Developer mode look fuller. There is no dedicated "technical tools"
 * page (integrations, system logs, etc.) in this codebase yet — this
 * array is exactly the honest, current set, designed to grow the
 * moment one exists.
 */
const DEVELOPER_NAV_ITEMS: AdminModeNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read', icon: 'dashboard' },
  { href: '/admin/work', label: 'Work', permission: 'work:read_own', icon: 'work' },
  { href: '/admin/account', label: 'Account', permission: 'dashboard:read', icon: 'account' },
]

/** Social Media mode — replaces the old PERSONAL_BRAND_NAV_ITEMS (same
 * items/hrefs/permissions, unchanged routes — see the UI-rename report:
 * only the module's DISPLAYED name changed, not /admin/personal-brand
 * itself). The active Social Workspace selector lives inside the page
 * content (PersonalBrandTabs -> WorkspaceSwitcher), not here — this is
 * the MODE, not the workspace; see adminMode.ts's own header for why
 * the two are kept deliberately separate. */
const SOCIAL_MEDIA_NAV_ITEMS: AdminModeNavItem[] = [
  { href: '/admin/personal-brand', label: 'Dashboard', permission: 'personal_brand:read', icon: 'dashboard' },
  { href: '/admin/personal-brand/content', label: 'Content', permission: 'personal_brand:read', icon: 'content' },
  { href: '/admin/personal-brand/formats', label: 'Winning Formats', permission: 'personal_brand:read', icon: 'formats' },
  { href: '/admin/personal-brand/ideas', label: 'Ideas', permission: 'personal_brand:read', icon: 'ideas' },
  { href: '/admin/personal-brand/experiments', label: 'Experiments', permission: 'personal_brand:read', icon: 'experiments' },
  { href: '/admin/personal-brand/planner', label: 'AI Planner', permission: 'personal_brand:read', icon: 'planner' },
  { href: '/admin/personal-brand/automations', label: 'DM Automations', permission: 'personal_brand:read', icon: 'automations' },
  { href: '/admin/personal-brand/settings/workspace', label: 'Workspace Settings', permission: 'personal_brand:read', icon: 'team' },
  { href: '/admin/account', label: 'Account', permission: 'dashboard:read', icon: 'account' },
]

export const ADMIN_MODE_NAV_ITEMS: Record<AdminRole, AdminModeNavItem[]> = {
  owner: BUSINESS_NAV_ITEMS,
  analyst: BUSINESS_NAV_ITEMS,
  developer: DEVELOPER_NAV_ITEMS,
  social_media: SOCIAL_MEDIA_NAV_ITEMS,
}

/** Which icon represents each MODE itself in the switcher — distinct
 * from the per-item icons above. */
export const ADMIN_MODE_ICONS: Record<AdminRole, AdminNavIconKey> = {
  owner: 'dashboard',
  analyst: 'analytics',
  developer: 'work',
  social_media: 'personal_brand',
}
