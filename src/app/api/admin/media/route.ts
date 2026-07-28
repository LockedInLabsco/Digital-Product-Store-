import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { getWebsiteMediaAdmin, saveWebsiteMedia } from '@/src/lib/supabase/settings'
import { WEBSITE_MEDIA_DEFAULTS, WebsiteMedia } from '@/src/types/settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const media = await getWebsiteMediaAdmin()
    return NextResponse.json({ media })
  } catch (error) {
    console.error('[GET /api/admin/media] Exception', error)
    return NextResponse.json(
      { error: 'Failed to load website media settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Only accept known keys — never let arbitrary data reach site_settings.
    const partial: Partial<WebsiteMedia> = {}
    for (const key of Object.keys(WEBSITE_MEDIA_DEFAULTS) as (keyof WebsiteMedia)[]) {
      if (typeof body[key] === 'string') {
        partial[key] = body[key]
      }
    }

    const media = await saveWebsiteMedia(partial)

    revalidatePath('/', 'layout')

    return NextResponse.json({ media })
  } catch (error) {
    console.error('[PUT /api/admin/media] Exception', error)
    const message = error instanceof Error ? error.message : 'Failed to save website media settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
