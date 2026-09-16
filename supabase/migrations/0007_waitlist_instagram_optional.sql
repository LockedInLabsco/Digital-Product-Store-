-- Instagram handle is now optional when joining a waitlist.
alter table public.waitlist_entries
  alter column instagram_username drop not null;
