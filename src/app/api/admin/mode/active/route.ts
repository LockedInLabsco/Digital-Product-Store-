import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { setAdminModeCookie } from '@/src/lib/admin/adminMode'
import type { AdminRole } from '@/src/types/admin'

const VALID_MODES: AdminRole[] = ['owner', 'developer', 'social_media', 'analyst']

// POST { mode } — switch the caller's active admin mode (Founder/
// Developer/Social Media/Analyst). The browser names which mode it
// wants, but that is only ever a REQUEST: this route independently
// verifies the current admin actually holds that role before the
// cookie is ever set — a mode preference can never grant access to a
// role this admin doesn't have (see adminMode.ts's own header). This is
// navigation/UI state only; every page/route the new mode's nav links
// to still re-checks the real permission independently.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => ({}))
  const mode = typeof body.mode === 'string' ? body.mode : ''

  if (!VALID_MODES.includes(mode as AdminRole) || !auth.admin.roles.includes(mode as AdminRole)) {
    return NextResponse.json({ error: 'You do not hold that role' }, { status: 403 })
  }

  setAdminModeCookie(mode as AdminRole)
  return NextResponse.json({ ok: true })
}
