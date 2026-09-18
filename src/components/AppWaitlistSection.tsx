import PublicWaitlistForm from './PublicWaitlistForm'
import { resolveWaitlistTheme } from '@/src/lib/waitlist/theme'
import {
  SLOWDAY_BUTTON_TEXT,
  SLOWDAY_EYEBROW,
  SLOWDAY_FEATURES,
  SLOWDAY_HEADLINE,
  SLOWDAY_SUPPORTING_TEXT,
  SLOWDAY_WAITLIST_SLUG,
} from '@/src/lib/waitlist/slowdayContent'

const SLOWDAY_THEME = resolveWaitlistTheme({ preset: 'slowday' })

export default function AppWaitlistSection() {
  return (
    <section
      data-section-id="app_waitlist"
      className="py-20 sm:py-24"
      style={{ backgroundColor: SLOWDAY_THEME.background }}
    >
      <PublicWaitlistForm
        waitlistSlug={SLOWDAY_WAITLIST_SLUG}
        eyebrow={SLOWDAY_EYEBROW}
        headline={SLOWDAY_HEADLINE}
        supportingText={SLOWDAY_SUPPORTING_TEXT}
        buttonText={SLOWDAY_BUTTON_TEXT}
        source="homepage"
        theme={SLOWDAY_THEME}
        features={SLOWDAY_FEATURES}
        headlineFont="sans"
        panel
      />
    </section>
  )
}
