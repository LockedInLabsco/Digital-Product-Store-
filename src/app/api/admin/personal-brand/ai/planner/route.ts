import { NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { generatePlan } from '@/src/lib/ai/planner'

// POST generate a "what to post next" recommendation grounded in the
// caller's authorized Social Workspace(s)' own Content OS data (see
// src/lib/ai/planner.ts). No request body — the planner reads current
// formats/ideas/experiments/recent posts itself, scoped server-side.
export async function POST() {
  try {
    const auth = await requirePermission('personal_brand:ai')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await generatePlan(scope.memberWorkspaceIds)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }

    return NextResponse.json({ plan: result.data })
  } catch (error) {
    console.error('[Personal Brand AI Planner] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
