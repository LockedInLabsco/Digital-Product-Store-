import Link from 'next/link'
import Container from '@/src/components/Container'
import RequirePermission from '@/src/components/admin/RequirePermission'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getWorkScope } from '@/src/lib/admin/workScope'
import WorkSubNav from './WorkSubNav'

/**
 * The Work section landing page — intentionally just an entry point with
 * a couple of simple counts, NOT the "My Day" daily-view engine from the
 * audit (that's a later phase: dynamic due-today/overdue aggregation,
 * recurring-task materialization, etc.). This only orients the admin and
 * links to Tasks/Teams.
 */
async function WorkOverview() {
  const scope = await getWorkScope()
  if (!scope) {
    return null // RequirePermission already handles the no-access case
  }

  const [openTasksResult, teamsResult] = await Promise.all([
    supabaseServer
      .from('wk_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', scope.adminUserId)
      .not('status', 'in', '(completed,cancelled)'),
    scope.seesAll || scope.managesAllTeams
      ? supabaseServer.from('wk_teams').select('*', { count: 'exact', head: true })
      : Promise.resolve({ count: scope.memberTeamIds.length }),
  ])

  const openTaskCount = openTasksResult.count ?? 0
  const teamCount = 'count' in teamsResult ? teamsResult.count ?? 0 : 0

  return (
    <Container className="py-12">
      <div className="max-w-4xl">
        <WorkSubNav />

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Work</h2>
          <p className="text-admin-muted">Internal team and task tracking for NOT4NORMAL.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link href="/admin/work/tasks">
            <div className="h-full rounded-lg border border-admin-border p-6 transition-all hover:shadow-md">
              <h3 className="mb-2 text-lg font-bold">Tasks</h3>
              <p className="mb-4 text-admin-muted">
                {openTaskCount} open task{openTaskCount === 1 ? '' : 's'} assigned to you
              </p>
              <span className="text-sm font-medium text-admin-text">View Tasks -&gt;</span>
            </div>
          </Link>

          <Link href="/admin/work/teams">
            <div className="h-full rounded-lg border border-admin-border p-6 transition-all hover:shadow-md">
              <h3 className="mb-2 text-lg font-bold">Teams</h3>
              <p className="mb-4 text-admin-muted">
                {teamCount} team{teamCount === 1 ? '' : 's'} {scope.seesAll || scope.managesAllTeams ? 'total' : 'you belong to'}
              </p>
              <span className="text-sm font-medium text-admin-text">View Teams -&gt;</span>
            </div>
          </Link>
        </div>
      </div>
    </Container>
  )
}

export default function WorkPage() {
  return (
    <RequirePermission permission="work:read_own">
      <WorkOverview />
    </RequirePermission>
  )
}
