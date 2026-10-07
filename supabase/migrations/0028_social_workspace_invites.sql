-- Workspace-scoped team invites — the ManyChat-style "workspace has
-- many members" model from the Social Media Multi-Workspace Audit.
-- Mirrors admin_invites (0013_admin_users_and_roles.sql) deliberately
-- closely — this is NOT a second, unrelated invitation/auth system, just
-- the same pending-invite-by-email pattern scoped to one workspace's
-- membership instead of site-wide admin_users.roles. See
-- src/lib/admin/auth.ts's getCurrentAdmin for where a pending row here
-- is consumed (same moment admin_invites is consumed — the first time
-- the invited email successfully authenticates).
--
-- Inviting an email that is ALREADY an admin_users member never uses
-- this table at all — see src/app/api/admin/social/workspaces/[id]/members/route.ts,
-- which inserts social_workspace_members directly in that case (no
-- re-authentication needed, matching the audit's CASE 2 exactly).

create table if not exists public.social_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  email text not null,
  workspace_role text not null default 'analyst',
  status text not null default 'pending',
  invited_by uuid null references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  constraint social_workspace_invites_role_check check (workspace_role in ('owner', 'manager', 'analyst')),
  constraint social_workspace_invites_status_check check (status in ('pending', 'accepted', 'revoked'))
);

-- One live (pending) invite per (workspace, email) at a time — the same
-- email can still be invited to a DIFFERENT workspace independently.
create unique index if not exists social_workspace_invites_pending_idx
  on public.social_workspace_invites (workspace_id, lower(email))
  where status = 'pending';

-- The exact lookup getCurrentAdmin's invite-acceptance branch performs:
-- "every pending workspace invite for the email that just authenticated."
create index if not exists social_workspace_invites_email_idx on public.social_workspace_invites (lower(email)) where status = 'pending';

alter table public.social_workspace_invites enable row level security;
