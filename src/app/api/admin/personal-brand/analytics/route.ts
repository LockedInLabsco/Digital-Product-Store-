import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { getDashboardData } from '@/src/lib/personal-brand/dashboard'

// GET the computed Dashboard payload, scoped to the caller's authorized
// Social Workspace(s) — every number here is plain arithmetic (see
// src/lib/personal-brand/{metrics,baselines,formatEvidence,dashboard}.ts),
// never AI-generated.
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

    const data = await getDashboardData(scope.memberWorkspaceIds)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Personal Brand Analytics] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
