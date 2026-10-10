import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { createInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import { buildInstagramDmAuthorizationUrl, isInstagramDmConnectConfigured } from '@/src/lib/instagram/instagramDmOAuth'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect-dm/callback'
const FLOW = 'instagram_dm_connect' as const

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  return NextResponse.redirect(url)
}

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

// GET — "Connect Instagram for DM Automations": the N4N DM Automations
// Meta app's own Instagram Login consent screen. Mirrors
// src/app/api/admin/social/instagram/connect-direct/start/route.ts
// exactly (same auth/workspace/role resolution, same never-trust-the-
// browser-with-a-workspace_id contract) — only the authorization URL
// builder (instagramDmOAuth.ts, INSTAGRAM_DM_APP_ID) and the OAuth state
// `flow` value ('instagram_dm_connect') differ. See connect-direct/start
// for the full reasoning on each check below. This is purely additive —
// it does not modify or replace connect-direct/start, which keeps
// working unchanged for the existing instagram_login connection.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/admin/login', siteOrigin(request)))
  }

  if (!isInstagramDmConnectConfigured()) {
    // Fail clearly server-side — never silently fall back to the
    // existing Direct Instagram Login app's credentials
    // (INSTAGRAM_LOGIN_APP_ID/SECRET) or the legacy Facebook App's
    // (INSTAGRAM_APP_ID/SECRET). See instagramDmOAuth.ts's header.
    console.error('[Instagram DM Connect] INSTAGRAM_DM_APP_ID/INSTAGRAM_DM_APP_SECRET is not configured')
    return redirectWithError(request, 'Instagram DM connection is not configured for this site yet.')
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
    authorizationUrl = buildInstagramDmAuthorizationUrl({ redirectUri, state })
  } catch (error) {
    console.error('[Instagram DM Connect] Failed to build authorization URL', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'Instagram DM connection is not configured for this site yet.')
  }

  logConnectStage('instagram_dm_oauth_started', { workspaceId: active.context.workspaceId })
  return NextResponse.redirect(authorizationUrl)
}
