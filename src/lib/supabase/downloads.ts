import { supabaseServer } from './server'

const PRODUCT_FILES_BUCKET = 'products'
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 // 24 hours

export async function getSignedDownloadUrl(
  filePath: string,
  expirySeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!filePath) {
    console.error('getSignedDownloadUrl: filePath is required')
    return null
  }

  try {
    console.log(`🔐 Generating signed URL for: ${filePath} (expires in ${expirySeconds}s)`)

    const { data, error } = await supabaseServer.storage
      .from(PRODUCT_FILES_BUCKET)
      .createSignedUrl(filePath, expirySeconds)

    if (error) {
      console.error('❌ Error generating signed URL:', error.message)
      return null
    }

    if (!data?.signedUrl) {
      console.error('❌ No signed URL returned')
      return null
    }

    console.log(`✅ Signed URL generated successfully`)
    return data.signedUrl
  } catch (error) {
    console.error('❌ Exception generating signed URL:', error)
    return null
  }
}

export async function verifyProductFileExists(
  filePath: string
): Promise<boolean> {
  if (!filePath) return false

  try {
    console.log(`🔍 Verifying file exists: ${filePath}`)

    const { data, error } = await supabaseServer.storage
      .from(PRODUCT_FILES_BUCKET)
      .list('', { limit: 1, search: filePath })

    if (error) {
      console.error('❌ Error verifying file:', error.message)
      return false
    }

    const exists = data && data.length > 0
    console.log(`${exists ? '✅' : '⚠️'} File ${exists ? 'exists' : 'not found'}`)
    return exists
  } catch (error) {
    console.error('❌ Exception verifying file:', error)
    return false
  }
}
