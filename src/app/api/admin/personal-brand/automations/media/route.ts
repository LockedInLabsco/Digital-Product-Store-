import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { fetchAllAccountMedia, isInstagramConfigured, mapContentType } from '@/src/lib/instagram/client'

export interface AutomationMediaOption {
  id: string
  thumbnail_url: string | null
  caption: string | null
  posted_at: string | null
  content_type: ReturnType<typeof mapContentType>
  permalink: string | null
}

// GET — the connected account's media, newest first, for the "restrict
// this rule to one post" picker in the automation rule form. Read-only
// and admin-gated like every other personal-brand route; never writes
// anything. Reuses the same Graph API call as the "Sync from Instagram"
// button (src/app/api/admin/personal-brand/content/instagram-sync), just
// reshaped for display instead of matched against pb_content_items.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!isInstagramConfigured()) {
      return NextResponse.json(
        { error: 'Instagram is not connected — INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID are not configured' },
        { status: 400 }
      )
    }

    const result = await fetchAllAccountMedia()
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
