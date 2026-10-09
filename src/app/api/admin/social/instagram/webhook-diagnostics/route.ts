import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse } from '@/src/lib/admin/activeSocialWorkspace'
import { getMessagingTokenForAccount } from '@/src/lib/instagram/tokenStore'
import { getInstagramAccountWebhookSubscriptions, INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS } from '@/src/lib/instagram/client'

// GET — read-only production diagnostic for "is this account's webhook
// subscription actually live on Meta's side". Answers from Meta's own
// current state (GET /me/subscribed_apps with the account's own stored
// token), never from a log line or an assumption that a past 200
// response stuck. Returns ONLY safe metadata — app id, subscribed field
// names, booleans — the access token itself never leaves tokenStore.ts.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }

    const { data: account, error } = await supabaseServer
      .from('social_connected_accounts')
      .select('id, username, display_name, status, external_account_id')
      .eq('workspace_id', active.context.workspaceId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('[Instagram Webhook Diagnostics] Failed to look up connected account', error.message)
      return NextResponse.json({ error: 'Failed to look up the connected Instagram account' }, { status: 500 })
    }

    if (!account) {
      return NextResponse.json({ connected: false, error: 'No active Instagram account connected to this workspace' }, { status: 200 })
    }

    const { data: identifierRow } = await supabaseServer
      .from('social_connected_account_identifiers')
      .select('identifier_type, external_id, provider')
      .eq('connected_account_id', account.id)
      .eq('provider', 'instagram_login')
      .maybeSingle()

    const { data: tokenRow } = await supabaseServer
      .from('social_account_tokens')
      .select('provider, token_type, expires_at, last_refreshed_at, refresh_status, last_refresh_error')
      .eq('connected_account_id', account.id)
      .eq('provider', 'instagram_login')
      .maybeSingle()

    const base = {
      connected: true,
      connectedAccountId: account.id,
      username: account.username,
      externalAccountId: account.external_account_id,
      webhookEntryIdentifier: identifierRow ?? null,
      instagramLoginToken: tokenRow ?? null,
      expectedSubscribedFields: INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS,
      // Which app(s) this deployment is even configured to verify webhook
      // signatures against / subscribe through — presence only, never the
      // secret/id values themselves.
      appConfig: {
        instagramLoginAppIdConfigured: Boolean(process.env.INSTAGRAM_LOGIN_APP_ID),
        instagramLoginAppSecretConfigured: Boolean(process.env.INSTAGRAM_LOGIN_APP_SECRET),
        legacyFacebookLoginAppSecretConfigured: Boolean(process.env.INSTAGRAM_APP_SECRET),
        webhookVerifyTokenConfigured: Boolean(process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN),
      },
    }

    const current = await getMessagingTokenForAccount(account.id)
    if (!current) {
      return NextResponse.json({
        ...base,
        metaSubscriptionCheck: { ok: false, error: 'No instagram_login messaging token is stored for this connected account — reconnect required.' },
      })
    }

    const subs = await getInstagramAccountWebhookSubscriptions(current.token)
    if (!subs.ok) {
      return NextResponse.json({
        ...base,
        metaSubscriptionCheck: { ok: false, error: subs.error, code: subs.code ?? null },
      })
    }

    const entries = subs.data.data || []
    const subscribedFieldsByApp = entries.map((entry) => ({ appId: entry.id, subscribedFields: entry.subscribed_fields || [] }))
    const allSubscribedFields = new Set(entries.flatMap((entry) => entry.subscribed_fields || []))

    return NextResponse.json({
      ...base,
      metaSubscriptionCheck: {
        ok: true,
        subscribedFieldsByApp,
        messagesSubscribed: allSubscribedFields.has('messages'),
        commentsSubscribed: allSubscribedFields.has('comments'),
      },
    })
  } catch (error) {
    console.error('[Instagram Webhook Diagnostics] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
