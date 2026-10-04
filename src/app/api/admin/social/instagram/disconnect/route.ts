import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, resolveDefaultWritableWorkspaceId } from '@/src/lib/admin/socialWorkspaceScope'
import { disconnectInstagramAccount } from '@/src/lib/social/instagramConnectAccount'

// POST — called via fetch (ordinary JSON API route, unlike the OAuth
// routes). Resolves the caller's own writable workspace server-side,
// same as every other mutating personal-brand route; the browser never
// supplies a workspace_id. Only ever affects that one workspace's own
// connected account/token — see disconnectInstagramAccount's own doc
// comment for exactly what is and isn't touched.
export async function POST() {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workspaceResult = resolveDefaultWritableWorkspaceId(scope)
    if (!workspaceResult.ok) {
      return NextResponse.json({ error: workspaceResult.error }, { status: 400 })
    }

    const result = await disconnectInstagramAccount(workspaceResult.workspaceId)
    if (!result.ok) {
      const status = result.reason === 'not_connected' ? 400 : 500
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Instagram Disconnect] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
