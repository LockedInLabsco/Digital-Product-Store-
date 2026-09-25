import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getDashboardData } from '@/src/lib/personal-brand/dashboard'

// GET the computed Dashboard payload — every number here is plain
// arithmetic (see src/lib/personal-brand/{metrics,baselines,formatEvidence,dashboard}.ts),
// never AI-generated.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const data = await getDashboardData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Personal Brand Analytics] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
