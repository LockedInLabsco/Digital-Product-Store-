import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/src/lib/admin/auth'
import { getSupabaseUser, needsMfaChallenge } from '@/src/lib/supabase/auth'
import AccessDenied from '@/src/components/admin/AccessDenied'
import MfaChallengeClient from './MfaChallengeClient'

/**
 * Deliberately a sibling of /admin/login and NOT under
 * src/app/admin/(protected)/ — that layout redirects here whenever a
 * session needs a second-factor challenge, so this route can't itself
 * live behind that same check (it would just redirect to itself).
 */
export default async function MfaChallengePage() {
  const user = await getSupabaseUser()
  if (!user) {
    redirect('/admin/login')
  }

  const admin = await getCurrentAdmin()
  if (!admin) {
    return <AccessDenied reason="not-admin" />
  }

  const pending = await needsMfaChallenge()
  if (!pending) {
    redirect('/admin')
  }

  return <MfaChallengeClient />
}
