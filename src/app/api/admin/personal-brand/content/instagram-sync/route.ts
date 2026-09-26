import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateContentMetricInput } from '@/src/lib/personal-brand/validate'
import { fetchAllAccountMedia, fetchMediaInsights, isInstagramConfigured } from '@/src/lib/instagram/client'
import { urlsMatch } from '@/src/lib/instagram/matching'

interface SyncResult {
  contentId: string
  title: string | null
  matched: boolean
  inserted: boolean
  error?: string
}

// POST — admin-triggered, on demand (never automatic): matches every
// posted Instagram content item by platform_url against the connected
// account's media, and inserts one fresh pb_content_metrics snapshot
// per match. Unmatched items (wrong/missing platform_url, or a post the
// account doesn't have) are reported, not treated as failures — this is
// expected whenever a post was logged before it went live, or the URL
// was typed slightly differently.
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

    const mediaResult = await fetchAllAccountMedia()
    if (!mediaResult.ok) {
      return NextResponse.json({ error: mediaResult.error }, { status: 502 })
    }

    const results: SyncResult[] = []

    for (const item of items) {
      const media = mediaResult.data.find((m) => urlsMatch(item.platform_url, m.permalink))

      if (!media) {
        results.push({ contentId: item.id, title: item.title, matched: false, inserted: false })
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
        results.push({ contentId: item.id, title: item.title, matched: true, inserted: false, error: validation.error })
        continue
      }

      const { error: insertError } = await supabaseServer
        .from('pb_content_metrics')
        .insert({ ...validation.value, content_id: item.id })

      if (insertError) {
        console.error('[Instagram Sync] Insert error', insertError.message)
        results.push({ contentId: item.id, title: item.title, matched: true, inserted: false, error: 'Failed to save snapshot' })
        continue
      }

      results.push({ contentId: item.id, title: item.title, matched: true, inserted: true })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Instagram Sync] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
