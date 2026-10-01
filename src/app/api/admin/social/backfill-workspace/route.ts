import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { backfillSocialWorkspace } from '@/src/lib/social/backfillWorkspace'

/**
 * One-time (but safely repeatable) migration trigger for the Social
 * Workspace foundation — see backfillSocialWorkspace() for the full
 * idempotent logic. Gated by social:manage_workspaces (Owner only in
 * practice). Not part of the public API surface — no UI links here; it
 * exists purely as a safe, server-only mechanism to run (or re-run) the
 * backfill in whichever environment actually has
 * INSTAGRAM_BUSINESS_ACCOUNT_ID/INSTAGRAM_ACCESS_TOKEN configured, since
 * those values only exist in application env vars, never in the
 * database, and this route's own code never logs or returns a token
 * value.
 */
export async function POST() {
  const auth = await requirePermission('social:manage_workspaces')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const result = await backfillSocialWorkspace()
    return NextResponse.json(result, { status: result.ok ? 200 : 409 })
  } catch (error) {
    console.error('[Social Workspace Backfill] Exception', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
