create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table site_settings enable row level security;

-- Public (anon) read access, so the storefront can render saved media
-- without a service-role key. No insert/update/delete policy is created
-- for anon/authenticated -- only the service-role key (used server-side
-- in the admin API routes) can write, since it bypasses RLS entirely.
create policy "Public can read site settings"
  on site_settings for select
  to anon, authenticated
  using (true);

insert into site_settings (setting_key, setting_value)
values (
  'website_media',
  '{
    "logo_dark_url": "", "logo_light_url": "",
    "symbol_dark_url": "", "symbol_light_url": "",
    "favicon_url": "",
    "hero_image_url": "", "hero_image_alt": "",
    "about_image_url": "", "about_image_alt": "",
    "manifesto_image_url": "", "manifesto_image_alt": "",
    "newsletter_image_url": "", "newsletter_image_alt": "",
    "final_cta_image_url": "", "final_cta_image_alt": "",
    "social_share_image_url": ""
  }'::jsonb
)
on conflict (setting_key) do nothing;
