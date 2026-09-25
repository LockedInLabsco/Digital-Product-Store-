import RequirePermission from '@/src/components/admin/RequirePermission'
import ContentLibraryClient from './ContentLibraryClient'

export default function PersonalBrandContentPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <ContentLibraryClient />
    </RequirePermission>
  )
}
