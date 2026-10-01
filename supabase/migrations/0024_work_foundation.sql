-- Work system foundation: internal team/task management living inside
-- the existing admin panel, entirely additive. See
-- src/lib/admin/workScope.ts for how authorization over these tables is
-- resolved, and src/lib/work/activityLog.ts for how wk_activity_log is
-- written. Does not touch admin_users/admin_invites or any other
-- existing table.
--
-- Team Lead is deliberately NOT an AdminRole value — it's membership
-- data on wk_team_members, scoped per team, so "who leads what" is pure
-- data rather than a code change. See the audit note in
-- src/lib/admin/permissions.ts for why AdminRole stays a small, fixed,
-- admin-panel-wide access level and this system layers a relational
-- scope on top instead of growing that enum.
--
-- Security follows the exact pattern already established by
-- 0013_admin_users_and_roles.sql and 0015_personal_brand_content_os.sql:
-- RLS enabled on every table, no anon/authenticated policies at all. All
-- real reads/writes go through src/app/api/admin/work/* routes using the
-- service-role key, gated by requirePermission()/getWorkScope().

-- ---------------------------------------------------------------------
-- wk_teams — customizable work groupings (Content, Marketing, Dev, ...).
-- No archiving/status column yet (not needed for V1 — see the audit).
-- Name uniqueness is a plain case-insensitive unique index for now; if
-- archiving is added later, this index can be narrowed to a partial
-- index (e.g. `where status = 'active'`) without a data migration.
-- ---------------------------------------------------------------------

create table if not exists public.wk_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  created_by uuid not null references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wk_teams_name_not_blank_check check (length(trim(name)) > 0)
);

create unique index if not exists wk_teams_name_idx on public.wk_teams (lower(name));

-- ---------------------------------------------------------------------
-- wk_team_members — THE relational permission boundary for the Work
-- system (see getWorkScope in src/lib/admin/workScope.ts). Deleting a
-- team cascades its memberships; deleting an admin cascades their
-- memberships too (an admin who's been removed from admin_users has no
-- standing to lead or belong to a work team).
-- ---------------------------------------------------------------------

create table if not exists public.wk_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.wk_teams(id) on delete cascade,
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  team_role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint wk_team_members_role_check check (team_role in ('lead', 'member')),
  constraint wk_team_members_unique unique (team_id, admin_user_id)
);

create index if not exists wk_team_members_team_id_idx on public.wk_team_members (team_id);
create index if not exists wk_team_members_admin_user_id_idx on public.wk_team_members (admin_user_id);
-- Narrow index for "which teams does X lead" — the exact lookup
-- getWorkScope() runs on every request that touches Work.
create index if not exists wk_team_members_leads_idx on public.wk_team_members (admin_user_id) where team_role = 'lead';

-- ---------------------------------------------------------------------
-- wk_tasks — one-off tasks only in this phase (no project_id,
-- recurring_task_id, checklist, attachments, or comments yet — see the
-- audit's phased plan). `creator_type` exists now, defaulted to
-- 'human', purely so a later "automated systems create tasks too" phase
-- doesn't require a schema rewrite — it is not used anywhere yet.
--
-- assignee_id/assigned_by use ON DELETE SET NULL (removing an admin
-- orphans/unassigns their tasks rather than blocking the removal).
-- created_by and team_id use the default NO ACTION/RESTRICT behavior
-- deliberately: a task (and the audit trail pointing at it) should never
-- silently lose its creator, and removing an admin who has created
-- tasks should fail loudly rather than quietly orphan authorship. See
-- the implementation report's Known Issues for the resulting interaction
-- with the existing /admin/team DELETE route.
-- ---------------------------------------------------------------------

create table if not exists public.wk_tasks (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text null,

  assignee_id uuid null references public.admin_users(id) on delete set null,
  created_by uuid not null references public.admin_users(id),
  assigned_by uuid null references public.admin_users(id) on delete set null,
  creator_type text not null default 'human',

  team_id uuid null references public.wk_teams(id) on delete set null,

  priority text not null default 'normal',
  status text not null default 'not_started',
  blocked_reason text null,

  start_date date null,
  due_date date null,
  due_time time null,
  completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wk_tasks_title_not_blank_check check (length(trim(title)) > 0),
  constraint wk_tasks_creator_type_check check (creator_type in ('human', 'system')),
  constraint wk_tasks_priority_check check (priority in ('low', 'normal', 'high')),
  constraint wk_tasks_status_check check (status in ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled')),
  -- Defense in depth alongside the same rule enforced in
  -- src/lib/work/validate.ts: a blocked task must carry a reason.
  constraint wk_tasks_blocked_reason_check check (status <> 'blocked' or blocked_reason is not null)
);

create index if not exists wk_tasks_assignee_id_idx on public.wk_tasks (assignee_id);
create index if not exists wk_tasks_created_by_idx on public.wk_tasks (created_by);
create index if not exists wk_tasks_team_id_idx on public.wk_tasks (team_id);
create index if not exists wk_tasks_status_idx on public.wk_tasks (status);
create index if not exists wk_tasks_due_date_idx on public.wk_tasks (due_date);

-- ---------------------------------------------------------------------
-- wk_activity_log — basic, append-only audit trail for the Work system.
-- entity_id is deliberately a bare uuid with NO foreign key: entity_type
-- varies (task/team/team_member), so it can't point at one table, and an
-- audit row must be able to outlive the record it describes (e.g. a
-- deleted task's "task_deleted" entry). Never written to directly by the
-- client — see src/lib/work/activityLog.ts, the only code path that
-- inserts here.
-- ---------------------------------------------------------------------

create table if not exists public.wk_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_user_id uuid not null references public.admin_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wk_activity_log_entity_type_check check (entity_type in ('task', 'team', 'team_member'))
);

create index if not exists wk_activity_log_entity_idx on public.wk_activity_log (entity_type, entity_id);
create index if not exists wk_activity_log_actor_idx on public.wk_activity_log (actor_admin_user_id);
create index if not exists wk_activity_log_created_at_idx on public.wk_activity_log (created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security — enabled everywhere, no anon/authenticated
-- policies. All access is via the service-role key from
-- src/app/api/admin/work/* routes, gated by requirePermission()/
-- getWorkScope(). If the anon/authenticated key is ever used directly
-- against these tables, RLS with no policies means it sees nothing.
-- ---------------------------------------------------------------------

alter table public.wk_teams enable row level security;
alter table public.wk_team_members enable row level security;
alter table public.wk_tasks enable row level security;
alter table public.wk_activity_log enable row level security;
