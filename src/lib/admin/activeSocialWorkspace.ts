/**
 * Explicit "active workspace" resolution — the piece
 * resolveDefaultWritableWorkspaceId()'s own doc comment flagged as
 * deferred: this codebase no longer assumes one admin ↔ one workspace,
 * so every multi-workspace admin needs an explicit, switchable "which
 * workspace am I working in right now" selection instead of either (a)
 * mixing every workspace's data together, or (b) failing closed the
 * moment they belong to more than one.
 *
 * Security model (never trust the browser): the active workspace is
 * tracked by a plain, non-sensitive cookie — it is a UX convenience, NOT
 * an authorization token. Every read here re-validates the cookie's
 * workspace id against this admin's actual social_workspace_members rows
 * (via getSocialWorkspaceScope()) on every single call. A tampered,
 * stale, or stolen cookie value can only ever resolve to a workspace the
 * requesting admin already has a real membership row for — see
 * resolveActiveWorkspaceId's membership check below, which is the one
 * line this entire module exists to enforce correctly and consistently,
 * everywhere, instead of leaving each route to reimplement it.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSocialWorkspaceScope, type SocialWorkspaceScope } from './socialWorkspaceScope'
import type { SocialWorkspaceRole } from '@/src/types/social'

export const ACTIVE_WORKSPACE_COOKIE = 'n4n_active_social_workspace'

/** 180 days — purely a "remember my last choice" convenience; carries no
 * authorization weight of its own (see module doc comment above). */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

export interface ActiveWorkspaceContext {
  scope: SocialWorkspaceScope
  workspaceId: string
  /** This admin's actual workspace_role for workspaceId — derived from
   * scope's own membership sets, never re-queried, so it can never drift
   * from the membership check that already gated workspaceId itself. */
  role: SocialWorkspaceRole
}

export type ActiveWorkspaceResult =
  | { ok: true; context: ActiveWorkspaceContext }
  | {
      ok: false
      /** 'no_access' — missing social:read_own entirely (shouldn't reach
       * Personal Brand routes at all; permission check runs first).
       * 'no_workspace' — zero memberships anywhere; the UI must offer
       * "Create your Social Workspace", never pick one that doesn't
       * exist. 'workspace_not_selected' — one or more memberships exist,
       * but either no cookie, or the cookie no longer names a workspace
       * this admin belongs to (switched out, removed, or simply never
       * chosen yet) — resolved automatically ONLY when exactly one
       * membership exists (see resolveActiveWorkspaceId); with two or
       * more, this is the explicit "no silent default" case the UI must
       * surface as a workspace picker. */
      reason: 'no_access' | 'no_workspace' | 'workspace_not_selected'
    }

function roleForWorkspace(scope: SocialWorkspaceScope, workspaceId: string): SocialWorkspaceRole {
  if (scope.ownerWorkspaceIds.includes(workspaceId)) return 'owner'
  if (scope.writableWorkspaceIds.includes(workspaceId)) return 'manager'
  return 'analyst'
}

/**
 * The one function every Social Media / Personal Brand route and page
 * should call instead of reading scope.memberWorkspaceIds /
 * scope.writableWorkspaceIds / resolveDefaultWritableWorkspaceId
 * directly — it is what makes "switch workspace → the whole Social Media
 * area switches context" true everywhere at once, and what stops two
 * workspaces' content from ever being merged into one response again.
 */
export async function getActiveWorkspaceContext(): Promise<ActiveWorkspaceResult> {
  const scope = await getSocialWorkspaceScope()
  if (!scope) return { ok: false, reason: 'no_access' }
  if (scope.memberWorkspaceIds.length === 0) return { ok: false, reason: 'no_workspace' }

  const cookieWorkspaceId = cookies().get(ACTIVE_WORKSPACE_COOKIE)?.value || null

  let workspaceId: string | null = null
  if (cookieWorkspaceId && scope.memberWorkspaceIds.includes(cookieWorkspaceId)) {
    workspaceId = cookieWorkspaceId
  } else if (scope.memberWorkspaceIds.length === 1) {
    // The one genuinely unambiguous case — never applies once a second
    // membership exists, even if the cookie is simply missing.
    workspaceId = scope.memberWorkspaceIds[0]
  }

  if (!workspaceId) return { ok: false, reason: 'workspace_not_selected' }

  return { ok: true, context: { scope, workspaceId, role: roleForWorkspace(scope, workspaceId) } }
}

/** Route Handlers only (cookies().set throws from a Server Component
 * render) — call after independently verifying the admin actually has a
 * membership row for workspaceId; this function itself does not check. */
export function setActiveWorkspaceCookie(workspaceId: string): void {
  cookies().set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

/** Shared "no active workspace" → HTTP response mapping, so every route
 * under /api/admin/personal-brand and /api/admin/social reports the same
 * status/message for the same reason instead of re-deciding it 15 times.
 * In normal use the PersonalBrandLayout gate means a request only ever
 * reaches these routes once a workspace is genuinely active — this is
 * defense-in-depth for a direct API call, a race during a switch, or a
 * revoked membership mid-session. */
export function activeWorkspaceErrorResponse(reason: 'no_access' | 'no_workspace' | 'workspace_not_selected'): NextResponse {
  if (reason === 'no_access') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (reason === 'no_workspace') {
    return NextResponse.json({ error: 'Create a Social Workspace before continuing', code: reason }, { status: 400 })
  }
  return NextResponse.json({ error: 'Select an active Social Workspace before continuing', code: reason }, { status: 400 })
}

/** Can this role create/edit/delete content & automations, and
 * connect/reconnect/disconnect the workspace's Instagram account —
 * mirrors canWriteWorkspace's owner/manager boundary, just against an
 * already-resolved single role instead of a workspace-id set. */
export function roleCanWrite(role: SocialWorkspaceRole): boolean {
  return role === 'owner' || role === 'manager'
}
