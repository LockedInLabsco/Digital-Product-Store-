import { redirect } from 'next/navigation'
import { getCurrentAdmin, hasPermission } from '@/src/lib/admin/auth'
import AccessDenied from './AccessDenied'
import type { AdminPermission } from '@/src/types/admin'

interface RequirePermissionProps {
  permission: AdminPermission
  children: React.ReactNode
}

/**
 * Server-side gate for one page's specific permission requirement.
 * `src/app/admin/(protected)/layout.tsx` already confirms the visitor is
 * *some* active admin before this ever renders — this only narrows that
 * down to "does their role include this permission." Because it's an
 * async Server Component awaited before any JSX is produced, there is no
 * intermediate render where the wrapped (protected) children are visible
 * to someone lacking the permission — getCurrentAdmin() is
 * request-memoized (React cache()), so this costs no extra query beyond
 * the layout's own check.
 */
export default async function RequirePermission({ permission, children }: RequirePermissionProps) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  if (!hasPermission(admin, permission)) {
    return <AccessDenied reason="permission" />
  }

  return <>{children}</>
}
