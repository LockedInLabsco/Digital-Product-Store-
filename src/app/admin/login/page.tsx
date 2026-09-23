import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/src/lib/admin/auth'
import LoginClient from './LoginClient'

/**
 * Deliberately NOT under src/app/admin/(protected)/ — this route must
 * stay reachable no matter what the protected layout's auth check
 * decides, since it's the only way out of "authenticated but not an
 * admin" or "not authenticated at all."
 *
 * If this Supabase session already has active admin_users membership,
 * send them straight to /admin instead of showing the login form again.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const admin = await getCurrentAdmin()
  if (admin) {
    redirect('/admin')
  }

  return <LoginClient initialError={searchParams.error === 'auth_failed' ? 'Sign-in failed. Please try again.' : undefined} />
}
