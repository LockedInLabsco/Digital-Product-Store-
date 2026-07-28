import { randomUUID } from 'crypto'
import { supabaseServer } from '@/src/lib/supabase/server'

export const SITE_ASSETS_BUCKET = 'site-assets'

export type MediaFolder =
  | 'logos'
  | 'symbols'
  | 'hero'
  | 'sections'
  | 'social'
  | 'backgrounds'

const MEDIA_FOLDERS: MediaFolder[] = [
  'logos',
  'symbols',
  'hero',
  'sections',
  'social',
  'backgrounds',
]

const LOGO_MIME_TYPES = ['image/png', 'image/webp', 'image/svg+xml']
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const ALLOWED_MIME_BY_FOLDER: Record<MediaFolder, string[]> = {
  logos: LOGO_MIME_TYPES,
  symbols: LOGO_MIME_TYPES,
  hero: PHOTO_MIME_TYPES,
  sections: PHOTO_MIME_TYPES,
  social: ['image/jpeg', 'image/png'],
  backgrounds: PHOTO_MIME_TYPES,
}

const MAX_SIZE_BYTES_BY_FOLDER: Record<MediaFolder, number> = {
  logos: 5 * 1024 * 1024,
  symbols: 5 * 1024 * 1024,
  hero: 8 * 1024 * 1024,
  sections: 8 * 1024 * 1024,
  social: 8 * 1024 * 1024,
  backgrounds: 8 * 1024 * 1024,
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

export function isMediaFolder(value: string): value is MediaFolder {
  return MEDIA_FOLDERS.includes(value as MediaFolder)
}

export class MediaUploadError extends Error {}

/**
 * Strips <script> tags, inline event-handler attributes, and
 * <foreignObject> so an uploaded SVG cannot execute script in the
 * browser. Not a full sanitizer, but removes the well-known XSS vectors
 * for a logo/symbol upload use case.
 */
export function sanitizeSvg(svgText: string): string {
  return svgText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2')
}

export async function ensureBucketExists(): Promise<void> {
  const { error } = await supabaseServer.storage.createBucket(SITE_ASSETS_BUCKET, {
    public: true,
  })

  if (error && !/already exists/i.test(error.message)) {
    throw new MediaUploadError(`Failed to create storage bucket: ${error.message}`)
  }
}

interface UploadMediaFileResult {
  url: string
  path: string
}

export async function uploadMediaFile(
  folder: MediaFolder,
  file: File
): Promise<UploadMediaFileResult> {
  const allowedTypes = ALLOWED_MIME_BY_FOLDER[folder]
  const maxSize = MAX_SIZE_BYTES_BY_FOLDER[folder]

  if (!allowedTypes.includes(file.type)) {
    throw new MediaUploadError(
      `Unsupported file type "${file.type || 'unknown'}" for ${folder}. Allowed: ${allowedTypes.join(', ')}`
    )
  }

  if (file.size > maxSize) {
    throw new MediaUploadError(
      `File is too large. Maximum size for ${folder} is ${Math.round(maxSize / (1024 * 1024))}MB.`
    )
  }

  const extension = EXTENSION_BY_MIME[file.type]
  const safeOriginalName = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const fileName = `${randomUUID()}${safeOriginalName ? `-${safeOriginalName}` : ''}.${extension}`
  const path = `${folder}/${fileName}`

  let body: ArrayBuffer | string = await file.arrayBuffer()

  if (file.type === 'image/svg+xml') {
    body = sanitizeSvg(Buffer.from(body).toString('utf-8'))
  }

  await ensureBucketExists()

  const { error: uploadError } = await supabaseServer.storage
    .from(SITE_ASSETS_BUCKET)
    .upload(path, body, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new MediaUploadError(`Failed to upload file: ${uploadError.message}`)
  }

  const { data } = supabaseServer.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path)

  return { url: data.publicUrl, path }
}
