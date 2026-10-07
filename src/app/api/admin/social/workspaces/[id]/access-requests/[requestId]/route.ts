import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canManageWorkspaceMembers } from '@/src/lib/admin/socialWorkspaceScope'
import { resolveAccessRequest } from '@/src/lib/social/accessRequests'

// PATCH { decision: 'approved' | 'rejected', role? } — the workspace
// OWNER's approve/reject action (CASE 4: a manager/analyst gets 403
// here — same gate as every other membership-management action on this
// workspace, see src/app/api/admin/social/workspaces/[id]/members/route.ts).
// Approving requires `role` ('manager' | 'analyst' — never 'owner': a
// requester is never auto-promoted to owner, enforced both here and by
// the table's own check constraint).
export async function PATCH(request: NextRequest, { params }: { params: { id: string; requestId: string } }) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canManageWorkspaceMembers(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const decision = body.decision
  const role = body.role

  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 })
  }
  if (decision === 'approved' && role !== 'manager' && role !== 'analyst') {
    return NextResponse.json({ error: "A role of 'manager' or 'analyst' is required to approve" }, { status: 400 })
  }

  const result = await resolveAccessRequest(params.id, params.requestId, scope.adminUserId, decision, decision === 'approved' ? role : null)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.reason === 'not_found' ? 404 : 500 })
  }

  return NextResponse.json(result)
}
