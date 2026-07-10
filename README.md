# Digital Product Store MVP

A clean, minimal digital products e-commerce store built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🛍️ Product catalog with detailed product pages
- 🖼️ Product preview gallery with thumbnail selection
- 💳 Paddle checkout for paid products
- 📧 Email delivery with Resend
- 📊 Admin dashboard for product management
- 🗄️ Product and download data with Supabase
- 📱 Mobile-first responsive design
- ♿ Clean and accessible UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Payments**: Paddle
- **Email**: Resend
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── products/          # Products listing
│   │   └── [slug]/        # Product detail page
│   ├── download/[token]/  # Download page
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # Reusable React components
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── ProductCard.tsx
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/                   # Utility functions
│   ├── products.ts        # Product data & helpers
│   ├── utils.ts           # Common utilities
│   ├── supabase/          # Database utilities (WIP)
│   ├── email/             # Email utilities (WIP)
│   ├── paddle.ts          # Paddle webhook utilities
│   └── lemonsqueezy.ts    # Legacy placeholder utilities
└── types/                 # TypeScript type definitions
    ├── product.ts
    └── order.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Design System

### Colors
- Background: White
- Text: Black
- Borders: Soft gray (#e5e5e0)
- Accents: Black

### Typography
- Large, readable text for easy understanding
- Mobile-first responsive design
- Clean, minimal aesthetic

## Next Steps

1. **Add products** - Use the admin dashboard to manage Supabase products
2. **Configure Paddle** - Add sandbox or production Paddle credentials
3. **Configure Resend** - Verify email delivery for free and paid downloads
4. **Deploy to Vercel** - Host your store

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
FROM_EMAIL=hello@not4normal.store

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
ADMIN_PASSWORD=

# Paddle
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
```

## License

MIT

## Support

For questions or issues, please open a GitHub issue.
