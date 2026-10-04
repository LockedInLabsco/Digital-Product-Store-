-- Short-lived, single-use OAuth CSRF state for the real user-facing
-- "Connect Instagram" flow (Facebook Login for Business — content/
-- insights only, NOT the Instagram Login messaging product). See
-- src/lib/social/instagramOAuthState.ts for how rows here are created
-- and consumed, and src/app/api/admin/social/instagram/connect/*/route.ts
-- for the two routes that use it.
--
-- Why a table instead of a signed cookie/JWT: the state value must
-- securely bind the Meta callback back to (a) the specific admin who
-- started the flow and (b) the specific workspace they resolved at that
-- time, and must be usable exactly once. A server-side row lets the
-- callback do a single atomic "pop" (DELETE ... RETURNING, see
-- consumeOAuthState) that both reads and invalidates it in one
-- statement — a replayed or guessed state value can never be consumed
-- twice, and an expired one is rejected by comparing expires_at rather
-- than trusting anything client-supplied. admin_user_id/workspace_id are
-- resolved server-side at connect-start time (never from the browser)
-- and re-validated again at callback time before anything is written.
--
-- Same security pattern as every other table in this project: RLS
-- enabled, zero anon/authenticated policies. Only ever read/written by
-- server-only code using the service-role key.

create table if not exists public.social_oauth_states (
  -- The state value itself (a random, URL-safe nonce) — looked up
  -- directly by id, never guessed (see instagramOAuthState.ts for the
  -- generation source).
  id text primary key,
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  workspace_id uuid not null references public.social_workspaces(id) on delete cascade,
  -- Fixed to one value today ('instagram_connect') so this table can be
  -- reused for a future OAuth flow (e.g. the Instagram Login messaging
  -- product) without a redesign — just another allowed value here.
  flow text not null default 'instagram_connect',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint social_oauth_states_flow_check check (flow in ('instagram_connect')),
  constraint social_oauth_states_id_not_blank_check check (length(id) >= 16)
);

-- Rows are popped (deleted) on use; this index only matters for the
-- occasional cleanup of abandoned (never-completed) flows.
create index if not exists social_oauth_states_expires_at_idx on public.social_oauth_states (expires_at);

alter table public.social_oauth_states enable row level security;
