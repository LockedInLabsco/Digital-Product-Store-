import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateContentItemInput, validateContentMetricInput } from '@/src/lib/personal-brand/validate'
import { fetchAllAccountMedia, fetchMediaInsights, isInstagramConfigured, type InstagramMedia } from '@/src/lib/instagram/client'
import { urlsMatch } from '@/src/lib/instagram/matching'
import type { PbContentType } from '@/src/types/personalBrand'

interface SyncResult {
  contentId: string
  title: string | null
  matched: boolean
  inserted: boolean
  created: boolean
  error?: string
}

// Maps Instagram's media/product type onto this project's own content_type
// enum — best-effort only, since an auto-created item has no way to know
// which of "reel"/"post" the admin would have called it beyond what
// Instagram itself reports.
function mapContentType(media: InstagramMedia): PbContentType {
  if (media.media_product_type === 'REELS') return 'reel'
  if (media.media_product_type === 'STORY') return 'story'
  if (media.media_type === 'CAROUSEL_ALBUM') return 'carousel'
  if (media.media_type === 'IMAGE' || media.media_type === 'VIDEO') return 'post'
  return 'other'
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

    if (!isInstagramConfigured()) {
      return NextResponse.json(
        { error: 'Instagram is not connected — INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID are not configured' },
        { status: 400 }
      )
    }

    // All Instagram-platform items that already have a platform_url, in any
    // status — used only to detect which Instagram posts are already
    // logged, so a matched-but-not-yet-posted item is never duplicated.
    const { data: existingLinked, error: existingError } = await supabaseServer
      .from('pb_content_items')
      .select('id, platform_url')
      .eq('platform', 'instagram')
      .not('platform_url', 'is', null)

    if (existingError) {
      console.error('[Instagram Sync] Failed to fetch existing content items', existingError.message)
      return NextResponse.json({ error: 'Failed to fetch content items' }, { status: 500 })
    }

    const mediaResult = await fetchAllAccountMedia()
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
        .insert(validation.value)
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

      const insights = await fetchMediaInsights(media.id)

      const validation = validateContentMetricInput({
        views: media.views,
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
