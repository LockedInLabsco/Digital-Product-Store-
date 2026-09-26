-- Adds an optional call-to-action button (Instagram's "Button Template"
-- message type) to both the initial automated reply and each follow-up
-- step — e.g. a "Get the link" button instead of a raw URL pasted into
-- the message text. Both columns are optional together: a rule/step
-- with no button_url just sends a plain text message, as before.

alter table public.ig_automation_rules
  add column if not exists button_url text null,
  add column if not exists button_label text null;

alter table public.ig_automation_followups
  add column if not exists button_url text null,
  add column if not exists button_label text null;
