import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse } from '@/src/lib/admin/activeSocialWorkspace'
import { getAllFormatEvidence } from '@/src/lib/personal-brand/formatsAnalytics'

// GET historical evidence for every format in the caller's active Social
// Workspace, sorted by median engagement rate — powers the Winning
// Formats page. Purely deterministic (see
// src/lib/personal-brand/formatEvidence.ts) — no AI involvement.
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

    const evidence = await getAllFormatEvidence([active.context.workspaceId])
    return NextResponse.json({ evidence })
  } catch (error) {
    console.error('[Personal Brand Formats Evidence] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
