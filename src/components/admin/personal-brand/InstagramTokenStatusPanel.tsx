'use client'

import { useEffect, useState } from 'react'
import Button from '@/src/components/admin/AdminButton'

interface TokenStatus {
  configured: boolean
  connected: boolean
  needs_reconnect: boolean
  token_type: 'short_lived' | 'long_lived' | 'unknown' | null
  expires_at: string | null
  days_remaining: number | null
  last_refreshed_at: string | null
  refresh_status: 'unknown' | 'ok' | 'failed' | null
  last_refresh_error: string | null
}

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

/**
 * Safe-only integration status for the Instagram Login messaging token —
 * never renders the token itself, only what tokenStore.ts's status
 * endpoint returns (expiry, refresh outcome, sanitized error text). See
 * src/lib/instagram/tokenStore.ts for the refresh logic this reflects.
 */
export default function InstagramTokenStatusPanel() {
  const [status, setStatus] = useState<TokenStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/personal-brand/automations/token-status')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load Instagram token status')
      setStatus(data.status)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Instagram token status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/admin/personal-brand/automations/token-status', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to refresh Instagram token')
      setStatus(data.token_status)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh Instagram token')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      const response = await fetch('/api/admin/personal-brand/automations/token-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconnect: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to reconnect Instagram')
      setStatus(data.token_status)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect Instagram')
    } finally {
      setIsReconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mb-8 rounded-lg border border-admin-border bg-admin-surface p-5 text-sm text-admin-muted">
        Loading Instagram messaging status…
      </div>
    )
  }

  if (!status || !status.configured) {
    return (
      <div className="mb-8 rounded-lg border border-admin-border bg-admin-surface p-5 text-sm text-admin-muted">
        Instagram Messaging: not configured — set INSTAGRAM_MESSAGING_ACCESS_TOKEN to connect.
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-lg border border-admin-border bg-admin-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-admin-muted">Instagram Messaging</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              status.needs_reconnect ? 'bg-red-950/40 text-red-400' : 'bg-green-950/40 text-green-400'
            }`}
          >
            {status.needs_reconnect ? 'Needs attention' : 'Connected'}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing…' : 'Refresh token'}
        </Button>
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-admin-muted">Last refreshed</dt>
          <dd>{formatDate(status.last_refreshed_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-admin-muted">Token expiry</dt>
          <dd>
            {status.expires_at ? formatDate(status.expires_at) : 'Unknown'}
            {status.days_remaining !== null && (
              <span className="ml-1 text-admin-muted">
                ({status.days_remaining > 0 ? `~${status.days_remaining}d remaining` : 'expired'})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-admin-muted">Last refresh status</dt>
          <dd className={status.refresh_status === 'failed' ? 'text-red-400' : ''} title={status.last_refresh_error || undefined}>
            {status.refresh_status === 'ok' ? 'Successful' : status.refresh_status === 'failed' ? 'Failed' : 'Not yet run'}
          </dd>
        </div>
      </dl>

      {status.needs_reconnect && (
        <div className="mt-3 rounded border border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
          <p className="mb-2">
            The stored token can no longer be refreshed automatically. Generate a new one (Meta App Dashboard →
            Instagram product → API setup with Instagram login), paste it into INSTAGRAM_MESSAGING_ACCESS_TOKEN in
            Vercel, redeploy, then reconnect below.
          </p>
          <Button size="sm" variant="secondary" onClick={handleReconnect} disabled={isReconnecting}>
            {isReconnecting ? 'Reconnecting…' : 'Reconnect Instagram'}
          </Button>
        </div>
      )}
    </div>
  )
}
