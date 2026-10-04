import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, resolveDefaultWritableWorkspaceId } from '@/src/lib/admin/socialWorkspaceScope'

export interface InstagramConnectionStatus {
  connected: boolean
  username: string | null
  displayName: string | null
  connectedAt: string | null
}

// GET — safe-fields-only connection status for the caller's own
// workspace (never the external_account_id or any token) — backs the
// "Instagram: connected as @username / Not connected" panel on the
// Content Library page. Same workspace resolution as every other
// personal-brand route in this subsystem (instagram-sync, automations
// POST/media) — see the implementation report for why this route
// doesn't attempt to support an admin belonging to more than one
// writable workspace yet.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
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

    const { data: account, error } = await supabaseServer
      .from('social_connected_accounts')
      .select('username, display_name, connected_at')
      .eq('workspace_id', workspaceResult.workspaceId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('[Instagram Status] Failed to look up connected account', error.message)
      return NextResponse.json({ error: 'Failed to look up Instagram connection status' }, { status: 500 })
    }

    const status: InstagramConnectionStatus = account
      ? { connected: true, username: account.username, displayName: account.display_name, connectedAt: account.connected_at }
      : { connected: false, username: null, displayName: null, connectedAt: null }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('[Instagram Status] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
