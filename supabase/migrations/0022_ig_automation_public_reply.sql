-- Lets a comment_keyword automation rule optionally also post a public
-- reply on the triggering comment (e.g. "Check your DMs 👀"), alongside
-- the existing private-reply DM. Up to 3 variations are stored so the
-- automation can rotate between them instead of always posting the same
-- line — see src/lib/instagram/publicReply.ts for the rotation logic.
--
-- public_reply_enabled defaults to false and public_reply_variations
-- defaults to '{}', so every existing rule stays exactly as it behaves
-- today (public reply off, private DM unaffected).

alter table public.ig_automation_rules
  add column if not exists public_reply_enabled boolean not null default false;

alter table public.ig_automation_rules
  add column if not exists public_reply_variations text[] not null default '{}';

alter table public.ig_automation_rules
  add constraint ig_automation_rules_public_reply_variations_check
  check (array_length(public_reply_variations, 1) is null or array_length(public_reply_variations, 1) <= 3);

-- Audit trail: which variation (0-based index into public_reply_variations
-- at send time) was used for this run's public reply, and whether that
-- specific send failed — kept separate from last_error, which is the
-- private-DM/message failure, so the two can fail independently without
-- overwriting each other's error.
alter table public.ig_automation_runs
  add column if not exists public_reply_variation_index integer null;

alter table public.ig_automation_runs
  add column if not exists public_reply_error text null;
