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
  type LucideIcon,
} from 'lucide-react'
import SignOutButton from './SignOutButton'

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
}

export interface AdminNavItem {
  href: string
  label: string
  icon: AdminNavIconKey
}

interface AdminSidebarShellProps {
  navItems: AdminNavItem[]
  email: string
  roleLabel: string
  children: React.ReactNode
}

/**
 * The admin app shell: a persistent left sidebar on desktop, a slide-
 * over drawer (behind a hamburger) on mobile — the same structural
 * pattern real dashboard apps use, replacing the old horizontal-tabs top
 * bar. Client-only because it needs the current pathname (active-item
 * highlighting) and mobile open/close state; the actual permission
 * filtering of `navItems` happens server-side in AdminShell before this
 * ever renders, since hasPermission() lives in a server-only module.
 */
export default function AdminSidebarShell({ navItems, email, roleLabel, children }: AdminSidebarShellProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Close the mobile drawer automatically on navigation.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

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
          Apple's usual light-glass look. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-admin-border/60 bg-admin-surface/80 backdrop-blur-xl shadow-[1px_0_0_rgba(255,255,255,0.03),20px_0_45px_-24px_rgba(0,0,0,0.6)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="text-lg font-bold hover:text-admin-muted">
            NOT4NORMAL
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-admin-muted hover:bg-admin-surface2 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
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
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-admin-muted">{roleLabel}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
