import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { isMediaFolder, uploadMediaFile, MediaUploadError } from '@/src/lib/admin/mediaUpload'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Shared upload pipeline for every image folder (logos, hero, sections,
  // waitlist screenshots, ...) — gated on the broadest of the relevant
  // write permissions. media:write covers uploading; waitlist-specific
  // screenshot uploads are additionally protected by waitlists:write on
  // the route that actually saves the URL onto a waitlist row.
  const auth = await requirePermission('media:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = formData.get('folder')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (typeof folder !== 'string' || !isMediaFolder(folder)) {
      return NextResponse.json({ error: 'Invalid or missing folder' }, { status: 400 })
    }

    const result = await uploadMediaFile(folder, file)

    return NextResponse.json({ url: result.url, path: result.path })
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[POST /api/admin/media/upload] Exception', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
