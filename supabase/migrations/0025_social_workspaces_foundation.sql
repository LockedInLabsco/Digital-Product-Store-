-- Social Workspace foundation: isolates the currently-GLOBAL Personal
-- Brand / Instagram automation system into per-workspace data, so a
-- second social-media user can eventually be invited without seeing
-- someone else's content, analytics, DM rules, or connected account.
-- See the Social Media Multi-Workspace Audit for the full reasoning.
--
-- This migration is PURELY ADDITIVE: four new tables, plus nullable
-- ownership columns on the existing pb_*/ig_* tables. Nothing here
-- changes existing behavior — every current query still returns exactly
-- what it did before, since nothing reads these new columns yet (see
-- the Phase E route changes for when reads actually start filtering).
--
-- Same security pattern as every other table in this project (see
-- 0015_personal_brand_content_os.sql, 0017_instagram_automations.sql,
-- 0024_work_foundation.sql): RLS enabled, no anon/authenticated
-- policies. All access goes through service-role server code, gated by
-- requirePermission()/getSocialWorkspaceScope() — never direct
-- client-side CRUD.

-- ---------------------------------------------------------------------
-- social_workspaces — one social-media identity/brand ("Darshana
-- Personal Brand"). Deliberately minimal: no status/archiving column
-- yet, matching the audit's "do not over-design" guidance.
-- ---------------------------------------------------------------------

create table if not exists public.social_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  created_by uuid null references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_workspaces_name_not_blank_check check (length(trim(name)) > 0)
);

create unique index if not exists social_workspaces_name_idx on public.social_workspaces (lower(name));

-- ---------------------------------------------------------------------
-- social_workspace_members — THE primary workspace authorization
-- boundary (see src/lib/admin/socialWorkspaceScope.ts). Deliberately
-- NOT derived from any global AdminRole: a Founder/Owner has no implied
-- row here — see the audit's explicit "no invisible Owner bypass"
-- requirement, enforced here structurally (membership is the only way
-- in, and it's just a normal, visible, queryable row).
-- ---------------------------------------------------------------------

create table if not exists public.social_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  workspace_role text not null default 'analyst',
  created_at timestamptz not null default now(),
  constraint social_workspace_members_role_check check (workspace_role in ('owner', 'manager', 'analyst')),
  constraint social_workspace_members_unique unique (workspace_id, admin_user_id)
);

create index if not exists social_workspace_members_workspace_id_idx on public.social_workspace_members (workspace_id);
create index if not exists social_workspace_members_admin_user_id_idx on public.social_workspace_members (admin_user_id);
-- Narrow index for "which workspaces does X own" — membership
-- management checks (canManageWorkspaceMembers) run this on every
-- request that touches workspace membership.
create index if not exists social_workspace_members_owners_idx on public.social_workspace_members (admin_user_id) where workspace_role = 'owner';

-- ---------------------------------------------------------------------
-- social_connected_accounts — the real external social account(s)
-- belonging to a workspace. Replaces the env-var-only
-- INSTAGRAM_BUSINESS_ACCOUNT_ID/INSTAGRAM_ACCESS_TOKEN singleton model.
-- `platform` is a checked enum with exactly one allowed value today
-- ('instagram') specifically so adding 'facebook'/'tiktok'/'youtube'
-- later is a one-line constraint change, never a redesign.
--
-- Two uniqueness rules, both deliberate:
-- 1. (platform, external_account_id) globally unique — the same real
--    Instagram account can never be connected to two different
--    workspaces at once (accidentally or otherwise).
-- 2. (workspace_id, platform) unique WHERE status = 'active' — at most
--    one ACTIVE account per platform per workspace for V1. This is the
--    one constraint that will need loosening (or scoping differently)
--    when multi-account-per-workspace is actually built later — every
--    other part of this schema already supports it today (nothing here
--    assumes a workspace has exactly one row).
-- ---------------------------------------------------------------------

create table if not exists public.social_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  platform text not null,
  -- The real Meta-side account id (e.g. the Instagram Business Account
  -- id). See the implementation report for why this is sourced from the
  -- Facebook Login side today, and the known limitation that Meta's
  -- Instagram Login product isn't guaranteed to expose the same id.
  external_account_id text not null,
  username text null,
  display_name text null,
  status text not null default 'active',
  connected_by uuid null references public.admin_users(id) on delete set null,
  connected_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connected_accounts_platform_check check (platform in ('instagram')),
  constraint social_connected_accounts_status_check check (status in ('active', 'disconnected')),
  constraint social_connected_accounts_external_id_unique unique (platform, external_account_id)
);

