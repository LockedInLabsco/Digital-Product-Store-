/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'share.google' },
      { hostname: 'drive.google.com' },
      { hostname: 'qiwmdgyrdhbnbxtzvfkj.supabase.co' },
    ],
  },
}

module.exports = nextConfig
