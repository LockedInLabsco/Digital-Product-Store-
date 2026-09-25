'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/personal-brand', label: 'Dashboard' },
  { href: '/admin/personal-brand/content', label: 'Content' },
  { href: '/admin/personal-brand/formats', label: 'Winning Formats' },
  { href: '/admin/personal-brand/ideas', label: 'Ideas' },
  { href: '/admin/personal-brand/experiments', label: 'Experiments' },
  { href: '/admin/personal-brand/planner', label: 'AI Planner' },
]

/**
 * Second-level nav within the Personal Brand workspace (AdminShell above
 * provides the top-level "Personal Brand" entry). A page is "active" if
 * the current path equals its href, or — for /content and /content/new,
 * /content/[id] etc. — starts with it, except the Dashboard tab itself
 * (href === '/admin/personal-brand'), which would otherwise match every
 * sub-route too.
 */
export default function PersonalBrandTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-8 flex gap-1 overflow-x-auto border-b border-admin-border pb-3 text-sm">
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/admin/personal-brand' ? pathname === tab.href : pathname?.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded px-3 py-1.5 font-medium ${
              isActive ? 'bg-admin-surface2 text-admin-text' : 'text-admin-muted hover:bg-admin-surface2 hover:text-admin-text'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
