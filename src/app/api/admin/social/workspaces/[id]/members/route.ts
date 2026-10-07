import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canReadWorkspace, canManageWorkspaceMembers } from '@/src/lib/admin/socialWorkspaceScope'
import { listPendingAccessRequests } from '@/src/lib/social/accessRequests'
import type { SocialWorkspaceRole } from '@/src/types/social'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WORKSPACE_ROLES: SocialWorkspaceRole[] = ['owner', 'manager', 'analyst']

function isValidRole(value: unknown): value is SocialWorkspaceRole {
  return typeof value === 'string' && WORKSPACE_ROLES.includes(value as SocialWorkspaceRole)
}

// GET — this workspace's real members (admin email + role) plus any
// still-pending invites. Any actual member (owner/manager/analyst) can
// see who else is in their own workspace; only canManageWorkspaceMembers
// can change any of it (see POST/PATCH/DELETE below).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('personal_brand:read')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canReadWorkspace(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
    supabaseServer.from('social_workspace_members').select('id, admin_user_id, workspace_role, created_at').eq('workspace_id', params.id),
    supabaseServer
      .from('social_workspace_invites')
      .select('id, email, workspace_role, created_at')
      .eq('workspace_id', params.id)
      .eq('status', 'pending'),
  ])

  if (membersError || invitesError) {
    console.error('[Workspace Members] Failed to list members', membersError?.message || invitesError?.message)
    return NextResponse.json({ error: 'Failed to load workspace members' }, { status: 500 })
  }

  const adminUserIds = (members || []).map((m) => m.admin_user_id)
  const { data: adminRows } = adminUserIds.length
    ? await supabaseServer.from('admin_users').select('id, email').in('id', adminUserIds)
    : { data: [] }

  const emailByAdminUserId: Record<string, string> = {}
  for (const row of adminRows || []) emailByAdminUserId[row.id] = row.email

  const membersWithEmail = (members || []).map((m) => ({ ...m, email: emailByAdminUserId[m.admin_user_id] || null }))
  const canManage = canManageWorkspaceMembers(scope, params.id)

  // Access requests carry the requester's email (see
  // listPendingAccessRequests) — same privacy boundary as everything
  // else on this route: only someone who can actually manage this
  // workspace's membership ever sees who's asking to join it.
  const accessRequests = canManage ? await listPendingAccessRequests(params.id) : []

  return NextResponse.json({
    members: membersWithEmail,
    invites: invites || [],
    accessRequests,
    canManage,
  })
}

