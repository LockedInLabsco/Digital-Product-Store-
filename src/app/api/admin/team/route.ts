import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLES } from '@/src/lib/admin/permissions'
import type { AdminRole } from '@/src/types/admin'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Validates a roles payload: must be an array, every entry a known
 * AdminRole, at least one, no duplicates. */
function parseRoles(value: unknown): AdminRole[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const unique = Array.from(new Set(value))
  if (unique.some((r) => !ADMIN_ROLES.includes(r as AdminRole))) return null
  return unique as AdminRole[]
}

// GET: list active/disabled members + pending invites
export async function GET() {
  const auth = await requirePermission('team:read')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
      supabaseServer.from('admin_users').select('*').order('created_at', { ascending: true }),
      supabaseServer
        .from('admin_invites')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ])

    if (membersError || invitesError) {
      console.error('[GET /api/admin/team] Failed to load team', membersError?.message || invitesError?.message)
      return NextResponse.json({ error: 'Failed to load team' }, { status: 500 })
    }

    return NextResponse.json({
      members: members || [],
      invites: invites || [],
      currentUserId: auth.admin.user.id,
    })
  } catch (error) {
    console.error('[GET /api/admin/team] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: invite a new team member by email + role. Only team:manage.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('team:manage')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const roles = parseRoles(body.roles)

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (!roles) {
      return NextResponse.json({ error: 'Select at least one valid role' }, { status: 400 })
    }

    const { data: existingMember } = await supabaseServer
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: 'This email is already a team member' }, { status: 409 })
    }

    // Find the inviting admin's own admin_users.id for the invited_by FK
    // (requirePermission's `admin` is the resolved identity, keyed by
    // auth user id — admin_users.id is a different, internal id).
    const { data: inviterRow } = await supabaseServer
      .from('admin_users')
      .select('id')
      .eq('user_id', auth.admin.user.id)
      .maybeSingle()

    const { data: invite, error: insertError } = await supabaseServer
      .from('admin_invites')
      .insert({ email, roles, status: 'pending', invited_by: inviterRow?.id ?? null })
      .select()
      .maybeSingle()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This email already has a pending invite' }, { status: 409 })
      }
      console.error('[POST /api/admin/team] Failed to create invite', insertError.message)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Sends Supabase's own invite email (a magic link that, once
    // clicked, lands on /auth/callback and creates the auth.users
    // account) — this is the actual mechanism that lets the invited
    // person sign in; admin_invites above is just our own record of who
    // was invited to what role, converted into admin_users membership
    // the first time that email successfully authenticates (see
    // getCurrentAdmin in lib/admin/auth.ts).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const { error: inviteEmailError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/admin')}`,
    })

    if (inviteEmailError) {
      // The invite row still exists — if this email signs in some other
      // way (e.g. Google) before the email arrives, they're still
      // promoted correctly. Log rather than fail the whole request.
      console.error('[POST /api/admin/team] Supabase invite email failed', inviteEmailError.message)
    }

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/team] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
