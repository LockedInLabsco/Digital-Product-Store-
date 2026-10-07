import { getActiveWorkspaceContext } from '@/src/lib/admin/activeSocialWorkspace'
import WorkspaceSetupClient from '@/src/components/admin/social/WorkspaceSetupClient'

/**
 * Gates every Personal Brand / Social Media page behind "is there an
 * active Social Workspace resolved for this admin" — the server-side
 * equivalent of the Social Media Multi-Workspace Audit's CASE 4 (an
 * admin in 2+ workspaces must get an explicit picker, never a silent
 * default) and CASE 9 (a brand-new admin must create a workspace before
 * anything else renders). Every API route under /api/admin/social and
 * /api/admin/personal-brand ALSO independently re-resolves the active
 * workspace itself (see getActiveWorkspaceContext) — this layout is a
 * UX convenience, not the authorization boundary; it stops the page
 * shell from rendering tabs/forms that would just 400 on first fetch,
 * nothing more.
 */
export default async function PersonalBrandLayout({ children }: { children: React.ReactNode }) {
  const result = await getActiveWorkspaceContext()

  if (!result.ok && result.reason !== 'no_access') {
    return <WorkspaceSetupClient reason={result.reason} />
  }

  return <>{children}</>
}
