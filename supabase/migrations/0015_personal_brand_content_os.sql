-- Personal Brand Content OS: private internal workspace for operating a
-- personal brand (content library, performance snapshots, reusable
-- formats, an idea vault, and experiments). Entirely new, pb_-prefixed
-- tables — no foreign keys into products/orders (see the audit note on
-- schema drift around those tables; this system stays isolated).
--
-- Security follows the same pattern as every other admin table in this
-- project (see 0013_admin_users_and_roles.sql, 0006_waitlist_system.sql):
-- RLS is enabled everywhere, but it is a secondary safety net, not the
-- primary gate. The primary gate is requirePermission('personal_brand:*')
-- in src/lib/admin/auth.ts, checked independently by every page and every
-- API route under src/app/api/admin/personal-brand/*. All real reads and
-- writes go through those routes using the service-role key, which
-- bypasses RLS entirely. No anon/authenticated policies are created here
-- at all — this data is private, unlike e.g. published waitlists, which
-- do need a public read policy. If the anon/authenticated key is ever
-- used directly against these tables, RLS with no policies means it sees
-- nothing.

-- ---------------------------------------------------------------------
-- pb_formats — reusable content structures (e.g. "Direct Promise ->
-- Value -> CTA"). Deliberately holds no performance numbers of its own;
-- those are always calculated from pb_content_items/pb_content_metrics
-- so they can never go stale. Created before pb_content_items since
-- content items reference it.
-- ---------------------------------------------------------------------

create table if not exists public.pb_formats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  hook_structure text null,
  body_structure text null,
  cta_structure text null,
  status text not null default 'active',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pb_formats_status_check check (status in ('active', 'retired'))
);

create index if not exists pb_formats_status_idx on public.pb_formats (status);

-- ---------------------------------------------------------------------
-- pb_content_items — the central content library.
-- ---------------------------------------------------------------------

create table if not exists public.pb_content_items (
  id uuid primary key default gen_random_uuid(),

  platform text not null default 'instagram',
  content_type text not null,
  status text not null default 'draft',

  title text null,

  caption text null,
  script text null,
  transcript text null,

  hook text null,
  cta text null,

  topic text null,
  content_pillar text null,
  goal text null,

  format_id uuid null references public.pb_formats(id) on delete set null,

  duration_seconds integer null,

  posted_at timestamptz null,
  platform_url text null,

  thumbnail_path text null,
  media_path text null,

  notes text null,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pb_content_items_platform_check
    check (platform in ('instagram', 'tiktok', 'youtube', 'other')),
  constraint pb_content_items_content_type_check
    check (content_type in ('reel', 'carousel', 'post', 'story', 'other')),
  constraint pb_content_items_status_check
    check (status in ('draft', 'planned', 'posted', 'archived')),
  constraint pb_content_items_duration_check
    check (duration_seconds is null or duration_seconds >= 0)
);

create index if not exists pb_content_items_status_idx on public.pb_content_items (status);
create index if not exists pb_content_items_format_id_idx on public.pb_content_items (format_id);
create index if not exists pb_content_items_posted_at_idx on public.pb_content_items (posted_at desc);
create index if not exists pb_content_items_content_type_idx on public.pb_content_items (content_type);
create index if not exists pb_content_items_topic_idx on public.pb_content_items (topic);
create index if not exists pb_content_items_content_pillar_idx on public.pb_content_items (content_pillar);

-- ---------------------------------------------------------------------
-- pb_content_metrics — performance SNAPSHOTS, not a single final record.
-- One content item can have many rows over time (6h, 24h, 3d, 7d, 30d,
-- ...). Every metric is nullable: platforms don't expose the same set,
-- and a snapshot taken early won't have e.g. 30-day watch time yet.
-- ---------------------------------------------------------------------

create table if not exists public.pb_content_metrics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.pb_content_items(id) on delete cascade,
  recorded_at timestamptz not null default now(),

  views bigint null,
  reach bigint null,

  likes bigint null,
  comments bigint null,
  shares bigint null,
  saves bigint null,

  followers_gained integer null,
  profile_visits integer null,
  dms_generated integer null,

  watch_time_seconds bigint null,
  average_watch_time_seconds numeric null,
  completion_rate numeric null,

  created_at timestamptz not null default now(),

  constraint pb_content_metrics_non_negative_check check (
    (views is null or views >= 0) and
    (reach is null or reach >= 0) and
    (likes is null or likes >= 0) and
    (comments is null or comments >= 0) and
    (shares is null or shares >= 0) and
    (saves is null or saves >= 0) and
    (followers_gained is null or followers_gained >= 0) and
    (profile_visits is null or profile_visits >= 0) and
    (dms_generated is null or dms_generated >= 0) and
    (watch_time_seconds is null or watch_time_seconds >= 0) and
    (average_watch_time_seconds is null or average_watch_time_seconds >= 0) and
    (completion_rate is null or (completion_rate >= 0 and completion_rate <= 1))
  )
);

create index if not exists pb_content_metrics_content_id_idx on public.pb_content_metrics (content_id);
create index if not exists pb_content_metrics_recorded_at_idx on public.pb_content_metrics (recorded_at desc);

-- ---------------------------------------------------------------------
-- pb_ideas — the idea vault.
-- ---------------------------------------------------------------------

create table if not exists public.pb_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  raw_idea text null,
  notes text null,

  topic text null,
  content_pillar text null,

  possible_hook text null,
  format_id uuid null references public.pb_formats(id) on delete set null,

  priority text not null default 'normal',
  status text not null default 'idea',

  source text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pb_ideas_priority_check check (priority in ('low', 'normal', 'high')),
  constraint pb_ideas_status_check check (status in ('idea', 'planned', 'used', 'archived'))
);

create index if not exists pb_ideas_status_idx on public.pb_ideas (status);
create index if not exists pb_ideas_format_id_idx on public.pb_ideas (format_id);

-- ---------------------------------------------------------------------
-- pb_experiments — content hypotheses + evidence, not automatic
-- causation. Associates multiple content items via a proper join table
-- (pb_experiment_content), never a packed text field.
-- ---------------------------------------------------------------------

create table if not exists public.pb_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text null,
  variable_tested text null,
  description text null,

  status text not null default 'planned',

  started_at timestamptz null,
  ended_at timestamptz null,

  result text null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pb_experiments_status_check
    check (status in ('planned', 'active', 'completed', 'abandoned'))
);

create index if not exists pb_experiments_status_idx on public.pb_experiments (status);

create table if not exists public.pb_experiment_content (
  experiment_id uuid not null references public.pb_experiments(id) on delete cascade,
  content_id uuid not null references public.pb_content_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (experiment_id, content_id)
);

create index if not exists pb_experiment_content_content_id_idx on public.pb_experiment_content (content_id);

-- ---------------------------------------------------------------------
-- Row Level Security — enabled on every table, no anon/authenticated
-- policies at all. All access is via the service-role key from
-- src/app/api/admin/personal-brand/* routes, gated by requirePermission().
-- ---------------------------------------------------------------------

alter table public.pb_formats enable row level security;
alter table public.pb_content_items enable row level security;
alter table public.pb_content_metrics enable row level security;
alter table public.pb_ideas enable row level security;
alter table public.pb_experiments enable row level security;
alter table public.pb_experiment_content enable row level security;