// POST { email, role } — invite someone into this workspace. If that
// email already belongs to an admin_users row, membership is granted
// immediately (no re-authentication, no Instagram reconnection — see
// the Social Media Multi-Workspace Audit's CASE 2). Otherwise a pending
// social_workspace_invites row is created, and — only if this email has
// no other way to ever sign in yet — a minimal site-wide admin_invites
// row + Supabase invite email, reusing the exact mechanism
// /api/admin/team already uses, never a second auth system. See
// src/lib/admin/auth.ts's acceptPendingSocialWorkspaceInvites for where
// the pending row is converted into real membership on first login.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canReadWorkspace(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }
  if (!canManageWorkspaceMembers(scope, params.id)) {
    return NextResponse.json({ error: 'Only this workspace’s owner can invite members' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body.role

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'Select a valid workspace role' }, { status: 400 })
  }

  const { data: existingAdmin } = await supabaseServer.from('admin_users').select('id').eq('email', email).maybeSingle()

  if (existingAdmin) {
    const { error: memberError } = await supabaseServer
      .from('social_workspace_members')
      .insert({ workspace_id: params.id, admin_user_id: existingAdmin.id, workspace_role: role })

    if (memberError) {
      if (memberError.code === '23505') {
        return NextResponse.json({ error: 'That admin is already a member of this workspace' }, { status: 409 })
      }
      console.error('[Workspace Members] Failed to add existing admin', memberError.message)
      return NextResponse.json({ error: 'Failed to add this member' }, { status: 500 })
    }

    return NextResponse.json({ added: true }, { status: 201 })
  }

  const { data: workspaceInvite, error: workspaceInviteError } = await supabaseServer
    .from('social_workspace_invites')
    .insert({ workspace_id: params.id, email, workspace_role: role, invited_by: scope.adminUserId })
    .select()
    .maybeSingle()

  if (workspaceInviteError) {
    if (workspaceInviteError.code === '23505') {
      return NextResponse.json({ error: 'This email already has a pending invite to this workspace' }, { status: 409 })
    }
    console.error('[Workspace Members] Failed to create workspace invite', workspaceInviteError.message)
    return NextResponse.json({ error: 'Failed to invite this email' }, { status: 500 })
  }

  // Only create the site-wide sign-in invite if this email has no other
  // pending one already — never duplicate or downgrade an existing
  // broader invite (e.g. one made from the Team page with extra roles).
  const { data: existingSiteInvite } = await supabaseServer
    .from('admin_invites')
    .select('id')
    .eq('status', 'pending')
    .eq('email', email)
    .maybeSingle()

  if (!existingSiteInvite) {
    const { error: siteInviteError } = await supabaseServer
      .from('admin_invites')
      .insert({ email, roles: ['social_media'], status: 'pending', invited_by: scope.adminUserId })

    if (siteInviteError && siteInviteError.code !== '23505') {
      console.error('[Workspace Members] Failed to create site-wide sign-in invite', siteInviteError.message)
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
      const { error: inviteEmailError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/admin')}`,
      })
      if (inviteEmailError) {
        console.error('[Workspace Members] Supabase invite email failed', inviteEmailError.message)
      }
    }
  }

  return NextResponse.json({ invited: true, invite: workspaceInvite }, { status: 201 })
}

// PATCH { memberId, role } — change an existing member's workspace role.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canManageWorkspaceMembers(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''
  const role = body.role
  if (!memberId || !isValidRole(role)) {
    return NextResponse.json({ error: 'memberId and a valid role are required' }, { status: 400 })
  }

  const { data: existing } = await supabaseServer
    .from('social_workspace_members')
    .select('id, workspace_role')
    .eq('id', memberId)
    .eq('workspace_id', params.id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (existing.workspace_role === 'owner' && role !== 'owner') {
    const { count } = await supabaseServer
      .from('social_workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', params.id)
      .eq('workspace_role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'A workspace must keep at least one owner' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseServer.from('social_workspace_members').update({ workspace_role: role }).eq('id', memberId).select().maybeSingle()

  if (error) {
    console.error('[Workspace Members] Failed to update role', error.message)
    return NextResponse.json({ error: 'Failed to update this member’s role' }, { status: 500 })
  }

  return NextResponse.json({ member: data })
}

// DELETE { memberId } or { inviteId } — remove a member, or revoke a
// pending invite.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canManageWorkspaceMembers(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''
  const inviteId = typeof body.inviteId === 'string' ? body.inviteId : ''

  if (inviteId) {
    const { data, error } = await supabaseServer
      .from('social_workspace_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('workspace_id', params.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Workspace Members] Failed to revoke invite', error.message)
      return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Pending invite not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  }

  if (!memberId) {
    return NextResponse.json({ error: 'memberId or inviteId is required' }, { status: 400 })
  }

  const { data: existing } = await supabaseServer
    .from('social_workspace_members')
    .select('id, workspace_role')
    .eq('id', memberId)
    .eq('workspace_id', params.id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (existing.workspace_role === 'owner') {
    const { count } = await supabaseServer
      .from('social_workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', params.id)
      .eq('workspace_role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'A workspace must keep at least one owner — transfer ownership first' }, { status: 400 })
    }
  }

  const { error } = await supabaseServer.from('social_workspace_members').delete().eq('id', memberId)
  if (error) {
    console.error('[Workspace Members] Failed to remove member', error.message)
    return NextResponse.json({ error: 'Failed to remove this member' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
