import RequirePermission from '@/src/components/admin/RequirePermission'
import PlannerClient from './PlannerClient'

export default function PersonalBrandPlannerPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <PlannerClient />
    </RequirePermission>
  )
}
