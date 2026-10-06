'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/src/components/admin/AdminButton'

interface ConnectionStatus {
  connected: boolean
  username: string | null
  displayName: string | null
  connectedAt: string | null
}

const SUCCESS_MESSAGES: Record<string, string> = {
  connected: 'Instagram account connected.',
  reconnected: 'Permissions refreshed.',
  replaced: 'Instagram account replaced.',
}

/**
 * Content/insights connection state for the CURRENT workspace — distinct
 * from InstagramTokenStatusPanel, which shows the separate messaging
 * token on the Automations page. "Connect"/"Reconnect" are full browser
 * navigations (not fetch calls) to
 * /api/admin/social/instagram/connect/start, since that route responds
 * with a redirect to Meta's own consent screen — Meta then redirects
 * back to this same page with an `instagram`/`instagram_error` query
 * param, read below and then stripped from the URL so a refresh doesn't
 * re-show a stale banner.
 */
export default function InstagramConnectionPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/social/instagram/status')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load Instagram connection status')
      setStatus(data.status)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Instagram connection status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()

    const outcome = searchParams.get('instagram')
    const oauthError = searchParams.get('instagram_error')
    const previousUsername = searchParams.get('instagram_previous_username')
    const newUsername = searchParams.get('instagram_new_username')

    if (outcome === 'replaced' && (previousUsername || newUsername)) {
      setBanner(`Replaced ${previousUsername ? `@${previousUsername}` : 'the previous account'} with ${newUsername ? `@${newUsername}` : 'the new account'}.`)
    } else if (outcome) {
      setBanner(SUCCESS_MESSAGES[outcome] || 'Instagram connection updated.')
    }
    if (oauthError) setError(oauthError)

    if (outcome || oauthError) {
      const url = new URL(window.location.href)
      url.searchParams.delete('instagram')
      url.searchParams.delete('instagram_error')
      url.searchParams.delete('instagram_previous_username')
      url.searchParams.delete('instagram_new_username')
      router.replace(`${url.pathname}${url.search}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/social/instagram/connect/start'
  }

  // Re-runs the exact same Meta authorization flow as Connect — Meta's
  // own consent screen re-asks for permissions (auth_type=rerequest,
  // always on, see facebookOAuth.ts) and re-confirms the SAME account.
  // No confirmation needed: authorizing the same account again only
  // ever refreshes its token/permissions in place
  // (upsertConnectedInstagramAccount's reauthorize path) — it cannot by
  // itself replace anything.
  const handleRefreshPermissions = () => {
    window.location.href = '/api/admin/social/instagram/connect/start'
  }

  // Also the same flow, but framed for "I want to connect a different
  // account" — confirmed up front since authorizing a different account
  // this time replaces the current one (the exact account being
  // replaced is confirmed again, by name, in the success banner once
  // Meta reports back which account was actually chosen).
  const handleReconnect = () => {
    if (
      window.confirm(
        'Reconnecting will replace this workspace’s Instagram connection if you authorize a different account. Continue?'
      )
    ) {
      window.location.href = '/api/admin/social/instagram/connect/start'
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Instagram from this workspace? Historical content and metrics are kept.')) return
    setIsDisconnecting(true)
    setError('')
    setBanner('')
    try {
      const response = await fetch('/api/admin/social/instagram/disconnect', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to disconnect Instagram')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Instagram')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mb-8 rounded-lg border border-admin-border bg-admin-surface p-5 text-sm text-admin-muted">
        Loading Instagram connection…
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-lg border border-admin-border bg-admin-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-admin-muted">Instagram</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              status?.connected ? 'bg-green-950/40 text-green-400' : 'bg-admin-surface2 text-admin-muted'
            }`}
          >
            {status?.connected ? 'Connected' : 'Not connected'}
          </span>
          {status?.connected && status.username && <span className="text-sm text-admin-text">@{status.username}</span>}
        </div>

        <div className="flex gap-2">
          {status?.connected ? (
            <>
              <Button size="sm" variant="secondary" onClick={handleRefreshPermissions}>
                Refresh permissions
              </Button>
              <Button size="sm" variant="secondary" onClick={handleReconnect}>
                Reconnect
              </Button>
              <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect}>
              Connect Instagram
            </Button>
          )}
        </div>
      </div>

      {banner && <p className="text-xs text-green-400">{banner}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
