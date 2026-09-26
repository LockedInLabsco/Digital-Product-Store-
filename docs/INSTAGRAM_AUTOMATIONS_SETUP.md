# Instagram DM automation setup

`/admin/personal-brand/automations` lets you create rules like:

- **Comment keyword** — someone comments "LINK" on a post → they get an
  automatic Private Reply DM.
- **DM keyword** — someone DMs you a keyword directly → auto-reply.
- **Story reply** — someone replies to your Story → auto-reply.

Each rule can also have an ordered **follow-up sequence** (e.g. "24
hours later, send this reminder"). This replaces the free tier of a
third-party tool (Superprofile, ManyChat, etc.) with the same official
mechanism those tools themselves sit on top of — Meta's Instagram
Messaging API and Private Replies.

This builds on the read-only sync in `docs/INSTAGRAM_SYNC_SETUP.md` —
do that first if you haven't. Everything below uses the same Meta app
and access token.

## 1. Add messaging permissions to your Meta app's token

In Graph API Explorer (or wherever you generated `INSTAGRAM_ACCESS_TOKEN`),
regenerate the token with these additional permissions:

- `instagram_manage_messages` (may show as `instagram_business_manage_messages`)
- `instagram_manage_comments`
- `pages_manage_metadata`

Same rule as before: since this app only ever touches your own account,
it stays on **Standard Access** — no App Review needed.

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
INSTAGRAM_ACCESS_TOKEN=        (already set from the sync setup)
INSTAGRAM_BUSINESS_ACCOUNT_ID= (already set from the sync setup)
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
