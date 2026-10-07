import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { setActiveWorkspaceCookie } from '@/src/lib/admin/activeSocialWorkspace'

// POST { workspaceId } — switch the caller's active Social Workspace.
// The browser names which workspace it wants active, but that is only
// ever a REQUEST: this route independently verifies the current admin
// has an actual social_workspace_members row for it (any role — even a
// read-only analyst can switch into a workspace to view it) before the
// cookie is ever set. See the Social Media Multi-Workspace Audit's
// CASE 7 — a manually-sent, unauthorized workspace id must be rejected
// here, not just downstream.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('personal_brand:read')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''

  if (!workspaceId || !scope.memberWorkspaceIds.includes(workspaceId)) {
    return NextResponse.json({ error: 'You are not a member of that Social Workspace' }, { status: 403 })
  }

  setActiveWorkspaceCookie(workspaceId)
  return NextResponse.json({ ok: true })
}
