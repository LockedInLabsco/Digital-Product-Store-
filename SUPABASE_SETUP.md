# Supabase Setup Guide

This guide explains how to set up Supabase for your digital products store.

## Prerequisites

- A Supabase account (free tier at https://supabase.com)
- Your Next.js app running locally

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Create a new project
4. Choose a database password (save this securely)
5. Select a region closest to you
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your Credentials

1. Go to your project settings
2. Click on "API" in the left sidebar
3. You'll see:
   - **Project URL** → Copy this (NEXT_PUBLIC_SUPABASE_URL)
   - **Anon public key** → Copy this (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **Service role secret** → Copy this (SUPABASE_SERVICE_ROLE_KEY)

## Step 3: Set Environment Variables

1. In your project root, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Save the file

## Step 4: Create the Products Table

1. In Supabase, go to the SQL Editor
2. Copy and paste this SQL:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  cover_image_url TEXT,
  file_path TEXT,
  lemon_squeezy_variant_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on slug for faster lookups
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
```

3. Click "Run" to create the table

## Step 5: Insert Your First Product

Run this SQL to insert the MVP product:

```sql
INSERT INTO products (
  title,
  slug,
  short_description,
  description,
  price,
  currency,
  is_active
) VALUES (
  'The Simple Habit Reset',
  'simple-habit-reset',
  'A tiny beginner-friendly guide to help you restart your habits one simple step at a time',
  'Most people fail at building habits because they try to change everything at once. This guide helps you restart with a different approach—one that is so simple, anyone can do it. No motivation hacks. No complicated systems. Just the essentials.',
  9,
  'USD',
  true
);
```

## Step 6: Enable Row Level Security (Optional but Recommended)

For security, enable RLS on your products table:

1. Go to the products table
2. Click the "RLS" button in the top right
3. Enable RLS
4. Create a policy that allows anyone to read active products:

```sql
CREATE POLICY "Allow public read access to active products"
  ON products FOR SELECT
  USING (is_active = true);
```

## Step 7: Test the Connection

1. Save your `.env.local` file
2. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

3. Check the console for any errors related to Supabase
4. Visit your products page - it should still show the MVP product

## Verifying It Works

- If you see your products loading: ✅ Supabase is connected!
- If you don't see any errors: ✅ Fallback is working!

## Next Steps

Once products are loading from Supabase, you can:

1. **Add more products** - Use the Supabase dashboard or insert via SQL
2. **Add product images** - Store images in Supabase Storage and reference them
3. **Connect Lemon Squeezy** - Add `lemon_squeezy_variant_id` to each product
4. **Build the admin panel** - Create forms to manage products directly

## Troubleshooting

### "Supabase environment variables are missing"

This warning is normal on first setup. Make sure you've:
1. Created `.env.local` with your credentials
2. Restarted your Next.js dev server
3. Double-checked that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### "Error fetching products from Supabase"

Check that:
1. The `products` table exists in your Supabase database
2. Your credentials are correct in `.env.local`
3. RLS policies allow public read access

### Products not showing

If products aren't displaying:
1. Open DevTools (F12) → Console tab
2. Look for error messages
3. Check that products in Supabase have `is_active = true`
4. Try refreshing the page

## Database Schema Reference

The `products` table has these columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `title` | TEXT | Product name |
| `slug` | TEXT | URL-friendly name (must be unique) |
| `short_description` | TEXT | Brief description for listings |
| `description` | TEXT | Full product description |
| `price` | INTEGER | Price in cents (e.g., 999 = $9.99) |
| `currency` | TEXT | Currency code (USD, EUR, etc.) |
| `cover_image_url` | TEXT | URL to product cover image |
| `file_path` | TEXT | Path to downloadable file |
| `lemon_squeezy_variant_id` | TEXT | For Lemon Squeezy integration |
| `is_active` | BOOLEAN | Whether product is published |
| `created_at` | TIMESTAMP | When product was created |
| `updated_at` | TIMESTAMP | When product was last updated |

## Environment Variables

### Public Variables (safe to expose)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key for client-side access

### Private Variables (keep secret)
- `SUPABASE_SERVICE_ROLE_KEY` - Full access key (server-side only)

Never commit `.env.local` to git - it's in `.gitignore` by default.
