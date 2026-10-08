'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  ListChecks,
  Package,
  ShoppingCart,
  Image as ImageIcon,
  GalleryHorizontalEnd,
  Sparkles,
  Users,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Trophy,
  Lightbulb,
  FlaskConical,
  CalendarClock,
  Send,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'
import SignOutButton from './SignOutButton'
import AdminModeSwitcher, { type AdminModeOption } from './AdminModeSwitcher'
import { ADMIN_MODE_NAV_ITEMS } from '@/src/lib/admin/adminNav'
import type { AdminRole } from '@/src/types/admin'

export type AdminNavIconKey =
  | 'dashboard'
  | 'analytics'
  | 'waitlists'
  | 'products'
  | 'orders'
  | 'media'
  | 'hero_slider'
  | 'personal_brand'
  | 'team'
  | 'account'
  | 'content'
  | 'formats'
  | 'ideas'
  | 'experiments'
  | 'planner'
  | 'automations'
  | 'work'

const ICONS: Record<AdminNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  waitlists: ListChecks,
  products: Package,
  orders: ShoppingCart,
  media: ImageIcon,
  hero_slider: GalleryHorizontalEnd,
  personal_brand: Sparkles,
  team: Users,
  account: Settings,
  content: FileText,
  formats: Trophy,
  ideas: Lightbulb,
  experiments: FlaskConical,
  planner: CalendarClock,
  automations: Send,
  work: Briefcase,
}

export interface AdminNavItem {
  href: string
  label: string
  icon: AdminNavIconKey
}

interface AdminSidebarShellProps {
  navItems: AdminNavItem[]
  email: string
  currentMode: AdminRole
  availableModes: AdminModeOption[]
  children: React.ReactNode
}

/** Each mode's own first nav item — where the mode switcher navigates to
 * right after switching, so the admin always lands somewhere that
 * belongs to the mode they just picked rather than staying on a page
 * the new mode's nav doesn't even list. Every role in this app has
 * permission for its own mode's first item (see adminNav.ts), so no
 * extra per-admin filtering is needed here. */
const HOME_HREF_BY_MODE: Record<AdminRole, string> = Object.fromEntries(
  Object.entries(ADMIN_MODE_NAV_ITEMS).map(([role, items]) => [role, items[0].href])
) as Record<AdminRole, string>

/** Desktop-only collapse preference (Notion-style — hides the sidebar
 * entirely to widen the working area, independent of the mobile drawer
 * open/close state). Per-browser, not per-account: it's a screen-space
 * preference, not something that should follow the admin to another
 * device, so localStorage rather than a cookie/DB column. */
const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

/**
 * The admin app shell: a persistent left sidebar on desktop, a slide-
 * over drawer (behind a hamburger) on mobile — the same structural
 * pattern real dashboard apps use, replacing the old horizontal-tabs top
 * bar. Client-only because it needs the current pathname (active-item
 * highlighting) and mobile open/close state; the actual permission
 * filtering of `navItems` happens server-side in AdminShell before this
 * ever renders, since hasPermission() lives in a server-only module.
 */
export default function AdminSidebarShell({ navItems, email, currentMode, availableModes, children }: AdminSidebarShellProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Always present — currentMode is one of admin.roles, and
  // availableModes is built from exactly those same roles (see
  // AdminShell.tsx).
  const currentModeOption = availableModes.find((m) => m.role === currentMode)!

  // Close the mobile drawer automatically on navigation.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Read the saved collapse preference once on mount. Deliberately not
  // read synchronously during render (would mismatch SSR output) — a
  // brief expanded flash on first paint is preferable to a hydration
  // warning, and only ever happens once per browser since the value is
  // then cached by the browser across visits.
  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')
    } catch {
      // Private browsing / storage disabled — just stay expanded.
    }
  }, [])

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // Nothing to do — the preference just won't persist this session.
      }
      return next
    })
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`))

  return (
    <div className="min-h-screen bg-admin-bg lg:flex">
      {/* Mobile top bar — menu button on the left, opening a left-side
          drawer, so the gesture direction matches where the panel appears
          (the old layout had the button on the right, which opened left —
          Notion/Gmail-style mobile nav puts the trigger on the same side). */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-admin-border/60 bg-admin-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-1.5 text-admin-text hover:bg-admin-surface2"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <Link href="/admin" className="text-lg font-bold">
          NOT4NORMAL
        </Link>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — a frosted dark panel (translucent surface + blur +
          soft shadow), the same "liquid glass" language used elsewhere in
          the app, kept in the admin's black/white palette rather than
          Apple's usual light-glass look.

          Collapsing (desktop only) animates the ASIDE's own width to 0
          with overflow-hidden, rather than translating it off-screen —
          a transform doesn't free up any layout space (the aside is
          `lg:sticky`, still participating in the parent flex row), so
          the working area next to it wouldn't actually grow. The actual
          nav content sits in a fixed-width (`w-64`) inner wrapper so it
          keeps its normal layout while the ASIDE around it shrinks and
          clips it, matching Notion's own collapse animation. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r border-admin-border/60 bg-admin-surface/80 backdrop-blur-xl shadow-[1px_0_0_rgba(255,255,255,0.03),20px_0_45px_-24px_rgba(0,0,0,0.6)] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
        } ${isCollapsed ? 'lg:w-0 lg:border-r-0 lg:shadow-none' : 'lg:w-64'}`}
        aria-hidden={isCollapsed || undefined}
      >
        <div className="flex h-full w-64 shrink-0 flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <Link href="/admin" className="text-lg font-bold hover:text-admin-muted">
              NOT4NORMAL
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden rounded p-1 text-admin-muted hover:bg-admin-surface2 hover:text-admin-text lg:block"
                aria-label="Collapse navigation"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-admin-muted hover:bg-admin-surface2 lg:hidden"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="border-b border-admin-border/60 px-3 pb-3">
            <AdminModeSwitcher currentMode={currentModeOption} availableModes={availableModes} homeHrefByMode={HOME_HREF_BY_MODE} />
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {navItems.map((item) => {
              const Icon = ICONS[item.icon]
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'bg-white/10 text-admin-text' : 'text-admin-muted hover:bg-white/5 hover:text-admin-text'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-admin-text' : 'text-admin-faint'} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-admin-border/60 px-5 py-4">
            <Link href="/admin/account" className="block truncate text-sm text-admin-muted hover:text-admin-text" title={email}>
              {email}
            </Link>
            <div className="mt-2 flex items-center justify-end">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Floating re-expand trigger — only rendered once collapsed, and
          fixed-positioned (not inside the clipped aside) so it stays
          clickable regardless of the aside's own animated width. */}
      {isCollapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="fixed left-3 top-4 z-50 hidden rounded-lg border border-admin-border/60 bg-admin-surface/80 p-1.5 text-admin-muted backdrop-blur-xl transition-colors hover:bg-admin-surface2 hover:text-admin-text lg:flex"
          aria-label="Expand navigation"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
