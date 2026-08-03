# Analytics setup

Not4Normal's analytics dashboard (`/admin/analytics`) combines two data
sources:

- **PostHog** — visitor behavior: pageviews, sessions, traffic sources,
  device/browser, session replay, on-site engagement.
- **Supabase + Paddle** — confirmed business data: free downloads, paid
  purchases, revenue, customers. This is the source of truth for money;
  PostHog is never used to calculate revenue.

The site works normally with no PostHog configuration at all — analytics
becomes a safe no-op, and the dashboard shows Supabase/Paddle business
metrics with PostHog-dependent cards marked "Not configured."

## 1. Create/connect a PostHog project

1. Sign up or log in at [posthog.com](https://posthog.com) (or use a
   self-hosted instance).
2. Create a project for Not4Normal. Note its **region** (US or EU) — this
   determines the host URL below.
3. In Project Settings, copy the **Project API Key** (starts with `phc_`)
   — this is `NEXT_PUBLIC_POSTHOG_KEY`.
4. In Project Settings, copy the **Project ID** (a number) — this is
   `POSTHOG_PROJECT_ID`.
5. Under your account's **Personal API Keys** (Settings → Personal API
   Keys — this is per-user, not per-project), create a new key with
   these **exact scopes** (confirmed against a live project — see
   "Troubleshooting" below for what happens if you miss one):
   - **`query:read`** — required for every visitor/session/pageview/
     traffic-source/engagement metric (uses the HogQL Query API)
   - **`session_recording:read`** — required for the session replay list
   This is `POSTHOG_PERSONAL_API_KEY`. **Never put this key in a
   `NEXT_PUBLIC_*` variable** — it must stay server-only, which is why
   every PostHog query in this codebase runs
   from `src/lib/analytics/posthogServer.ts`, guarded by the
   `server-only` package so it can never end up in a browser bundle.

## 2. Environment variables

