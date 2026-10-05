import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { ensureWritableSocialWorkspace } from '@/src/lib/social/ensureSocialWorkspace'
import { createInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import { buildFacebookAuthorizationUrl, isInstagramConnectConfigured } from '@/src/lib/instagram/facebookOAuth'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect/callback'

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  return NextResponse.redirect(url)
}

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

// GET — the "Connect Instagram" / "Reconnect" button's target. A real
// browser navigation (never a fetch call), since the response here is a
// 302 to Meta's own consent screen. Resolves the admin + their writable
// Social Workspace entirely server-side before anything is created —
// the browser never supplies (and this route never trusts) a
// workspace_id of its own.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/admin/login', siteOrigin(request)))
  }

  if (!isInstagramConnectConfigured()) {
    return redirectWithError(request, 'Instagram connection is not configured for this site yet.')
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope) {
    return redirectWithError(request, 'You do not have access to a Social Workspace.')
  }

  // Same auto-provisioning as the status route (see
  // ensureWritableSocialWorkspace) — belt-and-suspenders for an admin
  // who lands directly on Connect without the Content page ever having
  // called /status first.
  const workspaceResult = await ensureWritableSocialWorkspace(scope, auth.admin.user.email)
  if (!workspaceResult.ok) {
    return redirectWithError(request, workspaceResult.error)
  }

  const state = await createInstagramOAuthState({ adminUserId: scope.adminUserId, workspaceId: workspaceResult.workspaceId })
  const redirectUri = new URL(CALLBACK_PATH, siteOrigin(request)).toString()

  let authorizationUrl: string
  try {
    authorizationUrl = buildFacebookAuthorizationUrl({ redirectUri, state })
  } catch (error) {
    console.error('[Instagram Connect] Failed to build authorization URL', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'Instagram connection is not configured for this site yet.')
  }

  return NextResponse.redirect(authorizationUrl)
}
