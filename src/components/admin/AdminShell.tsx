import Link from 'next/link'
import Container from '@/src/components/Container'
import SignOutButton from './SignOutButton'
import { hasPermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLE_LABELS } from '@/src/lib/admin/permissions'
import type { AdminPermission, CurrentAdmin } from '@/src/types/admin'

interface NavItem {
  href: string
  label: string
  permission: AdminPermission
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:read' },
  { href: '/admin/analytics', label: 'Analytics', permission: 'analytics:read' },
  { href: '/admin/waitlists', label: 'Waitlists', permission: 'waitlists:read' },
  { href: '/admin/products', label: 'Products', permission: 'products:read' },
  { href: '/admin/orders', label: 'Orders', permission: 'orders:read' },
  { href: '/admin/media', label: 'Media', permission: 'media:read' },
  { href: '/admin/hero-slider', label: 'Hero Slider', permission: 'hero_slider:read' },
  { href: '/admin/team', label: 'Team', permission: 'team:read' },
]

/**
 * The one shared admin shell — brand, permission-filtered navigation,
 * current account, sign-out, content area. Replaces every admin page's
 * own copy-pasted top bar. Navigation is filtered by permission for
 * usability only — HIDING a link is not authorization; every route
 * behind it independently re-checks the same permission server-side
 * (RequirePermission for pages, requirePermission() for API routes), so
 * a hidden link can't be relied on as the actual access control.
 */
export default function AdminShell({ admin, children }: { admin: CurrentAdmin; children: React.ReactNode }) {
  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(admin, item.permission))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <Container className="flex items-center justify-between py-4">
          <Link href="/admin" className="text-xl font-bold hover:text-gray-600">
            NOT4NORMAL Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-gray-600 sm:inline">{admin.user.email}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
              {ADMIN_ROLE_LABELS[admin.role]}
            </span>
            <SignOutButton />
          </div>
        </Container>

        <Container className="flex gap-1 overflow-x-auto pb-3 text-sm">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 hover:text-black"
            >
              {item.label}
            </Link>
          ))}
        </Container>
      </div>

      {children}
    </div>
  )
}
