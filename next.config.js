/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'share.google' },
      { hostname: 'drive.google.com' },
      { hostname: 'qiwmdgyrdhbnbxtzvfkj.supabase.co' },
    ],
  },
  async redirects() {
    return [
      // SlowDay's waitlist slug moved from the old seeded name to
      // /waitlist/slowday (see supabase/migrations/0011_slowday_slug_rename.sql) —
      // keeps any already-shared link (Instagram bio, old posts) working.
      {
        source: '/waitlist/phone-control-app',
        destination: '/waitlist/slowday',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
