-- Request Access — Phase F of the Social Media Multi-Workspace Audit.
-- When an admin tries to connect an Instagram account that already
-- belongs to a DIFFERENT workspace (upsertConnectedInstagramAccount's
-- existing `already_connected_elsewhere` guard, preserved unchanged —
-- see 0025_social_workspaces_foundation.sql's
-- social_connected_accounts_external_id_unique), this table lets them
-- ask that workspace's owner for membership instead of hitting a dead
-- end. Approval only ever inserts a normal social_workspace_members row
-- (see src/app/api/admin/social/workspaces/[id]/access-requests/[requestId]/route.ts)
-- — this table itself never grants access to anything by existing.
--
-- Keyed on (workspace_id, connected_account_id) rather than just
-- workspace_id: a workspace can only ever have one ACTIVE connected
-- account per platform today (social_connected_accounts_one_active_per_platform_idx),
-- but recording which specific connected_account_id the request was
-- about keeps the row meaningful even if that accounts's status
-- changes later (disconnected, replaced) — see the request-access route
-- for how a stale connected_account_id is handled at approval time.
--
-- Same pattern as every other table in this project: RLS enabled, no
-- anon/authenticated policies, all access via service-role server code
-- gated by canManageWorkspaceMembers()/scope.adminUserId.

create table if not exists public.social_workspace_access_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  connected_account_id uuid not null references public.social_connected_accounts(id) on delete cascade,
  requesting_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  status text not null default 'pending',
  -- Set only on approval — the role the OWNER chose for this requester,
  -- never requester-chosen and never 'owner' (see the role check below
  -- and the route's own validation, which is the actual enforcement
  -- point; this constraint is the floor under it).
  resolved_role text null,
  resolved_at timestamptz null,
  resolved_by uuid null references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint social_workspace_access_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint social_workspace_access_requests_resolved_role_check check (resolved_role in ('manager', 'analyst'))
);

-- Prevents CASE 2/3 duplicate pending requests from the same admin to
-- the same workspace — a second attempt finds this row and returns
-- "already pending" instead of inserting a second one. Scoped to the
-- workspace (not also connected_account_id) since a workspace has at
-- most one thing to request access to at a time in practice, and "I
-- already asked this workspace" is the right granularity for the
-- requester-facing dedupe, not "I already asked about this exact
-- connected_account_id" (which would let a disconnect+reconnect cycle
-- silently create a second pending row for the same real request).
create unique index if not exists social_workspace_access_requests_pending_idx
  on public.social_workspace_access_requests (workspace_id, requesting_admin_user_id)
  where status = 'pending';

-- The owner's "Access Requests" list on Workspace Settings — every
-- pending request for a given workspace, newest first.
create index if not exists social_workspace_access_requests_workspace_idx
  on public.social_workspace_access_requests (workspace_id, created_at desc);

-- "Do I already have a pending/past request anywhere" — used by the
-- requester-side UI to avoid re-offering Request Access after a
-- rejection in the same session, and by the dedupe check itself.
create index if not exists social_workspace_access_requests_requester_idx
  on public.social_workspace_access_requests (requesting_admin_user_id);

alter table public.social_workspace_access_requests enable row level security;
