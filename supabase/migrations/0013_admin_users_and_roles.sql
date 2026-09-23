-- Admin team/role system, replacing the single shared ADMIN_PASSWORD
-- with real Supabase Auth accounts + per-user roles. See
-- src/lib/admin/permissions.ts for the role -> permission mapping this
-- schema backs, and src/lib/admin/auth.ts for how a request's admin
-- identity is resolved from these tables.
--
-- Email is intentionally denormalized onto admin_users (not looked up
-- from auth.users at read time) so the Team page and every admin check
-- can list/identify admins with a single anon/service-role query against
-- a public table, without needing the privileged auth.admin API just to
-- render a list of names.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null default 'active',
  invited_by uuid null references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('owner', 'developer', 'social_media', 'analyst')),
  constraint admin_users_status_check check (status in ('active', 'disabled'))
);

create index if not exists admin_users_user_id_idx on public.admin_users (user_id);
create index if not exists admin_users_status_idx on public.admin_users (status);

-- Pending invitations. Accepting an invite (see getCurrentAdmin — the
-- first time an invited email successfully authenticates, it's promoted
-- into admin_users and this row is marked 'accepted') is handled in the
-- app layer, not a database trigger, so the logic stays in one place and
-- is easy to reason about/debug.
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  status text not null default 'pending',
  invited_by uuid null references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  constraint admin_invites_role_check check (role in ('owner', 'developer', 'social_media', 'analyst')),
  constraint admin_invites_status_check check (status in ('pending', 'accepted', 'revoked'))
);

-- One live (pending) invite per email at a time — re-inviting the same
-- address after it was accepted/revoked is fine, re-inviting while a
-- pending invite already exists is not.
create unique index if not exists admin_invites_pending_email_idx
  on public.admin_invites (lower(email))
  where status = 'pending';

create index if not exists admin_invites_email_idx on public.admin_invites (lower(email));

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- All real reads/writes (the getCurrentAdmin lookup, team management,
-- invite creation/acceptance) go through server routes using the
-- service-role key, which bypasses RLS entirely — same pattern as
-- orders/free_downloads/waitlist_entries. The policies below are the
-- floor of what's safe if the anon/authenticated key is ever used
-- directly: a signed-in user may read their OWN admin_users row (so a
-- client component could show "your role" without a round trip through
-- an API route), and nothing else. No insert/update/delete policy exists
-- for anon or authenticated on either table — every write requires the
-- service-role key, which is exactly what makes it impossible for an
-- authenticated non-owner to grant themselves a role or reactivate
-- themselves after being disabled.

alter table public.admin_users enable row level security;
alter table public.admin_invites enable row level security;

drop policy if exists "Admins can read their own membership row" on public.admin_users;
create policy "Admins can read their own membership row"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- No policies at all on admin_invites for anon/authenticated — invites
-- are only ever read/written server-side with the service-role key.
