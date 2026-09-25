import RequirePermission from '@/src/components/admin/RequirePermission'
import ContentDetailClient from './ContentDetailClient'

export default function PersonalBrandContentDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequirePermission permission="personal_brand:read">
      <ContentDetailClient contentId={params.id} />
    </RequirePermission>
  )
}