create index if not exists social_connected_accounts_workspace_id_idx on public.social_connected_accounts (workspace_id);
create unique index if not exists social_connected_accounts_one_active_per_platform_idx
  on public.social_connected_accounts (workspace_id, platform)
  where status = 'active';

-- ---------------------------------------------------------------------
-- social_account_tokens — evolves instagram_integration_credentials
-- (0023_instagram_token_store.sql): same fields, same AES-256-GCM
-- encryption-at-rest approach (src/lib/instagram/tokenCrypto.ts), just
-- re-keyed from a hardcoded account_id='default' literal to a real FK.
-- `provider` gains 'facebook_login' as a second allowed value — today
-- that token (INSTAGRAM_ACCESS_TOKEN) has NO database row at all, only
-- an env var; this is where it will live once migrated.
--
-- instagram_integration_credentials is NOT dropped or written to by
-- this migration — see the implementation report for the token
-- migration mechanism (an idempotent server-side route, not raw SQL,
-- since the account identifier needed here only exists in application
-- runtime env vars, never in the database).
-- ---------------------------------------------------------------------

create table if not exists public.social_account_tokens (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references public.social_connected_accounts(id) on delete cascade,
  provider text not null,
  encrypted_access_token text not null,
  token_type text not null default 'unknown',
  expires_at timestamptz null,
  last_refreshed_at timestamptz null,
  refresh_status text not null default 'unknown',
  last_refresh_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_account_tokens_provider_check check (provider in ('instagram_login', 'facebook_login')),
  constraint social_account_tokens_token_type_check check (token_type in ('short_lived', 'long_lived', 'unknown')),
  constraint social_account_tokens_refresh_status_check check (refresh_status in ('unknown', 'ok', 'failed')),
  constraint social_account_tokens_unique unique (connected_account_id, provider)
);

create index if not exists social_account_tokens_connected_account_id_idx on public.social_account_tokens (connected_account_id);

-- ---------------------------------------------------------------------
-- Ownership columns on existing Personal Brand Content OS tables —
-- nullable for now (deliberately, per the rollout plan: additive →
-- backfill → switch reads → verify, never NOT NULL until every read
-- path is confirmed working against it). pb_content_metrics and
-- pb_experiment_content are NOT touched here — they inherit ownership
-- through their existing content_id/experiment_id FKs, which is
-- sufficient; adding a redundant column to a 1:many snapshot/join table
-- would just be another place for ownership to silently drift out of
-- sync with its parent.
-- ---------------------------------------------------------------------

alter table public.pb_formats add column if not exists workspace_id uuid null references public.social_workspaces(id) on delete set null;
alter table public.pb_content_items add column if not exists workspace_id uuid null references public.social_workspaces(id) on delete set null;
alter table public.pb_ideas add column if not exists workspace_id uuid null references public.social_workspaces(id) on delete set null;
alter table public.pb_experiments add column if not exists workspace_id uuid null references public.social_workspaces(id) on delete set null;

create index if not exists pb_formats_workspace_id_idx on public.pb_formats (workspace_id);
create index if not exists pb_content_items_workspace_id_idx on public.pb_content_items (workspace_id);
create index if not exists pb_ideas_workspace_id_idx on public.pb_ideas (workspace_id);
create index if not exists pb_experiments_workspace_id_idx on public.pb_experiments (workspace_id);

-- ---------------------------------------------------------------------
-- Ownership columns on the Instagram automation tables. connected_account_id,
-- not workspace_id — a rule/run is inherently tied to one external
-- account's webhook stream (see the audit's §12 reasoning), not the
-- workspace in the abstract. ig_automation_followups is NOT touched —
-- it inherits via its existing rule_id FK.
-- ---------------------------------------------------------------------

alter table public.ig_automation_rules add column if not exists connected_account_id uuid null references public.social_connected_accounts(id) on delete set null;
alter table public.ig_automation_runs add column if not exists connected_account_id uuid null references public.social_connected_accounts(id) on delete set null;

create index if not exists ig_automation_rules_connected_account_id_idx on public.ig_automation_rules (connected_account_id);
create index if not exists ig_automation_runs_connected_account_id_idx on public.ig_automation_runs (connected_account_id);

-- ---------------------------------------------------------------------
-- Row Level Security — enabled on every new table, no anon/authenticated
-- policies. All access is via the service-role key from server-only
-- code, gated by requirePermission()/getSocialWorkspaceScope().
-- ---------------------------------------------------------------------

alter table public.social_workspaces enable row level security;
alter table public.social_workspace_members enable row level security;
alter table public.social_connected_accounts enable row level security;
alter table public.social_account_tokens enable row level security;
