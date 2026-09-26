import { describe, expect, it } from 'vitest'
import { buildFormatEvidence, buildPerformanceRows } from './formatEvidence'
import type { PbContentItem, PbContentMetric, PbFormat } from '@/src/types/personalBrand'

function makeContent(overrides: Partial<PbContentItem>): PbContentItem {
  return {
    id: 'c1',
    platform: 'instagram',
    content_type: 'reel',
    status: 'posted',
    title: 'Test post',
    caption: null,
    script: null,
    transcript: null,
    hook: null,
    cta: null,
    topic: null,
    content_pillar: null,
    goal: null,
    format_id: null,
    audio_used: null,
    duration_seconds: null,
    posted_at: '2026-01-01T00:00:00Z',
    platform_url: null,
    thumbnail_path: null,
    media_path: null,
    notes: null,
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMetric(overrides: Partial<PbContentMetric>): PbContentMetric {
  return {
    id: 'm1',
    content_id: 'c1',
    recorded_at: '2026-01-02T00:00:00Z',
    views: null,
    reach: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    followers_gained: null,
    profile_visits: null,
    dms_generated: null,
    watch_time_seconds: null,
    average_watch_time_seconds: null,
    completion_rate: null,
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  }
}

function makeFormat(overrides: Partial<PbFormat>): PbFormat {
  return {
    id: 'f1',
    name: 'Direct Promise',
    description: null,
    hook_structure: null,
    body_structure: null,
    cta_structure: null,
    status: 'active',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildPerformanceRows', () => {
  it('picks the latest snapshot and computes its rates', () => {
    const items = [makeContent({ id: 'c1' })]
    const metricsByContentId = {
      c1: [
        makeMetric({ id: 'm1', content_id: 'c1', recorded_at: '2026-01-02T00:00:00Z', views: 1000, likes: 50 }),
        makeMetric({ id: 'm2', content_id: 'c1', recorded_at: '2026-01-05T00:00:00Z', views: 2000, likes: 100 }),
      ],
    }

    const rows = buildPerformanceRows(items, metricsByContentId)
    expect(rows).toHaveLength(1)
    expect(rows[0].latestMetric?.id).toBe('m2')
    expect(rows[0].rates?.likeRate).toBe(0.05)
  })

  it('handles a content item with no metrics at all', () => {
    const rows = buildPerformanceRows([makeContent({ id: 'c1' })], {})
    expect(rows[0].latestMetric).toBeNull()
    expect(rows[0].rates).toBeNull()
  })
})

describe('buildFormatEvidence', () => {
  it('includes a format with zero evidence rather than omitting it', () => {
    const evidence = buildFormatEvidence([makeFormat({ id: 'f1' })], [])
    expect(evidence).toHaveLength(1)
    expect(evidence[0].sampleSize).toBe(0)
    expect(evidence[0].medianViews).toBeNull()
    expect(evidence[0].hasEnoughEvidence).toBe(false)
    expect(evidence[0].bestPost).toBeNull()
  })

  it('aggregates only content items belonging to the format', () => {
    const format = makeFormat({ id: 'f1' })
    const otherFormat = makeFormat({ id: 'f2', name: 'Other' })

    const rows = buildPerformanceRows(
      [
        makeContent({ id: 'c1', format_id: 'f1' }),
        makeContent({ id: 'c2', format_id: 'f1' }),
        makeContent({ id: 'c3', format_id: 'f2' }),
      ],
      {
        c1: [makeMetric({ id: 'm1', content_id: 'c1', views: 1000, likes: 100, comments: 0, shares: 0, saves: 0 })],
        c2: [makeMetric({ id: 'm2', content_id: 'c2', views: 2000, likes: 400, comments: 0, shares: 0, saves: 0 })],
        c3: [makeMetric({ id: 'm3', content_id: 'c3', views: 500, likes: 500, comments: 0, shares: 0, saves: 0 })],
      }
    )

    const evidence = buildFormatEvidence([format, otherFormat], rows)
    const f1Evidence = evidence.find((e) => e.format.id === 'f1')!
    expect(f1Evidence.sampleSize).toBe(2)
    expect(f1Evidence.medianViews).toBe(1500)
  })

  it('flags low sample size as not-enough-evidence', () => {
    const format = makeFormat({ id: 'f1' })
    const rows = buildPerformanceRows(
      [makeContent({ id: 'c1', format_id: 'f1' })],
      { c1: [makeMetric({ id: 'm1', content_id: 'c1', views: 1000, likes: 100 })] }
    )
    const evidence = buildFormatEvidence([format], rows)
    expect(evidence[0].sampleSize).toBe(1)
    expect(evidence[0].hasEnoughEvidence).toBe(false)
  })

  it('picks the best post by engagement rate within the format', () => {
    const format = makeFormat({ id: 'f1' })
    const rows = buildPerformanceRows(
      [makeContent({ id: 'c1', format_id: 'f1', title: 'Low' }), makeContent({ id: 'c2', format_id: 'f1', title: 'High' })],
      {
        c1: [makeMetric({ id: 'm1', content_id: 'c1', views: 1000, likes: 10, comments: 0, shares: 0, saves: 0 })],
        c2: [makeMetric({ id: 'm2', content_id: 'c2', views: 1000, likes: 500, comments: 0, shares: 0, saves: 0 })],
      }
    )
    const evidence = buildFormatEvidence([format], rows)
    expect(evidence[0].bestPost?.title).toBe('High')
  })

  it('excludes content items with no metrics from a format sample size', () => {
    const format = makeFormat({ id: 'f1' })
    const rows = buildPerformanceRows(
      [makeContent({ id: 'c1', format_id: 'f1' }), makeContent({ id: 'c2', format_id: 'f1' })],
      { c1: [makeMetric({ id: 'm1', content_id: 'c1', views: 1000 })] }
    )
    const evidence = buildFormatEvidence([format], rows)
    expect(evidence[0].sampleSize).toBe(1)
  })
})
