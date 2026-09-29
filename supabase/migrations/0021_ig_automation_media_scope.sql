-- Lets a comment_keyword automation rule optionally be scoped to one
-- specific Instagram post/reel instead of firing on comments anywhere on
-- the account. null (the existing default for every current row) keeps
-- today's behavior — matches comments on any post. See
-- src/lib/instagram/automations.ts for how this is applied alongside the
-- existing keyword match, and src/app/api/webhooks/instagram/route.ts
-- for where the media id is read off the comments webhook payload
-- (`value.media.id`, confirmed against Meta's own webhook reference).

alter table public.ig_automation_rules
  add column if not exists instagram_media_id text null;

create index if not exists ig_automation_rules_media_idx
  on public.ig_automation_rules (instagram_media_id)
  where instagram_media_id is not null;
