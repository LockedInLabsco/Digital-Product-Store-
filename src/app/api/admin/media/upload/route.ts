import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { isMediaFolder, uploadMediaFile, MediaUploadError } from '@/src/lib/admin/mediaUpload'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json({ url: result.url })
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[POST /api/admin/media/upload] Exception', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
