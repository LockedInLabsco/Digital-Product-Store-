import RequirePermission from '@/src/components/admin/RequirePermission'
import NewContentClient from './NewContentClient'

export default function NewPersonalBrandContentPage() {
  return (
    <RequirePermission permission="personal_brand:write">
      <NewContentClient />
    </RequirePermission>
  )
}
