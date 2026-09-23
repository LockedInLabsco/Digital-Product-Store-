import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import PublicWaitlistForm from '@/src/components/PublicWaitlistForm'
import TrackMount from '@/src/components/analytics/TrackMount'
import StandaloneWaitlistPage from '@/src/components/waitlist/StandaloneWaitlistPage'
import { getPublicWaitlistBySlug } from '@/src/lib/supabase/waitlists'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'
import { supabaseServer } from '@/src/lib/supabase/server'
import { isAdminSession } from '@/src/lib/admin/auth'
import { normalizeSource } from '@/src/lib/waitlist/validate'
import { isStandaloneLayout, resolveWaitlistTheme } from '@/src/lib/waitlist/theme'
import { SLOWDAY_EYEBROW, SLOWDAY_FEATURES, SLOWDAY_WAITLIST_SLUG } from '@/src/lib/waitlist/slowdayContent'
import type { Waitlist } from '@/src/types/waitlist'

interface WaitlistPageProps {
  params: { slug: string }
  searchParams: { source?: string; preview?: string }
}

const DEFAULT_HEADLINE = "You're early."
const DEFAULT_SUPPORTING_TEXT = 'Join the waitlist to get early access and follow along as this gets built.'
const DEFAULT_BUTTON_TEXT = 'Join the waitlist'

/**
 * Admin-only draft preview: a draft waitlist is invisible to the public
 * anon-key query (RLS filters it out), so this is the "safe preview
 * mode" — only reachable with ?preview=1 AND a valid admin session
 * cookie, fetched with the service-role client which bypasses RLS.
 */
async function getPreviewWaitlist(slug: string): Promise<Waitlist | undefined> {
  const cookieStore = cookies()
  if (!isAdminSession(cookieStore)) return undefined

  const { data } = await supabaseServer.from('waitlists').select('*').eq('slug', slug).maybeSingle()
  return (data as Waitlist) || undefined
}

async function resolveWaitlist(slug: string, isPreview: boolean) {
  const { waitlist, error } = await getPublicWaitlistBySlug(slug)
  if (waitlist || error) return { waitlist, error, isDraftPreview: false }

  if (isPreview) {
    const previewWaitlist = await getPreviewWaitlist(slug)
    if (previewWaitlist) {
      return { waitlist: previewWaitlist, error: false, isDraftPreview: previewWaitlist.status === 'draft' }
    }
  }

  return { waitlist: undefined, error: false, isDraftPreview: false }
}

export async function generateMetadata({ params }: WaitlistPageProps): Promise<Metadata> {
  const { waitlist } = await getPublicWaitlistBySlug(decodeURIComponent(params.slug))

  if (!waitlist) {
    return { title: 'Waitlist not found' }
  }

  return {
    title: `${waitlist.name} — Waitlist`,
    description: waitlist.description || waitlist.supporting_text || undefined,
  }
}

