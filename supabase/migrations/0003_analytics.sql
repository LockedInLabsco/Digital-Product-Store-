-- Analytics support: attribution columns on the existing orders table,
-- plus a new free_downloads table (no equivalent record currently
-- exists for the free-product email-capture flow).
--
-- Detailed behavioural analytics (pageviews, sessions, funnels,
-- session replay) are NOT stored here — they live in PostHog. This
-- migration only adds what's needed for business/revenue reporting:
-- confirmed downloads, confirmed purchases, and the attribution that
-- produced them.

-- ---------------------------------------------------------------------
-- orders: attribution for paid purchases (Paddle-confirmed)
-- ---------------------------------------------------------------------

alter table public.orders
  add column if not exists first_touch_source text,
  add column if not exists first_touch_medium text,
  add column if not exists first_touch_campaign text,
  add column if not exists first_touch_content text,
  add column if not exists last_touch_source text,
  add column if not exists last_touch_medium text,
  add column if not exists last_touch_campaign text,
  add column if not exists referrer_domain text,
  add column if not exists landing_page text,
  add column if not exists device_category text,
  add column if not exists country_code text;

create index if not exists orders_product_id_idx
  on public.orders(product_id);

create index if not exists orders_last_touch_source_idx
  on public.orders(last_touch_source);

-- ---------------------------------------------------------------------
-- free_downloads: one row per free-product email submission
-- ---------------------------------------------------------------------

create table if not exists public.free_downloads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid null references public.products(id) on delete set null,
  product_slug text not null,
  product_title text not null,
  email text not null,
  -- pending | delivered | failed
  download_status text not null default 'pending',
  -- pending | sent | failed
  email_delivery_status text not null default 'pending',
  error_message text null,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  referrer_domain text,
  landing_page text,
  device_category text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists free_downloads_created_at_idx
  on public.free_downloads(created_at desc);

create index if not exists free_downloads_email_idx
  on public.free_downloads(email);

create index if not exists free_downloads_product_id_idx
  on public.free_downloads(product_id);

create index if not exists free_downloads_last_touch_source_idx
  on public.free_downloads(last_touch_source);

alter table public.free_downloads enable row level security;

-- No public RLS policies: written and read only via server routes using
-- the service-role key, exactly like the existing orders table.
