'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import type { WaitlistWithCount } from '@/src/types/waitlist'

function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  closed: 'bg-red-100 text-red-800',
}

export default function AdminWaitlistsPage() {
  const router = useRouter()
  const [waitlists, setWaitlists] = useState<WaitlistWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  const fetchWaitlists = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/admin/waitlists')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token')
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to fetch waitlists')
      }

      setWaitlists(data.waitlists || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waitlists')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }
    setOrigin(window.location.origin)
    fetchWaitlists()
  }, [fetchWaitlists, router])

  const publicUrl = (slug: string) => `${origin}/waitlist/${slug}`

  const handleCopy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug))
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 1500)
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure context) — non-critical.
    }
  }

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
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Waitlists</h2>
              <p className="text-gray-600">Create and manage waitlists for future apps and launches</p>
            </div>
            <Link href="/admin/waitlists/new">
              <Button className="bg-black text-white hover:bg-gray-900">+ Create waitlist</Button>
            </Link>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-8">{error}</div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading waitlists...</p>
            </div>
          ) : waitlists.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
              <p className="text-gray-600 mb-6">No waitlists yet</p>
              <Link href="/admin/waitlists/new">
                <Button className="bg-black text-white hover:bg-gray-900">Create your first waitlist</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="text-left py-4 px-4 font-semibold">Name</th>
                    <th className="text-left py-4 px-4 font-semibold">Slug</th>
                    <th className="text-left py-4 px-4 font-semibold">Status</th>
                    <th className="text-left py-4 px-4 font-semibold">Leads</th>
                    <th className="text-left py-4 px-4 font-semibold">Created</th>
                    <th className="text-left py-4 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlists.map((waitlist) => (
                    <tr key={waitlist.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Link href={`/admin/waitlists/${waitlist.id}`} className="font-medium hover:underline">
                          {waitlist.name}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-600 text-sm font-mono">{waitlist.slug}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                            STATUS_STYLES[waitlist.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {waitlist.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium">{waitlist.entry_count}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-600 text-sm">{formatDate(waitlist.created_at)}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-3">
                          <Link href={`/admin/waitlists/${waitlist.id}`}>
                            <button className="text-black hover:text-gray-600 text-sm font-medium">View</button>
                          </Link>
                          <a href={publicUrl(waitlist.slug)} target="_blank" rel="noreferrer">
                            <button className="text-black hover:text-gray-600 text-sm font-medium">Open</button>
                          </a>
                          <button
                            onClick={() => handleCopy(waitlist.slug)}
                            className="text-black hover:text-gray-600 text-sm font-medium"
                          >
                            {copiedSlug === waitlist.slug ? 'Copied!' : 'Copy URL'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
