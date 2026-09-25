import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { analyzeContent } from '@/src/lib/ai/contentAnalysis'

// POST { content_id } — on-demand AI analysis grounded in this content
// item's actual recorded data (see src/lib/ai/contentAnalysis.ts for the
// exact context sent and the facts/patterns/hypotheses/recommendations
// contract enforced on the response). Gated separately from ordinary
// read/write access since every call spends real money.
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('personal_brand:ai')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const contentId = typeof body.content_id === 'string' ? body.content_id.trim() : ''
    if (!contentId) {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 })
    }

    const result = await analyzeContent(contentId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }

    return NextResponse.json({ analysis: result.data })
  } catch (error) {
    console.error('[Personal Brand AI Analyze] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
