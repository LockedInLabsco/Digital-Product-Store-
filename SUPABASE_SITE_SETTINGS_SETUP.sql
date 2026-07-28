-- Run this in the Supabase SQL editor to enable the Website Appearance editor.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT guards).

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists site_settings_key_idx on public.site_settings (setting_key);

alter table public.site_settings enable row level security;

-- The public homepage reads settings using the anon key, so anon/authenticated
-- need SELECT access. Only the service-role key (used exclusively from admin
-- API routes, never exposed to the browser) can insert/update/delete -- it
-- bypasses RLS entirely, so no write policy is defined here on purpose,
-- matching the same reasoning already used in SUPABASE_ORDERS_SETUP.sql.
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Public storage bucket for theme/content images (hero, section, background,
-- and logo images). Separate from the existing private "products" bucket
-- (downloadable files) and public "Product-Covers" bucket (product images).
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public can read site assets" on storage.objects;
create policy "Public can read site assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-assets');
