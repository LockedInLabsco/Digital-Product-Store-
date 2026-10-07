import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse } from '@/src/lib/admin/activeSocialWorkspace'

export interface InstagramConnectionStatus {
  connected: boolean
  username: string | null
  displayName: string | null
  connectedAt: string | null
  /** Which OAuth product this connection's content token(s) came from —
   * lets the UI send Reconnect/Refresh back through the SAME flow that
   * originally connected the account (see InstagramConnectionPanel.tsx).
   * 'instagram_login' takes priority if both exist (same preference
   * contentAccountResolution.ts uses for actually reading content). Null
   * when not connected. */
  connectionMethod: 'instagram_login' | 'facebook_login' | null
}

// GET — safe-fields-only connection status for the caller's ACTIVE
// workspace (never the external_account_id or any token) — backs the
// "Instagram: connected as @username / Not connected" panel on the
// Content Library page. Resolution switches with the active workspace,
// same as every other personal-brand route — no more auto-provisioning
// here; PersonalBrandLayout's gate is what ensures an active workspace
// already exists before this route is ever reached from the UI.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }

    const { data: account, error } = await supabaseServer
      .from('social_connected_accounts')
      .select('id, username, display_name, connected_at')
      .eq('workspace_id', active.context.workspaceId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('[Instagram Status] Failed to look up connected account', error.message)
      return NextResponse.json({ error: 'Failed to look up Instagram connection status' }, { status: 500 })
    }

    let connectionMethod: InstagramConnectionStatus['connectionMethod'] = null
    if (account) {
      const { data: tokenRows } = await supabaseServer
        .from('social_account_tokens')
        .select('provider')
        .eq('connected_account_id', account.id)
        .in('provider', ['instagram_login', 'facebook_login'])

      const providers = new Set((tokenRows || []).map((r) => r.provider))
      connectionMethod = providers.has('instagram_login') ? 'instagram_login' : providers.has('facebook_login') ? 'facebook_login' : null
    }

    const status: InstagramConnectionStatus = account
      ? { connected: true, username: account.username, displayName: account.display_name, connectedAt: account.connected_at, connectionMethod }
      : { connected: false, username: null, displayName: null, connectedAt: null, connectionMethod: null }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('[Instagram Status] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
