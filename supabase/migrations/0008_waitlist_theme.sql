-- Per-waitlist visual theme. A JSONB column (not separate color
-- columns) since a built-in preset only ever needs to store its name —
-- the actual colors live in code (see lib/waitlist/theme.ts) and can
-- gain more fields later (font, logo, texture...) without a migration.
-- Existing waitlists default to the site's current dark identity, so
-- they keep rendering exactly as they already do.
alter table public.waitlists
  add column if not exists theme_config jsonb not null default '{"preset":"not4normal-dark"}'::jsonb;
