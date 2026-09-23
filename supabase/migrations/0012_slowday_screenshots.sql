-- Per-waitlist screenshot URLs, uploaded from the admin (Edit waitlist ->
-- Screenshots) via the same site-assets storage bucket other site images
-- already use (see lib/admin/mediaUpload.ts's new 'waitlist' folder).
-- A jsonb column, not fixed image columns, so the four named slots
-- (home/focus/slowday/progress — see WaitlistScreenshots in
-- types/waitlist.ts) can be extended later without another migration.
-- Existing rows default to '{}', which every standalone-layout waitlist
-- already renders correctly as its placeholder frames.
alter table public.waitlists
  add column if not exists screenshots jsonb not null default '{}'::jsonb;
