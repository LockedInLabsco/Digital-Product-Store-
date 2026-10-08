import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { validateContentItemInput, validateContentMetricInput } from '@/src/lib/personal-brand/validate'
import { fetchAllAccountMedia, fetchMediaInsights, mapContentType } from '@/src/lib/instagram/client'
import { resolveContentAccountForWorkspace, contentAccountFailureStatus } from '@/src/lib/instagram/contentAccountResolution'
import { urlsMatch } from '@/src/lib/instagram/matching'

interface SyncResult {
  contentId: string
  title: string | null
  matched: boolean
  inserted: boolean
  created: boolean
  error?: string
}

function deriveTitle(caption: string | null): string | null {
  if (!caption) return null
  const firstLine = caption.split('\n')[0].trim()
  if (!firstLine) return null
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine
}

// POST — admin-triggered, on demand (never automatic): first auto-creates
// a posted pb_content_item for any Instagram post that isn't logged yet
// (matched by permalink against every existing instagram item's
// platform_url, in any status, so a pre-logged draft/planned item is
// never duplicated), then matches every posted Instagram content item
// against the connected account's media and inserts one fresh
// pb_content_metrics snapshot per match. Unmatched items (wrong
// platform_url, or a post the account doesn't have) are reported, not
// treated as failures.
export async function POST() {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    if (!roleCanWrite(active.context.role)) {
      return NextResponse.json({ error: 'You do not have write access to this Social Workspace' }, { status: 403 })
    }
    const workspaceId = active.context.workspaceId

    // Resolves THIS workspace's own connected Instagram account + content
    // token — never a global/env-var account. Fails closed (400/409/500,
    // never a silent fallback) if the workspace has no connected account,
    // more than one, or no usable token — see
    // src/lib/instagram/contentAccountResolution.ts.
    const accountResult = await resolveContentAccountForWorkspace(workspaceId)
    if (!accountResult.ok) {
      return NextResponse.json({ error: accountResult.error }, { status: contentAccountFailureStatus(accountResult.reason) })
    }
    const { instagramAccountId, accessToken, provider } = accountResult.account

    // All of THIS workspace's Instagram-platform items that already have
    // a platform_url, in any status — used only to detect which Instagram
    // posts are already logged, so a matched-but-not-yet-posted item is
    // never duplicated. Scoped so syncing never matches against another
    // workspace's content.
    const { data: existingLinked, error: existingError } = await supabaseServer
      .from('pb_content_items')
      .select('id, platform_url')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .not('platform_url', 'is', null)

    if (existingError) {
      console.error('[Instagram Sync] Failed to fetch existing content items', existingError.message)
      return NextResponse.json({ error: 'Failed to fetch content items' }, { status: 500 })
    }

    const mediaResult = await fetchAllAccountMedia({ instagramAccountId, accessToken, provider })
    if (!mediaResult.ok) {
      return NextResponse.json({ error: mediaResult.error }, { status: 502 })
    }

    // Auto-create a content item for every Instagram post that isn't
    // logged yet, so clicking "Sync" also picks up anything posted since
    // the last click — not just metrics for posts logged by hand.
    const unmatchedMedia = mediaResult.data.filter(
      (media) => !(existingLinked || []).some((item) => urlsMatch(item.platform_url, media.permalink))
    )

    const createdIds = new Set<string>()
    for (const media of unmatchedMedia) {
      if (!media.permalink) continue

      const validation = validateContentItemInput({
        platform: 'instagram',
        content_type: mapContentType(media),
        status: 'posted',
        title: deriveTitle(media.caption),
        caption: media.caption,
        posted_at: media.timestamp,
        platform_url: media.permalink,
      })

      if (validation.error || !validation.value) {
        console.error('[Instagram Sync] Failed to auto-create content item', validation.error)
        continue
      }

      const { data: created, error: createError } = await supabaseServer
        .from('pb_content_items')
        .insert({ ...validation.value, workspace_id: workspaceId })
        .select('id')
        .single()

      if (createError || !created) {
        console.error('[Instagram Sync] Insert error creating content item', createError?.message)
        continue
      }

      createdIds.add(created.id)
    }

    const { data: items, error: itemsError } = await supabaseServer
      .from('pb_content_items')
      .select('id, title, platform_url')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .eq('status', 'posted')
      .not('platform_url', 'is', null)

    if (itemsError) {
      console.error('[Instagram Sync] Failed to fetch content items', itemsError.message)
      return NextResponse.json({ error: 'Failed to fetch content items' }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ results: [], message: 'No posted Instagram content with a platform URL to sync yet' })
    }

    const results: SyncResult[] = []

    for (const item of items) {
      const media = mediaResult.data.find((m) => urlsMatch(item.platform_url, m.permalink))
      const created = createdIds.has(item.id)

      if (!media) {
        results.push({ contentId: item.id, title: item.title, matched: false, inserted: false, created })
        continue
      }

      const insights = await fetchMediaInsights({ mediaId: media.id, accessToken, provider, mediaType: media.media_type })

      const validation = validateContentMetricInput({
        views: insights.views,
        likes: media.like_count,
        comments: media.comments_count,
        shares: insights.shares,
        saves: insights.saved,
        reach: insights.reach,
      })

      if (validation.error || !validation.value) {
        results.push({ contentId: item.id, title: item.title, matched: true, inserted: false, created, error: validation.error })
        continue
      }

      const { error: insertError } = await supabaseServer
        .from('pb_content_metrics')
        .insert({ ...validation.value, content_id: item.id })

      if (insertError) {
        console.error('[Instagram Sync] Insert error', insertError.message)
        results.push({ contentId: item.id, title: item.title, matched: true, inserted: false, created, error: 'Failed to save snapshot' })
        continue
      }

      results.push({ contentId: item.id, title: item.title, matched: true, inserted: true, created })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Instagram Sync] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
