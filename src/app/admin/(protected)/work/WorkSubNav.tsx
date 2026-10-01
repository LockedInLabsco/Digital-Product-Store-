'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/work', label: 'Overview' },
  { href: '/admin/work/tasks', label: 'Tasks' },
  { href: '/admin/work/teams', label: 'Teams' },
]

/**
 * Small top-of-page tab row shared by the three Work pages — deliberately
 * not built as a context-driven system like PersonalBrandNavContext
 * (there's no role-conditional branching needed yet: every admin who can
 * reach any one Work page can reach all three, just scoped differently
 * by data). Revisit if/when a focused Work-only sidebar is introduced.
 */
export default function WorkSubNav() {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/admin/work' ? pathname === href : pathname?.startsWith(href))

  return (
    <div className="mb-8 flex gap-1 border-b border-admin-border">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            isActive(link.href) ? 'border-b-2 border-admin-accent text-admin-text' : 'text-admin-muted hover:text-admin-text'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
