# Instagram DM automation setup

`/admin/personal-brand/automations` lets you create rules like:

- **Comment keyword** — someone comments "LINK" on a post → they get an
  automatic Private Reply DM. Optionally scoped to one specific post/reel
  (pick it from your synced Instagram media in the rule form) instead of
  firing on that keyword anywhere on the account. Can also optionally
  post a **public reply on the comment itself** (e.g. "Check your DMs
  👀") alongside the private DM — up to 3 variations, rotated between so
  the same line isn't always used. A public-reply failure never blocks
  the private DM; the two are sent and recorded independently (see
  "Recent activity" on the Automations page for which variation was used
  and whether it failed).
- **DM keyword** — someone DMs you a keyword directly → auto-reply.
- **Story reply** — someone replies to your Story → auto-reply.

Each rule can also have an ordered **follow-up sequence** (e.g. "24
hours later, send this reminder"), and either the initial reply or any
follow-up step can attach a tappable **button** (e.g. "Click me") that
opens a link, instead of pasting a raw URL into the message text — set
both a Button URL and Button label to enable it (max 20 characters for
the label, and the message must be 640 characters or fewer once a
button is attached — both are Meta's own hard limits on this message
type, not house rules). This replaces the free tier of a
third-party tool (Superprofile, ManyChat, etc.) with the same official
mechanism those tools themselves sit on top of — Meta's Instagram
Messaging API and Private Replies.

This builds on the read-only sync in `docs/INSTAGRAM_SYNC_SETUP.md` —
do that first if you haven't. Everything below uses the same Meta app,
but a **separate token** — see the next section for why.

## 0. Two different Meta products, two different tokens

`INSTAGRAM_ACCESS_TOKEN` (from the sync setup) is a **Facebook Login for
Business** token — it only works against `graph.facebook.com`, and only
has the read scopes (`instagram_basic`, `instagram_manage_insights`,
`pages_show_list`, `pages_read_engagement`). Outbound messaging
(private replies, DMs, follow-ups) is a **completely separate Meta
product** — the **Instagram API with Instagram Login** — which lives at
`graph.instagram.com` and needs its own token with its own
`instagram_business_*` permission namespace. The two are not
interchangeable: calling `graph.instagram.com` with a Facebook Login
token (or vice versa) fails with Graph API error
`(#3) Application does not have the capability to make this API call.`
— this is a real bug this project hit and fixed; see
[[instagram-messaging-permission-mixup]] in memory if this recurs.

`src/lib/instagram/client.ts` keeps the two hard-separated: content sync
uses `INSTAGRAM_ACCESS_TOKEN` against `graph.facebook.com`; every
outbound send (`sendPrivateReplyToComment`, `sendDirectMessage`,
`replyToComment`) uses `INSTAGRAM_MESSAGING_ACCESS_TOKEN` against
`graph.instagram.com`, addressing the literal id `me` rather than
`INSTAGRAM_BUSINESS_ACCOUNT_ID` (that id is specific to the Facebook
Login flow and isn't guaranteed to match under Instagram Login).
`replyToComment` (public comment replies) uses a different endpoint from
`sendPrivateReplyToComment` (`/{comment_id}/replies` vs `/me/messages`)
but the same token — `instagram_business_manage_comments`, already in
step 1's permission list, covers both.

## 1. Generate the Instagram Login messaging token

App Dashboard → your Instagram product → **API setup with Instagram
login** → generate an Instagram User access token with:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

This is `INSTAGRAM_MESSAGING_ACCESS_TOKEN` — a different value from
`INSTAGRAM_ACCESS_TOKEN`, generated from a different screen in the
dashboard. Do not paste the Facebook Login token here; do not reuse this
token as `INSTAGRAM_ACCESS_TOKEN` either. Same rule as before: since
this app only ever touches your own account, it stays on **Standard
Access** — no App Review needed for testing against your own
tester/admin account (see "If Private Replies fail for real users" under
How to debug below for what Standard Access does and doesn't cover).

## 2. Get your Meta app secret

App Dashboard → **Settings → Basic** → copy **App Secret** (click
"Show", it may ask you to re-enter your password). This is
`INSTAGRAM_APP_SECRET`.

## 3. Make up two secrets of your own

- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` — any random string, e.g. generate one
  with `openssl rand -hex 16`. You'll enter this exact value in Meta's
  webhook setup in step 5.
- `CRON_SECRET` — another random string, used to protect
  `/api/cron/instagram-followups` from being called by randoms.

## 4. Deploy first

The webhook needs a real, public HTTPS URL — it cannot be tested against
`localhost`. Get this deployed to Vercel with all the env vars below set
(Settings → Environment Variables) before doing step 5.

```
INSTAGRAM_ACCESS_TOKEN=           (already set from the sync setup — content sync only)
INSTAGRAM_BUSINESS_ACCOUNT_ID=    (already set from the sync setup — content sync only)
INSTAGRAM_MESSAGING_ACCESS_TOKEN= (new — from step 1 above, messaging only)
INSTAGRAM_APP_SECRET=
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=
CRON_SECRET=
```

## 5. Register the webhook in the Meta app

App Dashboard → your Instagram product → **Webhooks** (or **Configuration**
under Instagram) →

- **Callback URL:** `https://<your-domain>/api/webhooks/instagram`
- **Verify token:** the exact `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` value from step 3
- **Subscribe to:** `comments` and `messages` (Meta calls the URL once
  automatically to verify it — this only succeeds once the app is
  actually deployed with the right env vars)

## 6. Set up the follow-up scheduler

Follow-up steps ("send this 24h later") aren't triggered by a webhook —
nothing happens until something checks whether one is due. Vercel's own
Cron on the free Hobby plan only runs once a day, too coarse for
hour-scale delays, so instead:

1. Sign up free at [cron-job.org](https://cron-job.org) (or any similar
   service).
2. Create a job that sends a `GET` request every 15-30 minutes to:
   `https://<your-domain>/api/cron/instagram-followups`
   with header `Authorization: Bearer <CRON_SECRET>` (the value from step 3).

(If you're on Vercel Pro, a `vercel.json` cron entry hitting the same
URL on a tighter schedule works too — not set up here since it assumes
a paid plan.)

## Real limits to know

- **One automated DM per comment**, and it must be sent within **7 days**
  of the comment (Meta's Private Reply rule) — not an issue in practice
  since this fires within seconds of the comment.
- **750 DMs/hour** cap per account.
- **The 24-hour messaging window**: once someone messages you, you can
  freely reply for 24 hours from their last message. A follow-up step
  scheduled further out than that (e.g. "3 days later") will likely
  **fail to send** — Meta doesn't allow marketing-style follow-ups
  outside that window without special message tags that don't fit this
  use case. Keep follow-up delays short (a few hours) for reliable
  delivery. A failed send is recorded on the run (visible in the
  "Recent activity" table on the Automations page) rather than retried.

## 7. Automatic token renewal (no more manual re-pasting every ~60 days)

`INSTAGRAM_MESSAGING_ACCESS_TOKEN` from step 1 only seeds the system
once. From then on, the real token lives encrypted in the
`instagram_integration_credentials` table (migration
`0023_instagram_token_store.sql`) and is kept alive automatically by
`src/lib/instagram/tokenStore.ts` — see that file for the full lifecycle
logic. In short:

- The **first** outbound send (or the token-refresh cron below) copies
  the env var token into the database, trying Meta's refresh/exchange
  endpoints to confirm and store it as long-lived (~60 days) up front.
- **`/api/cron/instagram-token-refresh`**, pinged once a day by the same
  external scheduler as `instagram-followups` (same `CRON_SECRET`
  bearer auth), refreshes the stored token whenever it's within 10 days
  of expiry using Meta's `ig_refresh_token` grant — no login, no manual
  step.
- Add one more job at [cron-job.org](https://cron-job.org) (or reuse the
  existing one, just at a daily interval instead of every 15-30 min):
  `GET https://<your-domain>/api/cron/instagram-token-refresh` with
  header `Authorization: Bearer <CRON_SECRET>`.
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY` (a base64 32-byte key, e.g. from
  `openssl rand -base64 32`) encrypts the stored token at rest. Without
  it, the bootstrap step is skipped and messaging just keeps reading
  `INSTAGRAM_MESSAGING_ACCESS_TOKEN` directly (the old behavior) — set it
  before relying on auto-refresh.
- A live status panel — connected/needs attention, last refreshed, token
  expiry, last refresh status, plus a manual "Refresh token" button — is
  on `/admin/personal-brand/automations`. If the stored token ever
  becomes unrecoverable (refresh keeps failing and it's actually
  expired), the panel shows "Reconnect Instagram": generate a fresh token
  as in step 1, update `INSTAGRAM_MESSAGING_ACCESS_TOKEN` in Vercel,
  redeploy, then click Reconnect.
- If refresh fails, the previously stored (still-valid) token keeps
  being used for sends — a failed refresh never deletes or blocks the
  current token, it only gets recorded and retried the next day.

## How to debug

Every trigger (matched or not) that actually reaches `processTrigger`
is recorded in `ig_automation_runs`, visible in the "Recent activity"
table on `/admin/personal-brand/automations`. If nothing shows up at
all when you comment/DM as a test:

1. Check the webhook is actually subscribed (Meta app → Webhooks → should
   show a recent delivery, success or failure).
2. Check Vercel's function logs for `/api/webhooks/instagram` —
   signature failures and rule-fetch errors are logged there.
3. Confirm the rule is `is_active: true` and the keyword actually
   appears in what you typed (comment keyword matching is case-insensitive
   substring by default).
4. If a run's `last_error` shows `(#3) Application does not have the
   capability to make this API call`, that's the two-token mixup above —
   check `INSTAGRAM_MESSAGING_ACCESS_TOKEN` is actually set (not blank,
   not a copy of `INSTAGRAM_ACCESS_TOKEN`) and was generated from **API
   setup with Instagram login** with the `instagram_business_*`
   permissions in step 1, not from Graph API Explorer.
5. If Private Replies fail only for people who aren't your own
   admins/testers on the app, that's Standard Access's real limit for
   `instagram_business_manage_messages` — it only sends to people with a
   role on the app itself. Messaging real (non-tester) users needs
   Advanced Access for that permission via App Review.
