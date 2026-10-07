import RequirePermission from '@/src/components/admin/RequirePermission'
import WorkspaceSettingsClient from './WorkspaceSettingsClient'

export default function WorkspaceSettingsPage() {
  return (
    <RequirePermission permission="personal_brand:read">
      <WorkspaceSettingsClient />
    </RequirePermission>
  )
}
