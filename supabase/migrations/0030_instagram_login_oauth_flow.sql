-- Phase G (Direct Instagram Login) — adds the second OAuth flow value
-- 0027_social_oauth_states.sql's own comment already anticipated:
-- "Fixed to one value today ('instagram_connect') so this table can be
-- reused for a future OAuth flow (e.g. the Instagram Login messaging
-- product) without a redesign — just another allowed value here."
--
-- Purely additive: widens one check constraint, touches no existing
-- rows. The existing Facebook Login connect flow
-- (src/app/api/admin/social/instagram/connect/*) keeps using
-- 'instagram_connect' completely unchanged — see
-- src/lib/social/instagramOAuthState.ts's now-parameterized
-- createInstagramOAuthState/consumeInstagramOAuthState, which both
-- default to 'instagram_connect' for every pre-existing call site.

alter table public.social_oauth_states drop constraint social_oauth_states_flow_check;
alter table public.social_oauth_states add constraint social_oauth_states_flow_check
  check (flow in ('instagram_connect', 'instagram_login_connect'));
