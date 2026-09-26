-- Lets one admin hold more than one role at once (e.g. "Founder" +
-- "Social Media", or "Social Media" + "Analyst") — permissions become
-- the union of every role held. Converts the single `role` text column
-- on admin_users/admin_invites to a `roles` text[] column.
--
-- cardinality(), not array_length(), for the non-empty check:
-- array_length('{}'::text[], 1) is NULL (not 0), which a CHECK
-- constraint treats as passing — cardinality() correctly returns 0 for
-- an empty array, so an admin can never end up with zero roles.

alter table public.admin_users add column if not exists roles text[];
update public.admin_users set roles = array[role] where roles is null;
alter table public.admin_users alter column roles set not null;

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_roles_check
  check (
    roles <@ array['owner', 'developer', 'social_media', 'analyst', 'personal_brand']::text[]
    and cardinality(roles) > 0
  );

alter table public.admin_users drop column role;

alter table public.admin_invites add column if not exists roles text[];
update public.admin_invites set roles = array[role] where roles is null;
alter table public.admin_invites alter column roles set not null;

alter table public.admin_invites drop constraint if exists admin_invites_role_check;
alter table public.admin_invites
  add constraint admin_invites_roles_check
  check (
    roles <@ array['owner', 'developer', 'social_media', 'analyst', 'personal_brand']::text[]
    and cardinality(roles) > 0
  );

alter table public.admin_invites drop column role;
