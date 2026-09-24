import RequirePermission from '@/src/components/admin/RequirePermission'
import AccountClient from './AccountClient'

export default function AdminAccountPage() {
  return (
    <RequirePermission permission="dashboard:read">
      <AccountClient />
    </RequirePermission>
  )
}
