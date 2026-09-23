-- Renames the SlowDay waitlist's public URL slug from the original
-- seeded name (phone-control-app, see 0006_waitlist_system.sql) to
-- slowday. Safe on its own: nothing else in the app keys off this slug
-- at runtime — the standalone layout is driven by theme_config.layout
-- (see 0010_slowday_standalone_layout.sql / isStandaloneLayout), not the
-- slug — and waitlist_entries references the row by waitlist_id (a uuid
-- foreign key), so existing signups are untouched.
--
-- Also sets theme_config.layout = 'standalone' in the same statement in
-- case 0010 hasn't been applied yet, so this is safe to run as the only
-- migration needed. The old URL keeps working via a permanent redirect
-- (see next.config.js) rather than just 404ing.
update public.waitlists
set
  slug = 'slowday',
  theme_config = theme_config || '{"layout":"standalone"}'::jsonb,
  updated_at = now()
where slug = 'phone-control-app';
