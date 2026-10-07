import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse } from '@/src/lib/admin/activeSocialWorkspace'
import { getDashboardData } from '@/src/lib/personal-brand/dashboard'

// GET the computed Dashboard payload, scoped to the caller's active
// Social Workspace — every number here is plain arithmetic (see
// src/lib/personal-brand/{metrics,baselines,formatEvidence,dashboard}.ts),
// never AI-generated.
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

    const data = await getDashboardData([active.context.workspaceId])
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Personal Brand Analytics] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
