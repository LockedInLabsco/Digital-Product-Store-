-- Waitlist signups for the not-yet-launched Android app (screen-time
-- control, app blocking, grayscale, focus sessions, reward unlocking).
-- Separate from free_downloads/orders since this isn't tied to a product.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  instagram_username text not null,
  first_name text null,
  source text not null default 'not4normal_website',
  created_at timestamptz not null default now()
);

-- One row per email — repeat signups are handled in the API route as a
-- friendly "you're already on the waitlist" response, not a new row.
create unique index if not exists waitlist_email_idx
  on public.waitlist (email);

alter table public.waitlist enable row level security;

-- No public RLS policies: written and read only via server routes using
-- the service-role key, exactly like free_downloads and orders.
