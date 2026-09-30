/**
 * Encryption-at-rest for the stored Instagram messaging token, on top of
 * Supabase's own RLS (see supabase/migrations/0023_instagram_token_store.sql).
 * Standard AES-256-GCM via Node's built-in crypto — no custom scheme.
 *
 * The key never touches this repo or the database: it's
 * INSTAGRAM_TOKEN_ENCRYPTION_KEY, a 32-byte key base64-encoded, set only
 * in Vercel's server environment. Losing it means the stored token can
 * no longer be decrypted — that's intentional (it's also not the
 * disaster it sounds like, since INSTAGRAM_MESSAGING_ACCESS_TOKEN can
 * always re-seed the table via bootstrapMessagingTokenIfNeeded).
 */
import 'server-only'
import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const FORMAT_VERSION = 'v1'

function getKey(): Buffer {
  const raw = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('INSTAGRAM_TOKEN_ENCRYPTION_KEY is not configured')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('INSTAGRAM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return key
}

/** Encrypts a token for storage. Output format: `v1:<iv>:<authTag>:<ciphertext>`, all base64. */
export function encryptToken(plainToken: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

/** Reverses encryptToken(). Throws if the format tag doesn't match or the auth tag fails to verify. */
export function decryptToken(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Unrecognized encrypted token format')
  }
  const [, ivB64, authTagB64, ciphertextB64] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
