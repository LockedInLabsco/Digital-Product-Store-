'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import SortableTable, { type ColumnDef } from '@/src/components/admin/analytics/SortableTable'
import { calculateRates, formatRate } from '@/src/lib/personal-brand/metrics'
import type { PbContentItem, PbContentMetric, PbContentStatus, PbFormat } from '@/src/types/personalBrand'

interface ContentRow extends PbContentItem {
  latest_metric: PbContentMetric | null
}

const STATUS_FILTERS: ('all' | PbContentStatus)[] = ['all', 'draft', 'planned', 'posted', 'archived']

export default function ContentLibraryClient() {
  const router = useRouter()
  const [content, setContent] = useState<ContentRow[]>([])
  const [formats, setFormats] = useState<PbFormat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PbContentStatus>('all')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const [contentRes, formatsRes] = await Promise.all([
        fetch('/api/admin/personal-brand/content'),
        fetch('/api/admin/personal-brand/formats'),
      ])

      if (contentRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const contentData = await contentRes.json()
      if (!contentRes.ok) throw new Error(contentData.error || 'Failed to fetch content')
      setContent(contentData.content || [])

      if (formatsRes.ok) {
        const formatsData = await formatsRes.json()
        setFormats(formatsData.formats || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }

  const formatById = useMemo(() => {
    const map: Record<string, PbFormat> = {}
    for (const f of formats) map[f.id] = f
    return map
  }, [formats])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return content
    return content.filter((c) => c.status === statusFilter)
  }, [content, statusFilter])

  const columns: ColumnDef<ContentRow>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: (row) => (
        <Link href={`/admin/personal-brand/content/${row.id}`} className="font-medium hover:text-admin-muted">
          {row.title || <span className="text-admin-faint">Untitled</span>}
        </Link>
      ),
      sortValue: (row) => row.title || '',
    },
    {
      key: 'content_type',
      header: 'Type',
      accessor: (row) => <span className="capitalize">{row.content_type}</span>,
      sortValue: (row) => row.content_type,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <span className="capitalize">{row.status}</span>,
      sortValue: (row) => row.status,
    },
    {
      key: 'format',
      header: 'Format',
      accessor: (row) => (row.format_id && formatById[row.format_id] ? formatById[row.format_id].name : '—'),
    },
    {
      key: 'posted_at',
      header: 'Posted',
      accessor: (row) => (row.posted_at ? new Date(row.posted_at).toLocaleDateString() : '—'),
      sortValue: (row) => (row.posted_at ? new Date(row.posted_at).getTime() : 0),
    },
    {
      key: 'views',
      header: 'Views',
      accessor: (row) => row.latest_metric?.views?.toLocaleString() ?? '—',
      sortValue: (row) => row.latest_metric?.views ?? -1,
      align: 'right',
    },
    {
      key: 'engagement_rate',
      header: 'Engagement',
      accessor: (row) => (row.latest_metric ? formatRate(calculateRates(row.latest_metric).engagementRate) : '—'),
      sortValue: (row) => (row.latest_metric ? calculateRates(row.latest_metric).engagementRate ?? -1 : -1),
      align: 'right',
    },
  ]

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-6xl">
          <PersonalBrandTabs />

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">Content Library</h2>
              <p className="text-admin-muted">Everything you&apos;ve posted or planned, in one place.</p>
            </div>
            <Link href="/admin/personal-brand/content/new">
              <Button>+ Add Content</Button>
            </Link>
          </div>

          <div className="mb-6 flex gap-1 text-sm">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded px-3 py-1.5 font-medium capitalize ${
                  statusFilter === s ? 'bg-admin-surface2 text-admin-text' : 'text-admin-muted hover:bg-admin-surface2'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <SortableTable
            columns={columns}
            rows={filteredRows}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            error={error || null}
            emptyMessage="No content yet — add your first piece of content to start building your Content OS."
            defaultSortKey="posted_at"
          />
        </div>
      </Container>
    </main>
  )
}
