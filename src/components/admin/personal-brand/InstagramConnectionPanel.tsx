'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/src/components/admin/AdminButton'

interface ConnectionStatus {
  connected: boolean
  username: string | null
  displayName: string | null
  connectedAt: string | null
  connectionMethod: 'instagram_login' | 'facebook_login' | null
}

const DIRECT_CONNECT_PATH = '/api/admin/social/instagram/connect-direct/start'
const FACEBOOK_CONNECT_PATH = '/api/admin/social/instagram/connect/start'

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
interface AccessRequestState {
  accountId: string
  username: string | null
  status: 'offered' | 'pending' | 'already_pending' | 'already_member'
  requestId: string | null
}

export default function InstagramConnectionPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')
  const [accessRequest, setAccessRequest] = useState<AccessRequestState | null>(null)
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)

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
    const oauthErrorCode = searchParams.get('instagram_connect_error')
    const previousUsername = searchParams.get('instagram_previous_username')
    const newUsername = searchParams.get('instagram_new_username')
    const attemptedAccountId = searchParams.get('instagram_attempted_account_id')
    const attemptedUsername = searchParams.get('instagram_attempted_username')

    if (outcome === 'replaced' && (previousUsername || newUsername)) {
      setBanner(`Replaced ${previousUsername ? `@${previousUsername}` : 'the previous account'} with ${newUsername ? `@${newUsername}` : 'the new account'}.`)
    } else if (outcome) {
      setBanner(SUCCESS_MESSAGES[outcome] || 'Instagram connection updated.')
    }

    // already_connected_elsewhere gets its own Request Access UI instead
    // of the generic error banner — see the dedicated block below.
    if (oauthErrorCode === 'already_connected_elsewhere' && attemptedAccountId) {
      setAccessRequest({ accountId: attemptedAccountId, username: attemptedUsername, status: 'offered', requestId: null })
    } else if (oauthError) {
      setError(oauthError)
    }

    if (outcome || oauthError) {
      const url = new URL(window.location.href)
      url.searchParams.delete('instagram')
      url.searchParams.delete('instagram_error')
      url.searchParams.delete('instagram_connect_error')
      url.searchParams.delete('instagram_previous_username')
      url.searchParams.delete('instagram_new_username')
      url.searchParams.delete('instagram_attempted_account_id')
      url.searchParams.delete('instagram_attempted_username')
      router.replace(`${url.pathname}${url.search}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRequestAccess() {
    if (!accessRequest) return
    setIsRequestingAccess(true)
    setError('')
    try {
      const response = await fetch('/api/admin/social/instagram/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accessRequest.accountId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to request access')
      setAccessRequest({ ...accessRequest, status: data.status, requestId: data.requestId || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request access')
    } finally {
      setIsRequestingAccess(false)
    }
  }

  async function handleCancelAccessRequest() {
    if (!accessRequest?.requestId) return
    setIsRequestingAccess(true)
    setError('')
    try {
      const response = await fetch('/api/admin/social/instagram/request-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: accessRequest.requestId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to cancel request')
      setAccessRequest(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request')
    } finally {
      setIsRequestingAccess(false)
    }
  }

  // Not yet connected — default to direct Instagram Login (Phase G):
  // the user authorizes with their own Instagram credentials, no
  // Facebook Page involved. See DIRECT_CONNECT_PATH's route for the full
  // flow; the Facebook-based flow (FACEBOOK_CONNECT_PATH) still exists
  // unchanged underneath, just no longer the default for a fresh
  // connection.
  const handleConnect = () => {
    window.location.href = DIRECT_CONNECT_PATH
  }

  // Re-runs the SAME flow this connection originally used — re-running
  // an already-facebook_login-connected account through Instagram Login
  // instead (or vice versa) risks Meta resolving a different account id
  // for what is actually the same Instagram account (see
  // instagramConnectAccount.ts's own doc comment on this), which could
  // create a confusing extra connection instead of a clean refresh.
  // Meta's own consent screen re-asks for permissions (auth_type=
  // rerequest on the Facebook flow) and re-confirms the SAME account —
  // no confirmation needed, since re-authorizing the same account only
  // ever refreshes its token/permissions in place
  // (upsertConnectedInstagramAccount's reauthorize path), never replaces
  // anything.
  const handleRefreshPermissions = () => {
    window.location.href = status?.connectionMethod === 'facebook_login' ? FACEBOOK_CONNECT_PATH : DIRECT_CONNECT_PATH
  }

  // Also the same flow as Refresh, but framed for "I want to connect a
  // different account" — confirmed up front since authorizing a
  // different account this time replaces the current one (the exact
  // account being replaced is confirmed again, by name, in the success
  // banner once Meta reports back which account was actually chosen).
  const handleReconnect = () => {
    if (
      window.confirm(
        'Reconnecting will replace this workspace’s Instagram connection if you authorize a different account. Continue?'
      )
    ) {
      window.location.href = status?.connectionMethod === 'facebook_login' ? FACEBOOK_CONNECT_PATH : DIRECT_CONNECT_PATH
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

      {accessRequest && (
        <div className="mt-3 rounded-lg border border-admin-border bg-admin-surface2 p-4">
          {accessRequest.status === 'offered' && (
            <>
              <p className="mb-2 text-sm">
                {accessRequest.username ? `@${accessRequest.username}` : 'This Instagram account'} is already connected to another workspace. If
                you work on this account, request access instead of connecting it again.
              </p>
              <Button size="sm" variant="secondary" onClick={handleRequestAccess} disabled={isRequestingAccess}>
                {isRequestingAccess ? 'Requesting…' : 'Request Access'}
              </Button>
            </>
          )}

          {(accessRequest.status === 'pending' || accessRequest.status === 'already_pending') && (
            <>
              <p className="mb-2 text-sm">Request pending — you&apos;ll get access after a workspace owner approves it.</p>
              {accessRequest.requestId && (
                <Button size="sm" variant="outline" onClick={handleCancelAccessRequest} disabled={isRequestingAccess}>
                  {isRequestingAccess ? 'Cancelling…' : 'Cancel Request'}
                </Button>
              )}
            </>
          )}

          {accessRequest.status === 'already_member' && (
            <p className="text-sm">You&apos;re already a member of that workspace — switch to it from the workspace switcher above.</p>
          )}
        </div>
      )}
    </div>
  )
}
