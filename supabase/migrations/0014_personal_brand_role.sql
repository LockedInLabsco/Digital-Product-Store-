-- Adds the 'personal_brand' role to the existing admin_users/admin_invites
-- CHECK constraints (added in 0013_admin_users_and_roles.sql). This is a
-- pure widening of an allowed-values list — no data is touched, no
-- existing constraint name changes meaning, and no historical migration
-- is edited. See src/lib/admin/permissions.ts for what this role can do
-- (ROLE_PERMISSIONS.personal_brand) and src/types/admin.ts for the
-- AdminRole union it now needs to match.

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('owner', 'developer', 'social_media', 'analyst', 'personal_brand'));

alter table public.admin_invites
  drop constraint if exists admin_invites_role_check;

alter table public.admin_invites
  add constraint admin_invites_role_check
  check (role in ('owner', 'developer', 'social_media', 'analyst', 'personal_brand'));
