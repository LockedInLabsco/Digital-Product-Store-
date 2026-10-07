import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { requestWorkspaceAccess, cancelAccessRequest } from '@/src/lib/social/accessRequests'

// POST { accountId } — accountId is Meta's Instagram Business Account
// id (the `instagram_attempted_account_id` the OAuth callback redirected
// back with on already_connected_elsewhere — see that route's own
// comment), NEVER one of our own workspace/connected-account UUIDs. The
// owning workspace is resolved from it server-side inside
// requestWorkspaceAccess — nothing here lets the browser name an
// arbitrary workspace to join.
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
  const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : ''
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  const result = await requestWorkspaceAccess(scope.adminUserId, accountId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.reason === 'account_not_found' ? 404 : 500 })
  }

  return NextResponse.json(result)
}

// DELETE { requestId } — the requester cancelling their own still-pending
// request.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const requestId = typeof body.requestId === 'string' ? body.requestId : ''
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
  }

  const result = await cancelAccessRequest(requestId, scope.adminUserId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.reason === 'not_found' ? 404 : 500 })
  }

  return NextResponse.json({ success: true })
}