export default async function WaitlistPage({ params, searchParams }: WaitlistPageProps) {
  const slug = decodeURIComponent(params.slug)
  const isPreview = searchParams.preview === '1'
  const { waitlist, error, isDraftPreview } = await resolveWaitlist(slug, isPreview)
  const media = await getWebsiteMedia()
  const source = normalizeSource(searchParams.source, 'waitlist_page')
  // An admin browsing/previewing their own waitlist should never count
  // as public traffic in per-waitlist analytics (see waitlist_page_viewed
  // below) — checked directly off the session cookie rather than just
  // isDraftPreview, since that only covers the draft-status case.
  const isAdminViewer = isAdminSession(cookies())
  const shouldTrackPageView = Boolean(waitlist) && !isAdminViewer

  if (!waitlist) {
    return (
      <>
        <Navbar media={media} />
        <main className="flex min-h-[60vh] items-center bg-ink">
          <Container className="max-w-2xl text-center">
            <p className="eyebrow text-gold">{error ? 'Connection interrupted' : '404 / Waitlist'}</p>
            <h1 className="mt-4 font-serif text-4xl text-cream sm:text-5xl">
              {error ? 'Temporarily unavailable.' : 'This waitlist is not here.'}
            </h1>
            <p className="mt-4 text-cream/60">
              {error
                ? 'We could not load this waitlist. Please try again in a little while.'
                : 'The waitlist does not exist or is not open yet.'}
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-sm bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold-hover"
            >
              Back home
            </Link>
          </Container>
        </main>
        <Footer media={media} />
      </>
    )
  }

  const theme = resolveWaitlistTheme(waitlist.theme_config)

  // Standalone waitlists (SlowDay today; any future waitlist can opt in
  // the same way from the admin Theme section) get their own dedicated
  // page instead of the generic NOT4NORMAL-chrome layout below — see
  // StandaloneWaitlistPage's doc comment.
  if (isStandaloneLayout(waitlist.theme_config)) {
    return (
      <>
        {shouldTrackPageView && <TrackMount event="waitlist_page_viewed" properties={{ waitlist_slug: waitlist.slug }} />}
        <StandaloneWaitlistPage waitlist={waitlist} theme={theme} source={source} isDraftPreview={isDraftPreview} />
      </>
    )
  }

  const headline = waitlist.headline || waitlist.name
  const supportingText = waitlist.supporting_text || waitlist.description || DEFAULT_SUPPORTING_TEXT
  const buttonText = waitlist.button_text || DEFAULT_BUTTON_TEXT
  const isSlowday = waitlist.slug === SLOWDAY_WAITLIST_SLUG
  const eyebrowText = isSlowday ? SLOWDAY_EYEBROW : DEFAULT_HEADLINE
  const headlineFontClass = isSlowday ? 'font-sans font-semibold' : 'font-serif'

  return (
    <>
      {shouldTrackPageView && <TrackMount event="waitlist_page_viewed" properties={{ waitlist_slug: waitlist.slug }} />}
      <Navbar media={media} />
      <main className="py-20 sm:py-24" style={{ backgroundColor: theme.background }}>
        {isDraftPreview && (
          <Container className="mx-auto mb-10 max-w-2xl">
            <div
              className="rounded-sm border p-4 text-center text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              Draft preview — this page is not publicly visible yet
            </div>
          </Container>
        )}

        {waitlist.status === 'draft' ? (
          <Container className="mx-auto max-w-2xl text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
              {eyebrowText}
            </p>
            <h1 className={`mt-4 ${headlineFontClass} text-3xl leading-snug sm:text-4xl`} style={{ color: theme.text }}>
              {headline}
            </h1>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed" style={{ color: theme.secondaryText }}>
              {supportingText}
            </p>
            <p
              className="mx-auto mt-8 max-w-md rounded-sm border px-4 py-3.5 text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.secondaryText }}
            >
              This waitlist isn&apos;t open to the public yet.
            </p>
          </Container>
        ) : waitlist.status === 'closed' ? (
          <Container className="mx-auto max-w-2xl text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
              {eyebrowText}
            </p>
            <h1 className={`mt-4 ${headlineFontClass} text-3xl leading-snug sm:text-4xl`} style={{ color: theme.text }}>
              {headline}
            </h1>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed" style={{ color: theme.secondaryText }}>
              {supportingText}
            </p>
            <p
              className="mx-auto mt-8 max-w-md rounded-sm border px-4 py-3.5 text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.secondaryText }}
            >
              This waitlist is currently closed.
            </p>
          </Container>
        ) : (
          <PublicWaitlistForm
            waitlistSlug={waitlist.slug}
            eyebrow={eyebrowText}
            headline={headline}
            supportingText={supportingText}
            buttonText={buttonText}
            source={source}
            theme={theme}
            features={isSlowday ? SLOWDAY_FEATURES : undefined}
            headlineFont={isSlowday ? 'sans' : 'serif'}
            panel={isSlowday}
          />
        )}
      </main>
      <Footer media={media} />
    </>
  )
}
