import PublicWaitlistForm from './PublicWaitlistForm'

const PHONE_APP_WAITLIST_SLUG = 'phone-control-app'

export default function AppWaitlistSection() {
  return (
    <section data-section-id="app_waitlist" className="bg-offwhite py-20 sm:py-24">
      <PublicWaitlistForm
        waitlistSlug={PHONE_APP_WAITLIST_SLUG}
        eyebrow="Building in public"
        headline="A better way to take back control of your phone."
        supportingText="I'm building a minimal Android app for screen-time control, app blocking, grayscale, focus, and smarter rewards. Join the waitlist to get early access and follow the build."
        buttonText="Join the waitlist"
        source="homepage"
      />
    </section>
  )
}
