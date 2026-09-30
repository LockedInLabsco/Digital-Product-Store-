-- Server-side lifecycle storage for the Instagram Login messaging token
-- (graph.instagram.com, INSTAGRAM_MESSAGING_ACCESS_TOKEN today) so
-- outbound Auto-DM sends stop depending on a manually-pasted Vercel env
-- var that silently goes stale every ~60 days. See
-- src/lib/instagram/tokenStore.ts for the bootstrap/refresh logic and
-- docs/INSTAGRAM_AUTOMATIONS_SETUP.md for the background.
--
-- Deliberately keyed by (provider, account_id) rather than a single
-- singleton row: this project only has one Instagram account today, but
-- nothing here assumes that — a second account/provider is just another
-- row, no redesign needed.
--
-- Same security pattern as every other table in this project (see
-- 0017_instagram_automations.sql): RLS enabled, zero anon/authenticated
-- policies. Every reader/writer is server-only code using the service
-- role (src/lib/instagram/tokenStore.ts, the admin token-status API
-- route, and the refresh cron) — never a browser client.
--
-- access_token is stored encrypted (AES-256-GCM, see
-- src/lib/instagram/tokenCrypto.ts) rather than plaintext, as a
-- defense-in-depth layer on top of RLS — a leaked service-role key or a
-- misconfigured policy still wouldn't hand over a usable token.

create table if not exists public.instagram_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  -- 'instagram_login' today (the graph.instagram.com messaging product).
  -- Deliberately NOT used for INSTAGRAM_ACCESS_TOKEN (the separate
  -- Facebook Graph API insights/content-sync token) — that token stays
  -- on its existing env-var-only path untouched.
  provider text not null,
  -- Lets multiple Instagram accounts share this table later without a
  -- redesign. 'default' for the one account this project manages today.
  account_id text not null default 'default',
  encrypted_access_token text not null,
  token_type text not null default 'unknown',
  expires_at timestamptz null,
  last_refreshed_at timestamptz null,
  refresh_status text not null default 'unknown',
  last_refresh_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_integration_credentials_provider_check
    check (provider in ('instagram_login')),
  constraint instagram_integration_credentials_token_type_check
    check (token_type in ('short_lived', 'long_lived', 'unknown')),
  constraint instagram_integration_credentials_refresh_status_check
    check (refresh_status in ('unknown', 'ok', 'failed')),
  unique (provider, account_id)
);

alter table public.instagram_integration_credentials enable row level security;
