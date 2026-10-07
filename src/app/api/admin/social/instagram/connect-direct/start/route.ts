import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { createInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import { buildInstagramLoginAuthorizationUrl, isInstagramLoginConnectConfigured } from '@/src/lib/instagram/instagramLoginOAuth'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect-direct/callback'
const FLOW = 'instagram_login_connect' as const

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  return NextResponse.redirect(url)
}

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

// GET — the Phase G default "Connect Instagram" target: direct
// Instagram Login (instagram.com's own consent screen), no Facebook
// Page required. Mirrors src/app/api/admin/social/instagram/connect/start/route.ts
// exactly (same auth/workspace/role resolution, same never-trust-the-
// browser-with-a-workspace_id contract) — only the authorization URL
// builder and OAuth state `flow` value differ. See that file for the
// full reasoning on each check below.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/admin/login', siteOrigin(request)))
  }

  if (!isInstagramLoginConnectConfigured()) {
    return redirectWithError(request, 'Instagram connection is not configured for this site yet.')
  }

  const active = await getActiveWorkspaceContext()
  if (!active.ok) {
    return redirectWithError(request, 'Select or create a Social Workspace before connecting Instagram.')
  }
  if (!roleCanWrite(active.context.role)) {
    return redirectWithError(request, 'You do not have permission to connect Instagram for this Social Workspace.')
  }

  const state = await createInstagramOAuthState({ adminUserId: active.context.scope.adminUserId, workspaceId: active.context.workspaceId }, FLOW)
  const redirectUri = new URL(CALLBACK_PATH, siteOrigin(request)).toString()

  let authorizationUrl: string
  try {
    authorizationUrl = buildInstagramLoginAuthorizationUrl({ redirectUri, state })
  } catch (error) {
    console.error('[Instagram Login Connect] Failed to build authorization URL', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'Instagram connection is not configured for this site yet.')
  }

  logConnectStage('instagram_oauth_started', { workspaceId: active.context.workspaceId })
  return NextResponse.redirect(authorizationUrl)
}
