import RequirePermission from '@/src/components/admin/RequirePermission'
import AutomationsClient from './AutomationsClient'

export default function PersonalBrandAutomationsPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <AutomationsClient />
    </RequirePermission>
  )
}
