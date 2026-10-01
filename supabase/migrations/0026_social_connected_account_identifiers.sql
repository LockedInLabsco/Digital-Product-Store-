-- Resolves the identifier-ambiguity flagged in the Social Workspace
-- Foundation implementation report (§5): INSTAGRAM_BUSINESS_ACCOUNT_ID
-- (Facebook Login for Business, used for content/insights sync) is NOT
-- guaranteed to equal the Instagram-scoped account id Meta sends as
-- `entry.id` on a webhook delivered through the Instagram API with
-- Instagram Login product (the one this app's Auto DM actually
-- subscribes through) — see src/lib/instagram/client.ts's own file-level
-- comment, which already documents this exact distinction.
--
-- Rather than guessing which one `social_connected_accounts.external_account_id`
-- should hold, or forcing two unrelated ids into one column, each
-- connected account can carry one identifier row PER (provider,
-- identifier_type) it actually has a confirmed value for. A connected
-- account with only a Facebook-Login-side id (today's state, until the
-- Instagram Login side is captured — see the Phase 2 report) simply has
-- one row here; nothing about webhook routing (Phase 2 Step 2, NOT
-- implemented yet — see the report) can be safely built until a real
-- `webhook_entry_id` row exists for the migrated account.
--
-- Purely additive: no existing table, column, or behavior changes.

create table if not exists public.social_connected_account_identifiers (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references public.social_connected_accounts(id) on delete cascade,
  -- Which Meta product this identifier is scoped to — mirrors
  -- social_account_tokens.provider exactly, since each identifier is
  -- meaningful only within the product that issued it.
  provider text not null,
  -- 'webhook_entry_id' — the value Meta actually sends as payload.entry[].id
  -- on a webhook delivery; this is what webhook routing (Phase 2 Step 2)
  -- will look up by. 'graph_business_account_id' — the Facebook Graph API
  -- Instagram Business Account id (today's INSTAGRAM_BUSINESS_ACCOUNT_ID),
  -- used for content/insights sync, not webhook routing.
  identifier_type text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  constraint social_connected_account_identifiers_provider_check
    check (provider in ('instagram_login', 'facebook_login')),
  constraint social_connected_account_identifiers_type_check
    check (identifier_type in ('webhook_entry_id', 'graph_business_account_id')),
  -- The same raw external id can never be claimed by two different
  -- connected accounts under the same provider/type — this is the
  -- uniqueness guarantee webhook routing depends on to resolve
  -- unambiguously.
  constraint social_connected_account_identifiers_unique
    unique (provider, identifier_type, external_id)
);

create index if not exists social_connected_account_identifiers_account_idx
  on public.social_connected_account_identifiers (connected_account_id);

-- The exact lookup shape webhook routing will perform: "given this raw
-- id Meta just sent, which connected account is it."
create index if not exists social_connected_account_identifiers_lookup_idx
  on public.social_connected_account_identifiers (identifier_type, external_id);

alter table public.social_connected_account_identifiers enable row level security;
