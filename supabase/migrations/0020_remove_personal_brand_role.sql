-- Removes the standalone 'personal_brand' role — social_media already
-- carries every personal_brand:* permission it did, plus more (see
-- ROLE_PERMISSIONS in src/lib/admin/permissions.ts), so the narrower
-- role added no real access control and was just extra surface area.
-- Existing admins holding it get 'social_media' in its place; the
-- personal_brand:* PERMISSIONS themselves are untouched — this only
-- removes the role that granted nothing beyond a subset of what
-- social_media already grants.

update public.admin_users
  set roles = array(select distinct unnest(
    array_replace(roles, 'personal_brand', 'social_media')
  ))
  where 'personal_brand' = any(roles);

update public.admin_invites
  set roles = array(select distinct unnest(
    array_replace(roles, 'personal_brand', 'social_media')
  ))
  where 'personal_brand' = any(roles);

alter table public.admin_users drop constraint if exists admin_users_roles_check;
alter table public.admin_users
  add constraint admin_users_roles_check
  check (
    roles <@ array['owner', 'developer', 'social_media', 'analyst']::text[]
    and cardinality(roles) > 0
  );

alter table public.admin_invites drop constraint if exists admin_invites_roles_check;
alter table public.admin_invites
  add constraint admin_invites_roles_check
  check (
    roles <@ array['owner', 'developer', 'social_media', 'analyst']::text[]
    and cardinality(roles) > 0
  );
