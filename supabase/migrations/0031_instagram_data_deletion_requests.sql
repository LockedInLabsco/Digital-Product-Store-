-- Meta's required Data Deletion Request Callback must respond with
-- { url, confirmation_code } so the requester can check status later
-- (see developers.facebook.com/docs/development/create-an-app/
-- app-dashboard/data-deletion-callback — verified current as of this
-- migration). This table is exactly that status record: one row per
-- deletion request we received, looked up by its own confirmation_code
-- from the public status page (src/app/data-deletion/status/page.tsx).
--
-- Deliberately NOT modeling a 'pending' state — this app's actual
-- deletion scope (see src/app/api/admin/social/instagram/data-deletion/route.ts)
-- is small enough to process synchronously inside the callback itself,
-- so a row is only ever created already resolved.
--
-- Same pattern as every other table here: RLS enabled, no anon/
-- authenticated policies — written only by the (deliberately
-- unauthenticated-by-admin-session, authenticated-by-signed_request)
-- data-deletion route using the service-role key, read only by the
-- public status page via a narrow server-side lookup.

create table if not exists public.instagram_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  confirmation_code text not null,
  -- The user_id Meta's signed_request named — logged for support
  -- lookups, never anything more sensitive (see this migration's own
  -- header; this is the same class of Meta-issued identifier already
  -- stored throughout social_connected_account_identifiers).
  meta_user_id text not null,
  connected_account_id uuid null references public.social_connected_accounts(id) on delete set null,
  status text not null default 'completed',
  requested_at timestamptz not null default now(),
  constraint instagram_data_deletion_requests_status_check check (status in ('completed', 'no_matching_account'))
);

create unique index if not exists instagram_data_deletion_requests_code_idx on public.instagram_data_deletion_requests (confirmation_code);
create index if not exists instagram_data_deletion_requests_meta_user_id_idx on public.instagram_data_deletion_requests (meta_user_id);

alter table public.instagram_data_deletion_requests enable row level security;
