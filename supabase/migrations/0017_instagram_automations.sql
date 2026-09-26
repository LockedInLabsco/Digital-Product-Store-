-- Instagram DM automation — comment keyword, DM keyword, and story-reply
-- triggers, each firing an automatic reply, plus an optional drip
-- sequence of delayed follow-up messages. Replaces the free tier of a
-- third-party tool (Superprofile) with the same official mechanism it
-- itself sits on top of: Meta's Instagram Messaging API + Private
-- Replies. See docs/INSTAGRAM_AUTOMATIONS_SETUP.md for the webhook and
-- permission setup this needs beyond the read-only sync in 0016.
--
-- Same security pattern as every other table in this project: RLS
-- enabled, no anon/authenticated policies. Rule/follow-up CRUD goes
-- through src/app/api/admin/personal-brand/automations/* (service role,
-- gated by requirePermission('personal_brand:write')). The webhook
-- receiver and the follow-up cron job also use the service role
-- directly — they're gated by their own secrets (webhook signature
-- verification, CRON_SECRET), not admin auth, since Meta and the cron
-- pinger are never a logged-in admin.

create table if not exists public.ig_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null,
  -- null keyword = matches any text for this trigger type (mainly used
  -- for "reply to any story mention," where there's nothing to key off).
  keyword text null,
  match_type text not null default 'contains',
  reply_message text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ig_automation_rules_trigger_type_check
    check (trigger_type in ('comment_keyword', 'dm_keyword', 'story_reply')),
  constraint ig_automation_rules_match_type_check
    check (match_type in ('contains', 'exact'))
);

create index if not exists ig_automation_rules_active_idx on public.ig_automation_rules (trigger_type, is_active);

-- ---------------------------------------------------------------------
-- ig_automation_followups — an ordered drip sequence attached to a rule.
-- delay_hours is measured from the previous step (or from the initial
-- reply, for step_order = 1) — see the cron job in
-- src/app/api/cron/instagram-followups/route.ts for how it's scheduled.
-- ---------------------------------------------------------------------

create table if not exists public.ig_automation_followups (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.ig_automation_rules(id) on delete cascade,
  step_order integer not null,
  delay_hours numeric not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint ig_automation_followups_step_order_check check (step_order > 0),
  constraint ig_automation_followups_delay_check check (delay_hours > 0),
  unique (rule_id, step_order)
);

-- ---------------------------------------------------------------------
-- ig_automation_runs — one row per triggering event (one comment, one
-- inbound DM, one story reply), tracking its progress through the rule's
-- follow-up sequence. The unique constraint on (source_type, source_id)
-- is the hard de-dupe: the same comment/message can never be processed
-- twice, even if Meta redelivers the webhook.
-- ---------------------------------------------------------------------

create table if not exists public.ig_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.ig_automation_rules(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  recipient_ig_id text not null,
  initial_sent_at timestamptz null,
  -- The step_order of the next follow-up due to be sent, if any.
  next_step integer not null default 1,
  next_due_at timestamptz null,
  completed boolean not null default false,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ig_automation_runs_source_type_check
    check (source_type in ('comment', 'dm', 'story_reply')),
  unique (source_type, source_id)
);

create index if not exists ig_automation_runs_due_idx on public.ig_automation_runs (next_due_at) where completed = false;
create index if not exists ig_automation_runs_rule_id_idx on public.ig_automation_runs (rule_id);

alter table public.ig_automation_rules enable row level security;
alter table public.ig_automation_followups enable row level security;
alter table public.ig_automation_runs enable row level security;
