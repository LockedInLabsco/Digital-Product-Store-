'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import SortableTable, { ColumnDef } from '@/src/components/admin/analytics/SortableTable'
import WaitlistAnalyticsPanel from '@/src/components/admin/analytics/WaitlistAnalyticsPanel'
import type { Waitlist, WaitlistEntry, WaitlistStatus } from '@/src/types/waitlist'

type DetailTab = 'entries' | 'analytics'

function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  closed: 'bg-red-100 text-red-800',
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function WaitlistDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [waitlist, setWaitlist] = useState<(Waitlist & { entry_count: number }) | null>(null)
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('entries')

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const [waitlistRes, entriesRes] = await Promise.all([
        fetch(`/api/admin/waitlists/${params.id}`),
        fetch(`/api/admin/waitlists/${params.id}/entries`),
      ])

      const waitlistData = await waitlistRes.json()
      if (!waitlistRes.ok) {
        if (waitlistRes.status === 401) {
          localStorage.removeItem('admin_token')
          router.push('/admin/login')
          return
        }
        throw new Error(waitlistData.error || 'Failed to load waitlist')
      }

      const entriesData = await entriesRes.json()
      if (!entriesRes.ok) {
        throw new Error(entriesData.error || 'Failed to load leads')
      }

      setWaitlist(waitlistData.waitlist)
      setEntries(entriesData.entries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waitlist')
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }
    setOrigin(window.location.origin)
    fetchAll()
  }, [fetchAll, router])

  const publicUrl = waitlist ? `${origin}/waitlist/${waitlist.slug}` : ''

  const handleCopyUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Non-critical if the clipboard API is unavailable.
    }
  }

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail((current) => (current === email ? null : current)), 1500)
    } catch {
      // Non-critical if the clipboard API is unavailable.
    }
  }

  const handleStatusChange = async (status: WaitlistStatus) => {
    if (!waitlist) return
    setStatusUpdating(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/waitlists/${waitlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlist.name,
          slug: waitlist.slug,
          description: waitlist.description,
          headline: waitlist.headline,
          supporting_text: waitlist.supporting_text,
          button_text: waitlist.button_text,
          status,
          theme_config: waitlist.theme_config,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      setWaitlist((current) => (current ? { ...current, status } : current))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!waitlist || deleteConfirmText.trim() !== waitlist.name) return
    setIsDeleting(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/waitlists/${waitlist.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete waitlist')
      }
      router.push('/admin/waitlists')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete waitlist')
      setIsDeleting(false)
    }
  }

  const handleExportCsv = () => {
    if (!waitlist) return
    const rows: string[][] = [
      ['First name', 'Email', 'Instagram handle', 'Source', 'Joined date'],
      ...entries.map((entry) => [
        entry.first_name || '',
        entry.email,
        entry.instagram_username || '',
        entry.source,
        entry.created_at,
      ]),
    ]
    downloadCsv(`${waitlist.slug}-leads.csv`, rows)
  }

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return entries
    return entries.filter((entry) =>
      [entry.email, entry.instagram_username || '', entry.first_name || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [entries, search])

  const columns: ColumnDef<WaitlistEntry>[] = [
    {
      key: 'first_name',
      header: 'First name',
      accessor: (row) => row.first_name || '-',
      sortValue: (row) => (row.first_name || '').toLowerCase(),
    },
    {
      key: 'email',
      header: 'Email',
      accessor: (row) => (
        <button
          type="button"
          onClick={() => handleCopyEmail(row.email)}
          className="text-black hover:underline"
          title="Copy email"
        >
          {copiedEmail === row.email ? 'Copied!' : row.email}
        </button>
      ),
      sortValue: (row) => row.email,
    },
    {
      key: 'instagram_username',
      header: 'Handle',
      accessor: (row) => (row.instagram_username ? `@${row.instagram_username}` : '-'),
      sortValue: (row) => (row.instagram_username || '').toLowerCase(),
    },
    {
      key: 'source',
      header: 'Source',
      accessor: (row) => row.source,
      sortValue: (row) => row.source,
    },
    {
      key: 'created_at',
      header: 'Joined',
      accessor: (row) => formatDate(row.created_at),
      sortValue: (row) => new Date(row.created_at).getTime(),
    },
  ]

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container className="py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <Link href="/admin" className="hover:text-gray-600">
              Not4Normal Admin
            </Link>
          </h1>
          <button onClick={handleLogout} className="text-gray-600 hover:text-black text-sm">
            Log Out
          </button>
        </Container>
      </div>

      <Container className="py-12">
        <div className="max-w-6xl">
          <Link href="/admin/waitlists" className="text-gray-600 hover:text-black text-sm">
            ← Back to Waitlists
          </Link>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 my-6">{error}</div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : !waitlist ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg bg-white mt-6">
              <p className="text-gray-600">Waitlist not found</p>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-bold">{waitlist.name}</h2>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        STATUS_STYLES[waitlist.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {waitlist.status}
                    </span>
                  </div>
                  {waitlist.description && <p className="mt-2 text-gray-600 max-w-xl">{waitlist.description}</p>}
                  <p className="mt-3 text-sm">
                    <a href={publicUrl} target="_blank" rel="noreferrer" className="font-mono text-black hover:underline break-all">
                      {publicUrl}
                    </a>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="text-gray-600">
                      <span className="font-semibold text-black">{waitlist.entry_count}</span> total leads
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">Created {formatDate(waitlist.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:min-w-[220px]">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                      {copied ? 'Copied!' : 'Copy public URL'}
                    </Button>
                    <a href={publicUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        Open public page
                      </Button>
                    </a>
                  </div>
                  <Link href={`/admin/waitlists/${waitlist.id}/edit`}>
                    <Button size="sm" className="w-full bg-black text-white hover:bg-gray-900">
                      Edit waitlist
                    </Button>
                  </Link>
                  <div>
                    <label htmlFor="quick-status" className="block text-xs font-medium text-gray-600 mb-1">
                      Change status
                    </label>
                    <select
                      id="quick-status"
                      value={waitlist.status}
                      disabled={statusUpdating}
                      onChange={(e) => handleStatusChange(e.target.value as WaitlistStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-12 border-t border-gray-200 pt-8">
                <div className="mb-6 flex gap-1 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('entries')}
                    className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                      activeTab === 'entries'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-black'
                    }`}
                  >
                    Entries
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                      activeTab === 'analytics'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-black'
                    }`}
                  >
                    Analytics
                  </button>
                </div>

                {activeTab === 'entries' ? (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">Leads</h3>
                        <p className="text-sm text-gray-600">
                          {filteredEntries.length} of {entries.length} shown
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search email, Instagram, or name"
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black w-64 max-w-full"
                        />
                        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={entries.length === 0}>
                          Export CSV
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <SortableTable
                        columns={columns}
                        rows={filteredEntries}
                        rowKey={(row) => row.id}
                        emptyMessage={entries.length === 0 ? 'No leads yet' : 'No leads match your search'}
                        defaultSortKey="created_at"
                        defaultSortDirection="desc"
                      />
                    </div>
                  </>
                ) : (
                  <WaitlistAnalyticsPanel waitlistId={waitlist.id} />
                )}
              </div>

              <div className="mt-12 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold text-red-700 mb-2">Danger zone</h3>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete waitlist
                  </Button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-xl">
                    <p className="text-sm text-red-800">
                      This permanently deletes <strong>{waitlist.name}</strong> and all{' '}
                      <strong>{waitlist.entry_count}</strong> lead{waitlist.entry_count === 1 ? '' : 's'} attached to
                      it. This cannot be undone.
                    </p>
                    <label htmlFor="delete-confirm" className="block text-sm font-medium mt-4 mb-2">
                      Type <span className="font-mono font-semibold">{waitlist.name}</span> to confirm
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleDelete}
                        disabled={deleteConfirmText.trim() !== waitlist.name || isDeleting}
                        className="bg-red-700 text-white hover:bg-red-800"
                      >
                        {isDeleting ? 'Deleting...' : 'Permanently delete'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
