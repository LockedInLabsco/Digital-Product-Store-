-- Rebrands the existing phone-control-app waitlist row (seeded in 0006)
-- to the SlowDay product identity and applies the new 'slowday' theme
-- preset (see lib/waitlist/theme.ts). Plain UPDATE by slug — safe to
-- rerun, and admins can still override any of these fields afterwards
-- through the waitlist admin UI.
update public.waitlists
set
  name = 'SlowDay',
  description = 'SlowDay — the minimal screen-time control app being built in public on Instagram.',
  headline = 'A calmer way to take back control of your phone.',
  supporting_text = 'SlowDay is a minimal app for reducing screen addiction through screen-time awareness, app control, grayscale, focus, and better digital habits. Join the waitlist to get early access and follow the build.',
  button_text = 'Join the waitlist',
  theme_config = '{"preset":"slowday"}'::jsonb,
  updated_at = now()
where slug = 'phone-control-app';
