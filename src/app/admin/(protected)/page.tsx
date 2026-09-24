import Link from 'next/link'
import Container from '@/src/components/Container'
import RequirePermission from '@/src/components/admin/RequirePermission'
import { getCurrentAdmin, hasPermission } from '@/src/lib/admin/auth'
import type { AdminPermission } from '@/src/types/admin'

interface DashboardCard {
  href: string
  title: string
  description: string
  cta: string
  permission: AdminPermission
}

const CARDS: DashboardCard[] = [
  {
    href: '/admin/products',
    title: 'Products',
    description: 'Create, edit, and manage your products',
    cta: 'View Products ->',
    permission: 'products:read',
  },
  {
    href: '/admin/orders',
    title: 'Orders',
    description: 'View and manage customer orders',
    cta: 'View Orders ->',
    permission: 'orders:read',
  },
  {
    href: '/admin/waitlists',
    title: 'Waitlists',
    description: 'Create and manage waitlists for future apps and launches',
    cta: 'View Waitlists ->',
    permission: 'waitlists:read',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Traffic, funnels, revenue, and site engagement',
    cta: 'View Analytics ->',
    permission: 'analytics:read',
  },
  {
    href: '/admin/media',
    title: 'Website Media',
    description: 'Manage logos, favicon, and homepage images',
    cta: 'Manage Media ->',
    permission: 'media:read',
  },
  {
    href: '/admin/hero-slider',
    title: 'Hero Slider Images',
    description: 'Manage the auto-sliding homepage hero showcase',
    cta: 'Manage Slider ->',
    permission: 'hero_slider:read',
  },
  {
    href: '/admin/team',
    title: 'Team',
    description: 'Invite teammates, assign roles, and manage access',
    cta: 'Manage Team ->',
    permission: 'team:read',
  },
]

async function DashboardContent() {
  const admin = await getCurrentAdmin()
  const visibleCards = CARDS.filter((card) => hasPermission(admin, card.permission))

  return (
    <Container className="py-12">
      <div className="max-w-4xl">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-admin-muted">Manage your digital products</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="border border-admin-border rounded-lg p-6 hover:border-admin-border hover:shadow-md transition-all cursor-pointer h-full">
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-admin-muted mb-4">{card.description}</p>
                <span className="text-sm text-admin-text font-medium">{card.cta}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  )
}

export default function AdminPage() {
  return (
    <RequirePermission permission="dashboard:read">
      <DashboardContent />
    </RequirePermission>
  )
}
