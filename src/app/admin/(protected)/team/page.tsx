import RequirePermission from '@/src/components/admin/RequirePermission'
import { getCurrentAdmin, hasPermission } from '@/src/lib/admin/auth'
import TeamClient from './TeamClient'

async function TeamPageContent() {
  const admin = await getCurrentAdmin()
  const canManage = hasPermission(admin, 'team:manage')

  return <TeamClient canManage={canManage} />
}

export default function AdminTeamPage() {
  return (
    <RequirePermission permission="team:read">
      <TeamPageContent />
    </RequirePermission>
  )
}
