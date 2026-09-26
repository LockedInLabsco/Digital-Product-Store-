# Instagram sync setup

The Personal Brand Content OS (`/admin/personal-brand/content`) has a
**"Sync from Instagram"** button that pulls views/likes/comments/saves/
reach for every posted Instagram item and saves them as a metrics
snapshot — the same shape you'd get from filling out the manual snapshot
form, just automated. It only ever runs when you click the button —
never on a schedule, never in the background.

The site works normally with no Instagram configuration at all — the
button just returns "Instagram is not connected" instead of erroring.

## 1. Make the Instagram account a Business or Creator account

Instagram app → profile → **Settings and privacy → Account type and
tools → Switch to professional account** (choose Creator).

## 2. Link it to a Facebook Page

Instagram app → profile → **Edit profile → Page** (under Profile
information) → **Connect or create**. Log in with the Facebook account
that should manage this — it can create a bare Page on the spot if you
don't have one.

## 3. Create a Meta Developer app

1. Go to [developers.facebook.com](https://developers.facebook.com),
   logged in as the Facebook account from step 2.
2. **My Apps → Create App** → use case **"Other"** → type **"Business"**.
3. Inside the app, **Add Product → Instagram** and connect the Page from
   step 2 when prompted.

This account only ever accesses your own Instagram account, so it stays
on **Standard Access** — no Meta App Review, no Business Verification.
That's only required for an app that serves *other* people's accounts.

## 4. Get a long-lived access token

In the app's **Tools → Graph API Explorer** (or the token step inside
the Instagram product setup), generate a token for your Page/Instagram
account with these permissions:

- `instagram_basic`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

Tokens start short-lived (~1 hour) — use the "exchange for long-lived
token" step to get one that lasts ~60 days. This is `INSTAGRAM_ACCESS_TOKEN`.
You'll need to regenerate/exchange it again once it expires — this
integration doesn't auto-refresh it.

## 5. Get your Instagram Business Account ID

In Graph API Explorer:

1. Query `me/accounts` → note your Page's `id`.
2. Query `{page-id}?fields=instagram_business_account` → the numeric ID
   returned is `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

## 6. Environment variables

Add both to `.env.local` (and to Vercel → Settings → Environment
Variables for production):

```
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

## How matching works

The sync matches each posted content item to an Instagram post by
comparing `platform_url` against the post's permalink (normalized —
`www.` and trailing slashes are ignored, case-insensitive). A content
item only gets synced if it has `platform: instagram`, `status: posted`,
and a `platform_url` set. If a post doesn't match, the sync reports it
as unmatched rather than guessing — check that `platform_url` is the
exact Instagram link.

## Known limitation

Meta stopped reliably returning view counts from a single post's
`/insights` lookup in 2026; this integration reads `views` from the
account's media list endpoint instead, which is still supported. If
Meta changes this again, `src/lib/instagram/client.ts` is the only file
that needs updating — the API route and the sync button don't know or
care where the numbers come from.
