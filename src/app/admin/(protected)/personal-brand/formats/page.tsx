import RequirePermission from '@/src/components/admin/RequirePermission'
import FormatsClient from './FormatsClient'

export default function PersonalBrandFormatsPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <FormatsClient />
    </RequirePermission>
  )
}
