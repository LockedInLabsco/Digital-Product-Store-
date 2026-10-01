import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { getAllFormatEvidence } from '@/src/lib/personal-brand/formatsAnalytics'

// GET historical evidence for every format in the caller's Social
// Workspace(s), sorted by median engagement rate — powers the Winning
// Formats page. Purely deterministic (see
// src/lib/personal-brand/formatEvidence.ts) — no AI involvement.
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

    const evidence = await getAllFormatEvidence(scope.memberWorkspaceIds)
    return NextResponse.json({ evidence })
  } catch (error) {
    console.error('[Personal Brand Formats Evidence] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
