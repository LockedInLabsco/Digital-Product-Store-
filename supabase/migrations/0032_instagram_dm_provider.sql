-- N4N DM Automations — adds the third provider value this codebase's
-- own constraint design already anticipated: social_account_tokens and
-- social_connected_account_identifiers both documented (see
-- 0025_social_workspaces_foundation.sql §"provider gains 'facebook_login'
-- as a second allowed value") that a later provider is "a one-line
-- constraint change, never a redesign." 'instagram_dm' is that new value,
-- for the dedicated "N4N DM Automations" Meta app (messaging only —
-- comments/messages webhooks, outbound DM sends). Same additive pattern
-- 0030_instagram_login_oauth_flow.sql already used to add
-- 'instagram_login_connect' to social_oauth_states_flow_check.
--
-- Purely additive: widens three check constraints, touches no existing
-- rows, creates no new tables. The existing 'instagram_login' and
-- 'facebook_login' providers, and the 'instagram_connect' /
-- 'instagram_login_connect' OAuth flows, are completely unchanged.

alter table public.social_account_tokens drop constraint social_account_tokens_provider_check;
alter table public.social_account_tokens add constraint social_account_tokens_provider_check
  check (provider in ('instagram_login', 'facebook_login', 'instagram_dm'));

alter table public.social_connected_account_identifiers drop constraint social_connected_account_identifiers_provider_check;
alter table public.social_connected_account_identifiers add constraint social_connected_account_identifiers_provider_check
  check (provider in ('instagram_login', 'facebook_login', 'instagram_dm'));

alter table public.social_oauth_states drop constraint social_oauth_states_flow_check;
alter table public.social_oauth_states add constraint social_oauth_states_flow_check
  check (flow in ('instagram_connect', 'instagram_login_connect', 'instagram_dm_connect'));
