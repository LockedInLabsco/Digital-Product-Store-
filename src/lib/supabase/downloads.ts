import { supabaseServer } from './server'

const PRODUCT_FILES_BUCKET = 'products'
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 // 24 hours

export async function getSignedDownloadUrl(
  filePath: string,
  expirySeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!filePath) {
    console.error('[Supabase Storage] getSignedDownloadUrl: filePath is required')
    return null
  }

  try {
    console.log('[Supabase Storage] Generating signed URL', {
      bucket: PRODUCT_FILES_BUCKET,
      filePath,
      expirySeconds,
    })

    const { data, error } = await supabaseServer.storage
      .from(PRODUCT_FILES_BUCKET)
      .createSignedUrl(filePath, expirySeconds)

    if (error) {
      console.error('[Supabase Storage] Error generating signed URL:', error.message)
      return null
    }

    if (!data?.signedUrl) {
      console.error('[Supabase Storage] No signed URL returned')
      return null
    }

    console.log('[Supabase Storage] Signed URL generated successfully')
    return data.signedUrl
  } catch (error) {
    console.error('[Supabase Storage] Exception generating signed URL:', error)
    return null
  }
}

export async function verifyProductFileExists(
  filePath: string
): Promise<boolean> {
  if (!filePath) return false

  try {
    const pathParts = filePath.split('/').filter(Boolean)
    const fileName = pathParts.pop()
    const directory = pathParts.join('/')

    if (!fileName) {
      console.error('[Supabase Storage] Invalid file path:', filePath)
      return false
    }

    console.log('[Supabase Storage] Verifying file exists', {
      bucket: PRODUCT_FILES_BUCKET,
      directory,
      fileName,
      filePath,
    })

    const { data, error } = await supabaseServer.storage
      .from(PRODUCT_FILES_BUCKET)
      .list(directory, { limit: 100, search: fileName })

    if (error) {
      console.error('[Supabase Storage] Error verifying file:', error.message)
      return false
    }

    const exists = Boolean(data?.some((item) => item.name === fileName))
    console.log('[Supabase Storage] File existence result', {
      filePath,
      exists,
    })

    return exists
  } catch (error) {
    console.error('[Supabase Storage] Exception verifying file:', error)
    return false
  }
}
