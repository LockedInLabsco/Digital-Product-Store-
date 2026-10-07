import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse } from '@/src/lib/admin/activeSocialWorkspace'
import { fetchAllAccountMedia, mapContentType } from '@/src/lib/instagram/client'
import { resolveContentAccountForWorkspace, contentAccountFailureStatus } from '@/src/lib/instagram/contentAccountResolution'

export interface AutomationMediaOption {
  id: string
  thumbnail_url: string | null
  caption: string | null
  posted_at: string | null
  content_type: ReturnType<typeof mapContentType>
  permalink: string | null
}

// GET — the caller's own workspace's connected account's media, newest
// first, for the "restrict this rule to one post" picker in the
// automation rule form. Read-only and admin-gated like every other
// personal-brand route; never writes anything. Reuses the same Graph API
// call as the "Sync from Instagram" button
// (src/app/api/admin/personal-brand/content/instagram-sync), just
// reshaped for display instead of matched against pb_content_items.
//
// Previously called fetchAllAccountMedia() with no workspace/account
// resolution at all — any personal_brand:read holder saw the one global
// Instagram account's media regardless of workspace membership. Now
// scoped identically to automations/route.ts's rule-creation path: the
// caller's one writable workspace, then that workspace's own connected
// account and content token.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }

    const accountResult = await resolveContentAccountForWorkspace(active.context.workspaceId)
    if (!accountResult.ok) {
      return NextResponse.json({ error: accountResult.error }, { status: contentAccountFailureStatus(accountResult.reason) })
    }
    const { instagramAccountId, accessToken, provider } = accountResult.account

    const result = await fetchAllAccountMedia({ instagramAccountId, accessToken, provider })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    const media: AutomationMediaOption[] = result.data.map((m) => ({
      id: m.id,
      thumbnail_url: m.thumbnail_url || m.media_url,
      caption: m.caption,
      posted_at: m.timestamp,
      content_type: mapContentType(m),
      permalink: m.permalink,
    }))

    return NextResponse.json({ media })
  } catch (error) {
    console.error('[Instagram Automations] Exception in GET media', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
