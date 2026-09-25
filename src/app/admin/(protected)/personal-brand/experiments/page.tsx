import RequirePermission from '@/src/components/admin/RequirePermission'
import ExperimentsClient from './ExperimentsClient'

export default function PersonalBrandExperimentsPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <ExperimentsClient />
    </RequirePermission>
  )
}
