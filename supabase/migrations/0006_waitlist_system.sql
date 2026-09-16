-- Reusable waitlist system: many waitlists (one per app/product/launch),
-- each with its own public URL and its own leads, sharing a single
-- entries table instead of one table per waitlist.

create table if not exists public.waitlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text null,
  headline text null,
  supporting_text text null,
  button_text text null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlists_status_check check (status in ('draft', 'active', 'closed'))
);

create unique index if not exists waitlists_slug_idx
  on public.waitlists (slug);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.waitlists(id) on delete cascade,
  email text not null,
  instagram_username text not null,
  first_name text null,
  source text not null default 'waitlist_page',
  created_at timestamptz not null default now()
);

-- One entry per email per waitlist — the same person can join multiple
-- different waitlists, just not the same one twice.
create unique index if not exists waitlist_entries_waitlist_email_idx
  on public.waitlist_entries (waitlist_id, email);

create index if not exists waitlist_entries_waitlist_id_idx
  on public.waitlist_entries (waitlist_id);

create index if not exists waitlist_entries_created_at_idx
  on public.waitlist_entries (created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Admin reads/writes (list all waitlists, create/edit/delete, read all
-- entries) go through /api/admin/* routes using the service-role key,
-- which bypasses RLS entirely — same as products/orders/free_downloads.
-- The policies below are what protect the anon key if it's ever used
-- directly (e.g. the public waitlist page loading a waitlist by slug).

alter table public.waitlists enable row level security;
alter table public.waitlist_entries enable row level security;

drop policy if exists "Allow public read access to published waitlists" on public.waitlists;
create policy "Allow public read access to published waitlists"
  on public.waitlists for select
  using (status in ('active', 'closed'));

-- No public policies on waitlist_entries at all: anon/authenticated
-- roles cannot select, insert, update, or delete rows directly. Public
-- signups are written by /api/waitlist/[slug] using the service-role
-- key after the route resolves and validates the waitlist itself.

-- ---------------------------------------------------------------------
-- Migrate the existing hardcoded phone-app waitlist (public.waitlist,
-- added in 0005) into the new reusable system, if it exists. The old
-- table is left in place untouched as a backup — nothing is dropped.
-- ---------------------------------------------------------------------

insert into public.waitlists (name, slug, description, headline, supporting_text, button_text, status)
values (
  'Phone Control App',
  'phone-control-app',
  'The Android screen-time app being built in public on Instagram.',
  'A better way to take back control of your phone.',
  'I''m building a minimal Android app for screen-time control, app blocking, grayscale, focus, and smarter rewards. Join the waitlist to get early access and follow the build.',
  'Join the waitlist',
  'active'
)
on conflict (slug) do nothing;

do $$
begin
  if to_regclass('public.waitlist') is not null then
    insert into public.waitlist_entries (waitlist_id, email, instagram_username, first_name, source, created_at)
    select
      (select id from public.waitlists where slug = 'phone-control-app'),
      w.email,
      w.instagram_username,
      w.first_name,
      w.source,
      w.created_at
    from public.waitlist w
    on conflict (waitlist_id, email) do nothing;
  end if;
end $$;