Add to `.env.local` for local development, and to your Vercel project's
Environment Variables for production/preview:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Local + Vercel | Public project key, safe in the browser |
| `NEXT_PUBLIC_POSTHOG_HOST` | Local + Vercel | `https://us.i.posthog.com` or `https://eu.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | Local + Vercel | **Server only.** Used by the admin dashboard to query PostHog |
| `POSTHOG_PROJECT_ID` | Local + Vercel | Server only |

See `.env.example` for the exact variable names (placeholders only —
never commit real keys).

## 3. Enable session replay

In your PostHog project: **Settings → Recordings** → enable session
recording. This codebase already configures the recorder (in
`src/lib/analytics/posthogClient.ts`) to:

- Mask every input's value by default (`maskAllInputs: true`) — covers
  password/email/personal-info fields without needing an allowlist.
- Never record `/admin/*` pages (enforced both by never initializing
  PostHog there and via a `before_send` guard as defense in depth).
- Never see payment details — Paddle Checkout runs inside Paddle's own
  cross-origin hosted overlay, which a same-page recorder cannot read.

Session replay (like all analytics) only starts after a visitor accepts
the consent banner.

## 4. Verify events are being received

1. Set the four env vars above and restart `npm run dev`.
2. Visit the site and click **Accept analytics** on the consent banner.
3. In PostHog, go to **Activity → Events** (or **Live events**) and
   confirm `$pageview`, `homepage_viewed`, etc. appear within a few
   seconds.
4. Click around (nav links, a product card) and confirm
   `navigation_clicked` / `product_card_clicked` show up with their
   properties populated.

If nothing appears: check the browser console for `[analytics]`
warnings, and confirm `NEXT_PUBLIC_POSTHOG_KEY` is actually present in
the built/served page (it must be set at build time for Vercel, since
`NEXT_PUBLIC_*` vars are inlined at build).

### Troubleshooting: dashboard shows "Not configured" even though events arrive in PostHog

Client-side tracking (`NEXT_PUBLIC_POSTHOG_KEY`) and the admin
dashboard's server-side queries (`POSTHOG_PERSONAL_API_KEY` +
`POSTHOG_PROJECT_ID`) are two entirely separate integrations — events
arriving in PostHog's Activity feed only proves the first one works.

If the dashboard still shows "Not configured" or "Unavailable":

1. **Check which one it is.** The dashboard now distinguishes them: a
   grey "Not configured" card means `POSTHOG_PERSONAL_API_KEY` or
   `POSTHOG_PROJECT_ID` isn't set at all. A red "PostHog is configured,
   but the query failed" banner with an actual error message means the
   env vars are present but the request itself failed — read that
   message, it's PostHog's real error text, not a workaround guess.
2. **Check the server logs** for lines starting with `[PostHog]` — every
   failed request logs the HTTP status and PostHog's exact error detail,
   plus a specific hint for 401 (bad/revoked key), 403 permission_denied
   (missing scope), and 404 (wrong project ID) cases.
3. **Most common cause: the Personal API Key is missing the `query:read`
   scope.** This happened during development of this feature — the key
   worked fine for session replays (which only needs
   `session_recording:read`) but every visitor/session/pageview metric
   failed with `403 permission_denied: API key missing required scope
   'query:read'`. Fix: PostHog → Settings → Personal API Keys → edit the
   key → add the `query:read` scope → save. No restart or redeploy
   needed — the next dashboard refresh picks it up immediately.
4. **404 on every query** usually means `POSTHOG_PROJECT_ID` doesn't
   match the project the key belongs to (personal API keys are scoped
   per-organization, but the project ID must still be one you have
   access to).

## 5. Test UTM attribution

Visit:

```
https://not4normal.store/?utm_source=instagram&utm_medium=social&utm_campaign=test_campaign&utm_content=test_reel
```

(swap in your local URL when testing locally, e.g.
`http://localhost:3000/?utm_source=instagram&utm_medium=social&utm_campaign=test_campaign&utm_content=test_reel`)

Then in the browser devtools → Application → Cookies, confirm
`n4n_first_touch` and `n4n_last_touch` are set with that source/medium/
campaign. Reload the homepage without UTM params — the cookies should
**not** change (first-touch is permanent for 90 days; last-touch only
updates when a *new* UTM/referrer signal is present).

## 6. Test free-download attribution

1. Visit a free product page with UTM params in the URL (as above).
2. Submit the free-download email form.
3. In Supabase, check the `free_downloads` table — the new row should
   have `last_touch_source = 'instagram'`, `last_touch_medium = 'social'`,
   etc., alongside `download_status` and `email_delivery_status`.

## 7. Test Paddle purchase attribution

1. Visit a paid product page with UTM params in the URL.
2. Open Paddle sandbox checkout and complete a test purchase.
3. Confirm the Paddle webhook fires (check your server/function logs for
   `[Paddle Webhook]` entries) and that the `orders` row created has the
   same `last_touch_source`/`last_touch_medium`/`last_touch_campaign`
   columns populated (read from Paddle's `custom_data.attribution`,
   which the checkout button attaches — see
   `src/components/PaidProductButton.tsx`).
4. Revenue in `/admin/analytics` should only ever come from this
   webhook-confirmed `orders` table, never from the client-side
   `purchase_completed` PostHog event (that event is a behavioral signal
   only, for funnel visibility).

## 8. Apply the Supabase migration

Two migrations are relevant here (see the exact SQL each prints):

- `supabase/migrations/0003_analytics.sql` — adds attribution columns to
  `orders` and creates the `free_downloads` table. **Run this before
  using the analytics dashboard** — without it, the dashboard's business
  queries will fail against missing columns/table.

Run it in the Supabase SQL Editor for your project, or via the Supabase
CLI (`supabase db push` / `psql` against your connection string) if you
use migration tooling. This has **not** been applied to any live project
by this implementation — you need to run it yourself.

## 9. How the admin dashboard gets its data

- `/admin/analytics` (client component) fetches from six routes under
  `/api/admin/analytics/*` (overview, traffic, products, revenue,
  engagement, session-replays), each protected by the existing
  `isAdminRequest()` cookie check — the same server-side auth used by
  every other admin route.
- Each route combines: a Supabase query (via
  `src/lib/analytics/businessAnalytics.ts`, using the service-role
  client, for confirmed downloads/purchases/revenue) and, where
  applicable, a PostHog HogQL query (via
  `src/lib/analytics/posthogServer.ts`, using
  `POSTHOG_PERSONAL_API_KEY` server-side only) for visitor behavior.
- If PostHog isn't configured, those routes still return the Supabase
  data with `postHogConfigured: false`, and the dashboard shows "Not
  configured" on the affected cards/tables instead of failing.

## Known limitations

- The `/api/projects/:id/query/` and `/api/projects/:id/session_recordings/`
  endpoints and request shapes in `posthogServer.ts` have been verified
  against a live PostHog Cloud project (both respond correctly once the
  Personal API Key has the right scope — see the Troubleshooting section
  above). The exact HogQL property names (`$session_id`, `$pathname`,
  `product_slug`, etc.) match what this site's own events actually send,
  but if you later change event/property names in `lib/analytics/events.ts`,
  update the corresponding queries in `posthogServer.ts` to match.
- "Exit pages" is approximated from `$pageleave` event counts per path,
  not a true last-page-of-session calculation (which needs session-level
  ordering).
- `country_code` on orders/free_downloads is defined in the schema but
  not currently populated — there's no IP-geolocation source wired up.
  Left as a documented gap rather than guessed at.
- The newsletter signup form is intentionally non-functional ("Coming
  soon"), so `email_signup_completed` is defined in the typed event map
  but not fired anywhere yet.
