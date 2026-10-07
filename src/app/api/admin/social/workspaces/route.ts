import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { getActiveWorkspaceContext, setActiveWorkspaceCookie } from '@/src/lib/admin/activeSocialWorkspace'
import { createSocialWorkspace } from '@/src/lib/social/provisionWorkspace'
import type { SocialWorkspaceRole } from '@/src/types/social'

export interface WorkspaceListEntry {
  id: string
  name: string
  role: SocialWorkspaceRole
  connectedInstagramUsername: string | null
}

// GET — every Social Workspace this admin actually belongs to (any
// role), each annotated with its own connected Instagram account's
// username if it has one, plus which workspace id (if any) is currently
// active for this browser — powers both the workspace switcher dropdown
// and the "pick a workspace" gate screen. Never lists a workspace the
// caller isn't a real social_workspace_members row for.
export async function GET() {
  const auth = await requirePermission('personal_brand:read')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (scope.memberWorkspaceIds.length === 0) {
    return NextResponse.json({ workspaces: [], activeWorkspaceId: null })
  }

  const [{ data: workspaces, error: workspacesError }, { data: accounts, error: accountsError }] = await Promise.all([
    supabaseServer.from('social_workspaces').select('id, name').in('id', scope.memberWorkspaceIds),
    supabaseServer
      .from('social_connected_accounts')
      .select('workspace_id, username')
      .in('workspace_id', scope.memberWorkspaceIds)
      .eq('platform', 'instagram')
      .eq('status', 'active'),
  ])

  if (workspacesError || accountsError) {
    console.error('[Social Workspaces] Failed to list workspaces', workspacesError?.message || accountsError?.message)
    return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 })
  }

  const usernameByWorkspaceId: Record<string, string | null> = {}
  for (const account of accounts || []) usernameByWorkspaceId[account.workspace_id] = account.username

  const entries: WorkspaceListEntry[] = (workspaces || [])
    .map((w) => ({
      id: w.id,
      name: w.name,
      role: scope.ownerWorkspaceIds.includes(w.id) ? ('owner' as const) : scope.writableWorkspaceIds.includes(w.id) ? ('manager' as const) : ('analyst' as const),
      connectedInstagramUsername: usernameByWorkspaceId[w.id] ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const activeContext = await getActiveWorkspaceContext()
  const activeWorkspaceId = activeContext.ok ? activeContext.context.workspaceId : null

  return NextResponse.json({ workspaces: entries, activeWorkspaceId })
}

// POST { name } — create a brand-new Social Workspace and immediately
// make it the caller's active one. Any admin with Social access may
// create a workspace for themselves (they become its owner) — see
// createSocialWorkspace's own doc comment for why this is deliberately
// NOT gated behind the global social:manage_workspaces permission the
// way administering an ARBITRARY existing workspace is.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name : ''
  if (!name.trim()) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
  }

  const result = await createSocialWorkspace(scope.adminUserId, name)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  setActiveWorkspaceCookie(result.workspaceId)
  return NextResponse.json({ workspaceId: result.workspaceId }, { status: 201 })
}
