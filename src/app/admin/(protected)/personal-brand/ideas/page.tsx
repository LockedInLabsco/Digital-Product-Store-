import RequirePermission from '@/src/components/admin/RequirePermission'
import IdeasClient from './IdeasClient'

export default function PersonalBrandIdeasPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <IdeasClient />
    </RequirePermission>
  )
}
