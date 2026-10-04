/**
 * Server-side CSRF state for the "Connect Instagram" (Facebook Login for
 * Business) OAuth flow — see supabase/migrations/0027_social_oauth_states.sql
 * for the table and the full reasoning for why this is a DB row rather
 * than a signed cookie/JWT.
 *
 * The security property this provides: a state value is (a) unguessable
 * (32 random bytes), (b) bound server-side to the admin_user_id and
 * workspace_id that were resolved at connect-start time — never anything
 * the browser supplied — and (c) usable exactly once, via an atomic
 * DELETE ... RETURNING "pop" rather than a read-then-delete that could
 * race. The callback route is still responsible for re-checking that the
 * CURRENTLY authenticated admin matches the popped admin_user_id before
 * writing anything — this file only proves "this state was genuinely
 * issued, to someone, recently, and hasn't been used before," not "it's
 * safe to trust the browser presenting it right now."
 */
import 'server-only'
import crypto from 'node:crypto'
import { supabaseServer } from '@/src/lib/supabase/server'

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes — generous for a Meta login+consent round trip, short enough that an abandoned flow can't be resurrected later
const FLOW_INSTAGRAM_CONNECT = 'instagram_connect'

export interface OAuthStatePayload {
  adminUserId: string
  workspaceId: string
}

/** Creates and persists a new single-use state value for the Instagram connect flow. */
export async function createInstagramOAuthState(payload: OAuthStatePayload): Promise<string> {
  const id = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString()

  const { error } = await supabaseServer.from('social_oauth_states').insert({
    id,
    admin_user_id: payload.adminUserId,
    workspace_id: payload.workspaceId,
    flow: FLOW_INSTAGRAM_CONNECT,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to create OAuth state: ${error.message}`)
  }

  return id
}

export type ConsumeOAuthStateResult =
  | { ok: true; payload: OAuthStatePayload }
  | { ok: false; reason: 'missing_or_already_used' | 'expired' | 'lookup_failed'; error: string }

/**
 * Atomically pops (deletes and returns) a state row by id — a state
 * value can never be consumed twice, whether that's a genuine double
 * callback from Meta or an attacker replaying a captured URL. Returns
 * failure (never throws) for a missing/already-used/expired/corrupt
 * state — callers must treat all of these as "reject the callback,"
 * never fall back to guessing the admin/workspace another way.
 */
export async function consumeInstagramOAuthState(stateId: string): Promise<ConsumeOAuthStateResult> {
  if (!stateId) {
    return { ok: false, reason: 'missing_or_already_used', error: 'Missing OAuth state' }
  }

  const { data, error } = await supabaseServer
    .from('social_oauth_states')
    .delete()
    .eq('id', stateId)
    .eq('flow', FLOW_INSTAGRAM_CONNECT)
    .select('admin_user_id, workspace_id, expires_at')
    .maybeSingle()

  if (error) {
    console.error('[Instagram OAuth State] Failed to consume state', error.message)
    return { ok: false, reason: 'lookup_failed', error: 'Failed to verify OAuth state' }
  }

  if (!data) {
    return {
      ok: false,
      reason: 'missing_or_already_used',
      error: 'This Instagram connection link is invalid or has already been used. Start over from Personal Brand.',
    }
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired', error: 'This Instagram connection link has expired. Start over from Personal Brand.' }
  }

  return { ok: true, payload: { adminUserId: data.admin_user_id, workspaceId: data.workspace_id } }
}
