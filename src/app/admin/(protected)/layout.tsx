import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/src/lib/admin/auth'
import { getSupabaseUser } from '@/src/lib/supabase/auth'
import AdminShell from '@/src/components/admin/AdminShell'
import AccessDenied from '@/src/components/admin/AccessDenied'

/**
 * The real fix for the old admin-dashboard flash: this is an async
 * Server Component, fully resolved — including the redirect() below —
 * before Next.js sends any HTML for the page. There is no client-side
 * "render optimistically, check localStorage in useEffect, redirect
 * later" step anymore; an unauthenticated or unauthorized request never
 * receives the protected UI, not even for a moment.
 *
 * middleware.ts already redirects a request with NO Supabase session at
 * all before it reaches here — the `!user` branch below is defense in
 * depth for that same case. This layout's own job is the next level
 * down: is this authenticated Supabase user actually an active member
 * of admin_users? (getCurrentAdmin() answers both at once, but we need
 * getSupabaseUser() too, since "not admin" and "not logged in" need
 * different responses — redirect vs. an explicit access-denied screen.)
 *
 * /admin/login is intentionally NOT under this layout (it's a sibling
 * route, src/app/admin/login/page.tsx) so it stays reachable no matter
 * what this check decides.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const [user, admin] = await Promise.all([getSupabaseUser(), getCurrentAdmin()])

  if (!user) {
    redirect('/admin/login')
  }

  if (!admin) {
    return <AccessDenied reason="not-admin" />
  }

  return <AdminShell admin={admin}>{children}</AdminShell>
}
