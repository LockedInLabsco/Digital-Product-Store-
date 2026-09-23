-- Opts the existing SlowDay waitlist row into the new standalone public
-- layout (see lib/waitlist/theme.ts's `layout` field on theme_config —
-- added in application code, no schema change needed since theme_config
-- is already a flexible jsonb column, see 0008_waitlist_theme.sql).
--
-- Every other waitlist row is untouched and keeps theme_config without a
-- `layout` key, which resolves to 'standard' (the existing generic
-- NOT4NORMAL-chrome presentation) — see isStandaloneLayout(). Plain
-- UPDATE by slug, safe to rerun.
update public.waitlists
set
  theme_config = theme_config || '{"layout":"standalone"}'::jsonb,
  updated_at = now()
where slug = 'phone-control-app';
