-- Seeds the default (empty) hero slider images row in the existing
-- site_settings table. No new table, RLS policy, or storage bucket is
-- needed: site_settings.setting_value is jsonb and already has a
-- public-read policy covering every setting_key, and admin writes go
-- through the service-role key exactly like the "website_media" key.
insert into site_settings (setting_key, setting_value)
values ('hero_slider_images', '[]'::jsonb)
on conflict (setting_key) do nothing;
