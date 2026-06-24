# Digital Product Store MVP

A clean, minimal digital products e-commerce store built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🛍️ Product catalog with detailed product pages
- 🖼️ Product preview gallery with thumbnail selection
- 💳 Checkout functionality (Lemon Squeezy integration - coming soon)
- 📧 Email delivery (Resend integration - coming soon)
- 📊 Admin dashboard (coming soon)
- 🗄️ Database integration (Supabase - coming soon)
- 📱 Mobile-first responsive design
- ♿ Clean and accessible UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (planned)
- **Payments**: Lemon Squeezy (planned)
- **Email**: Resend (planned)
- **Deployment**: Vercel (planned)

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
│   └── lemonsqueezy.ts    # Payment utilities (WIP)
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

1. **Add products** - Update `src/lib/products.ts` with your own products
2. **Integrate Lemon Squeezy** - Set up payment processing
3. **Integrate Supabase** - Set up database for orders
4. **Integrate Resend** - Set up email delivery
5. **Create admin panel** - Build order and product management
6. **Deploy to Vercel** - Host your store

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase (when integrated)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Lemon Squeezy (when integrated)
LEMON_SQUEEZY_API_KEY=

# Resend (when integrated)
RESEND_API_KEY=
```

## License

MIT

## Support

For questions or issues, please open a GitHub issue.
