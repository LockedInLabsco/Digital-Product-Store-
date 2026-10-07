-- ---------------------------------------------------------------------
-- ONE-TIME, MANUAL ops script — NOT a migration, not auto-applied by
-- `supabase db push` (lives outside supabase/migrations/ on purpose).
-- Run each numbered section yourself, in a SQL editor, reading the
-- output of each SELECT before running the next write. Nothing here is
-- destructive until Section 4, and Section 4 only deletes a workspace
-- row this script itself proves has zero remaining content/members.
--
-- Context: the Social Workspace model used to assume one workspace per
-- admin. Two workspaces exist today from that assumption:
--   1. "Darshana Personal Brand" — created by the original
--      backfillSocialWorkspace() migration (src/lib/social/backfillWorkspace.ts),
--      owned by whichever admin held the site-wide 'owner' role at the
--      time.
--   2. "<email> Social Workspace" — auto-created the first time
--      alx.evolves@gmail.com used the self-serve Instagram Connect flow
--      (src/lib/social/provisionWorkspace.ts's provisionOwnWorkspace,
--      now retired from that code path — see the audit report).
-- @alx.lifelogs (Instagram Business Account id 17841441244537277) may
-- now live on either one, depending on which workspace was active when
-- it was last (re)connected. This script finds out, then — only if two
-- real workspaces truly exist — merges everything onto the one that
-- actually holds @alx.lifelogs, adds alx.evolves@gmail.com as its
-- owner, and removes the now-empty duplicate.
-- ---------------------------------------------------------------------


-- ========================================================================
-- SECTION 1 — DIAGNOSTIC ONLY. Run this first. Read the output before
-- touching anything below.
-- ========================================================================

select
  w.id as workspace_id,
  w.name,
  w.created_at,
  (select count(*) from public.social_workspace_members m where m.workspace_id = w.id) as member_count,
  (select string_agg(au.email || ' (' || m.workspace_role || ')', ', ')
     from public.social_workspace_members m
     join public.admin_users au on au.id = m.admin_user_id
    where m.workspace_id = w.id) as members,
  (select string_agg(ca.platform || ':' || coalesce(ca.username, ca.external_account_id) || ' [' || ca.status || ']', ', ')
     from public.social_connected_accounts ca
    where ca.workspace_id = w.id) as connected_accounts,
  (select count(*) from public.pb_content_items ci where ci.workspace_id = w.id) as content_items,
  (select count(*) from public.pb_formats f where f.workspace_id = w.id) as formats,
  (select count(*) from public.pb_ideas i where i.workspace_id = w.id) as ideas,
  (select count(*) from public.pb_experiments e where e.workspace_id = w.id) as experiments
from public.social_workspaces w
order by w.created_at;

-- Expect two rows: "Darshana Personal Brand" and something like
-- "alx.evolves@gmail.com Social Workspace". Note which workspace_id's
-- connected_accounts column shows "instagram:alx.lifelogs [active]" (or
-- external_account_id = 17841441244537277 if username wasn't captured).
-- THAT workspace_id is CANONICAL_WORKSPACE_ID below. The other one is
-- OLD_WORKSPACE_ID.
--
-- If only one workspace exists, or @alx.lifelogs doesn't show as
-- 'active' on either, STOP — the situation doesn't match what this
-- script assumes; resolve manually first.


-- ========================================================================
-- SECTION 2 — fill these in from Section 1's output, then run the
-- SELECTs in Section 3 before running any UPDATE/DELETE.
-- ========================================================================

-- CANONICAL_WORKSPACE_ID := '00000000-0000-0000-0000-000000000000'  -- the one holding @alx.lifelogs
-- OLD_WORKSPACE_ID       := '00000000-0000-0000-0000-000000000000'  -- the duplicate to retire
-- ALX_EVOLVES_ADMIN_USER_ID := (select id from public.admin_users where email = 'alx.evolves@gmail.com')


-- ========================================================================
-- SECTION 3 — preview exactly what Section 4 will move/change. Replace
-- the placeholder UUIDs with your real values from Section 2 and run
-- each SELECT. If any count looks wrong, stop and investigate instead
-- of proceeding.
-- ========================================================================

-- Content that will be re-pointed onto the canonical workspace:
select 'pb_content_items' as table_name, count(*) from public.pb_content_items where workspace_id = 'OLD_WORKSPACE_ID'
union all
select 'pb_formats', count(*) from public.pb_formats where workspace_id = 'OLD_WORKSPACE_ID'
union all
select 'pb_ideas', count(*) from public.pb_ideas where workspace_id = 'OLD_WORKSPACE_ID'
union all
select 'pb_experiments', count(*) from public.pb_experiments where workspace_id = 'OLD_WORKSPACE_ID';

-- Is alx.evolves@gmail.com already a member of the canonical workspace?
select * from public.social_workspace_members
where workspace_id = 'CANONICAL_WORKSPACE_ID'
  and admin_user_id = (select id from public.admin_users where email = 'alx.evolves@gmail.com');


-- ========================================================================
-- SECTION 4 — the actual merge. Run these one at a time, in order.
-- Wrap in a transaction so you can roll back if anything looks wrong
-- before the final COMMIT.
-- ========================================================================

begin;

-- 4a. Re-point any content the old workspace holds onto the canonical
-- one, so nothing is lost (safe even if these return 0 rows updated).
update public.pb_content_items set workspace_id = 'CANONICAL_WORKSPACE_ID' where workspace_id = 'OLD_WORKSPACE_ID';
update public.pb_formats        set workspace_id = 'CANONICAL_WORKSPACE_ID' where workspace_id = 'OLD_WORKSPACE_ID';
update public.pb_ideas          set workspace_id = 'CANONICAL_WORKSPACE_ID' where workspace_id = 'OLD_WORKSPACE_ID';
update public.pb_experiments    set workspace_id = 'CANONICAL_WORKSPACE_ID' where workspace_id = 'OLD_WORKSPACE_ID';

-- 4b. Make alx.evolves@gmail.com an owner of the canonical workspace
-- (no-op if already a member — ON CONFLICT keeps their existing role
-- rather than downgrading an existing owner/manager).
insert into public.social_workspace_members (workspace_id, admin_user_id, workspace_role)
select 'CANONICAL_WORKSPACE_ID', id, 'owner' from public.admin_users where email = 'alx.evolves@gmail.com'
on conflict (workspace_id, admin_user_id) do nothing;

-- 4c. Remove the old workspace's own membership row(s) and the
-- now-empty workspace itself. This only succeeds if the old workspace
-- has no remaining connected account (disconnected rows are fine — the
-- unique constraint is only on status='active', and 4a/4b already moved
-- everything else) — if it still holds any OTHER active connected
-- account that ISN'T @alx.lifelogs, STOP here and resolve that first,
-- since deleting the workspace would cascade-delete that account's
-- token/history too.
select * from public.social_connected_accounts where workspace_id = 'OLD_WORKSPACE_ID' and status = 'active';
-- ^ expect zero rows before continuing.

delete from public.social_workspace_members where workspace_id = 'OLD_WORKSPACE_ID';
delete from public.social_workspaces where id = 'OLD_WORKSPACE_ID';

-- Review everything above looks right, THEN:
-- commit;
-- (or `rollback;` if anything looked wrong)
