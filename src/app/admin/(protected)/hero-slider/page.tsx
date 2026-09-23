import RequirePermission from '@/src/components/admin/RequirePermission'
import HeroSliderClient from './HeroSliderClient'

export default function AdminHeroSliderPage() {
  return (
    <RequirePermission permission="hero_slider:read">
      <HeroSliderClient />
    </RequirePermission>
  )
}
