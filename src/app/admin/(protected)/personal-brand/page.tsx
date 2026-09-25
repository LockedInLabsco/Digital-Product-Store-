import RequirePermission from '@/src/components/admin/RequirePermission'
import DashboardClient from './DashboardClient'

export default function PersonalBrandDashboardPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <DashboardClient />
    </RequirePermission>
  )
}
