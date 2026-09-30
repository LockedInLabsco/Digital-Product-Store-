/**
 * TEMPORARY diagnostic logging for the Instagram webhook → DM automation
 * path, added to work out why dm_keyword rules never fire while
 * comment_keyword rules do. Remove once that's resolved.
 *
 * Safe by construction — every helper here exists to make sure the logs
 * can never carry: access tokens, the app secret, the raw webhook body,
 * a full Instagram-scoped user id, or more of a private message than is
 * needed to tell whether a keyword matched.
 */
import 'server-only'

const PREFIX = '[IG DM DEBUG]'
const MAX_TEXT_PREVIEW = 40

/** Last 4 characters only — enough to correlate two log lines, never a usable identifier. */
export function maskId(id: string | null | undefined): string {
  if (!id) return 'none'
  return `***${id.slice(-4)}`
}

/** Collapses whitespace and truncates, so a private DM never lands in the logs in full. */
export function previewText(text: string | null | undefined): string {
  if (text === null || text === undefined) return 'null'
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return 'empty'
  return flat.length > MAX_TEXT_PREVIEW ? `${flat.slice(0, MAX_TEXT_PREVIEW)}...` : flat
}

/** Strips anything token-shaped out of a Meta error before it reaches the logs. */
export function sanitizeError(message: string | null | undefined): string {
  if (!message) return 'none'
  return message.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 200)
}

export function webhookDebug(stage: string, fields: Record<string, unknown>): void {
  const parts = Object.entries(fields).map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
  console.log(`${PREFIX} ${stage} ${parts.join(' ')}`)
}
