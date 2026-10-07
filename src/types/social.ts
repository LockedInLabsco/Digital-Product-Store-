/**
 * Core types for the Social Workspace foundation — isolates the
 * Personal Brand Content OS and Instagram automation data (previously
 * GLOBAL — see the Social Media Multi-Workspace Audit) into per-user
 * workspaces. See supabase/migrations/0025_social_workspaces_foundation.sql
 * for the schema these mirror, and
 * src/lib/admin/socialWorkspaceScope.ts for how authorization over them
 * is resolved.
 */

export type SocialWorkspaceRole = 'owner' | 'manager' | 'analyst'

export type SocialPlatform = 'instagram'

export type SocialConnectedAccountStatus = 'active' | 'disconnected'

export type SocialAccountTokenProvider = 'instagram_login' | 'facebook_login'

export interface SocialWorkspace {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SocialWorkspaceMember {
  id: string
  workspace_id: string
  admin_user_id: string
  workspace_role: SocialWorkspaceRole
  created_at: string
}

export interface SocialConnectedAccount {
  id: string
  workspace_id: string
  platform: SocialPlatform
  external_account_id: string
  username: string | null
  display_name: string | null
  status: SocialConnectedAccountStatus
  connected_by: string | null
  connected_at: string | null
  created_at: string
  updated_at: string
}

export type SocialConnectedAccountIdentifierType = 'webhook_entry_id' | 'graph_business_account_id'

/** See supabase/migrations/0026_social_connected_account_identifiers.sql
 * — resolves the Facebook-Login-vs-Instagram-Login identifier ambiguity
 * flagged in the Phase 2 report rather than assuming the two are equal. */
export interface SocialConnectedAccountIdentifier {
  id: string
  connected_account_id: string
  provider: SocialAccountTokenProvider
  identifier_type: SocialConnectedAccountIdentifierType
  external_id: string
  created_at: string
}

/** A pending invite into one workspace's membership — see
 * supabase/migrations/0028_social_workspace_invites.sql. */
export interface SocialWorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  workspace_role: SocialWorkspaceRole
  status: 'pending' | 'accepted' | 'revoked'
  invited_by: string | null
  created_at: string
  expires_at: string
}

export type SocialWorkspaceAccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** A request to join a workspace that owns an Instagram account the
 * requester tried (and failed) to connect elsewhere — see
 * supabase/migrations/0029_social_workspace_access_requests.sql. */
export interface SocialWorkspaceAccessRequest {
  id: string
  workspace_id: string
  connected_account_id: string
  requesting_admin_user_id: string
  status: SocialWorkspaceAccessRequestStatus
  resolved_role: 'manager' | 'analyst' | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

/** Safe fields only — never the encrypted token itself. Mirrors
 * MessagingTokenStatus in src/lib/instagram/tokenStore.ts. */
export interface SocialAccountTokenStatus {
  provider: SocialAccountTokenProvider
  configured: boolean
  token_type: 'short_lived' | 'long_lived' | 'unknown' | null
  expires_at: string | null
  last_refreshed_at: string | null
  refresh_status: 'unknown' | 'ok' | 'failed' | null
  last_refresh_error: string | null
}
