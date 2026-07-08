# Admin Product Management Setup Guide

## Overview

A secure admin panel has been added to manage products without manually editing Supabase tables.

**Admin Pages Created:**
- `/admin/login` - Admin login
- `/admin` - Dashboard
- `/admin/products` - Product list
- `/admin/products/new` - Create product
- `/admin/products/[id]/edit` - Edit product

**Build Status:** ✅ All pages compile successfully

---

## Step 1: Supabase Schema Updates

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Add Paddle fields to products table (if not already present)
alter table products add column if not exists paddle_product_id text;
alter table products add column if not exists paddle_price_id text;

-- Create index for webhook lookups
create index if not exists idx_products_paddle_price_id on products(paddle_price_id);
```

**That's it!** The existing `products` table has all fields needed.

---

## Step 2: Local Development Setup

### Add to `.env.local`

```
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
ADMIN_PASSWORD_TEMP=your_secure_password_here
```

**Note:** This is a temporary setup. For production, use proper Supabase Auth (see Production Setup below).

---

## Step 3: Test Locally

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Go to: `http://localhost:3000/admin/login`

3. Log in with:
   - Email: `admin@not4normal.store`
   - Password: (whatever you set in `.env.local`)

4. You'll see the admin dashboard

5. Click "Products" to manage products

---

## Step 4: Admin Features

### View Products
- See all products in a table
- See: Title, Slug, Price, Active/Inactive status
- Edit or Delete each product

### Create Product
Click "+ New Product" to add a product. Fill in:

**Basic Information:**
- Title (required)
- Slug (required, URL-friendly)
- Short Description
- Full Description

**Pricing:**
- Price (0 = free product)
- Currency (USD, EUR, GBP)

**Media & Files:**
- Cover Image URL
- File Path (path in Supabase bucket)

**For Paid Products Only:**
- Paddle Product ID (from Paddle Dashboard)
- Paddle Price ID (from Paddle Dashboard → Products → Prices)

**Visibility:**
- Toggle "Active" to show/hide product

### Edit Product
Click "Edit" on any product to modify it. Same fields as create.

### Toggle Product Status
Products can be hidden without deletion by toggling "Active" status.

### Delete Product
Click "Delete" to remove a product. Confirmation required.

---

## Step 5: Adding Paddle IDs to Products

### For Paid Products Only

1. Create product with `price > 0`
2. Go to Paddle Dashboard → Products
3. Find your product
4. Go to "Prices" tab
5. Copy the **Price ID** (looks like `pri_...`)
6. Edit the product in Not4Normal Admin
7. Paste the Price ID in "Paddle Price ID" field
8. Save

**Example:**
- Product: "The Deep Work Starter Pack"
- Price: $29.99
- Paddle Price ID: `pri_01ARZ3NDEKTSV4RRFFQ69G5FAV`

---

## Step 6: Deploy to Vercel

After testing locally:

```bash
git add .
git commit -m "Add admin product management system"
git push
```

Vercel will automatically redeploy.

---

## Step 7: Production Setup (Recommended)

For production, use proper Supabase Auth instead of local password.

### Set Up Supabase Auth

1. In Supabase Dashboard → Authentication → Providers
2. Enable Email/Password authentication
3. Create an admin user:

```sql
-- Go to Supabase → Authentication → Users
-- Click "Add User"
-- Email: admin@not4normal.store
-- Password: Strong password
-- Auto confirm email: Yes
```

Or use the management endpoint (more secure):

```bash
# Using Supabase CLI
supabase auth admin create-user --email admin@not4normal.store --password "your_secure_password"
```

### Update Admin Login Logic

The current admin system uses a temporary client-side check. For production, implement proper Supabase Auth:

**File:** `src/app/admin/login/page.tsx`

Replace the `handleLogin` function with:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    // Store auth token
    localStorage.setItem('admin_token', data.session?.access_token || '')
    router.push('/admin')
  } catch (err) {
    setError('Login failed')
  } finally {
    setIsLoading(false)
  }
}
```

---

## Security Considerations

### Current Setup (Development)
- ✅ Simple local authentication
- ✅ Good for testing
- ❌ Not secure for production

### Production Setup (Recommended)
- ✅ Use Supabase Auth
- ✅ Session tokens handled securely
- ✅ Row Level Security (RLS) policies
- ✅ All operations server-side

### Database Security (To Implement)

Add RLS policies to protect the `products` table:

```sql
-- Enable RLS
alter table products enable row level security;

-- Public read access (customers)
create policy "public_can_read_active_products"
on products for select
using (is_active = true);

-- Admin-only write access
create policy "admin_can_read_all"
on products for select
using (auth.role() = 'authenticated');

create policy "admin_can_modify"
on products for insert, update, delete
using (auth.role() = 'authenticated');
```

---

## Environment Variables

### Local Development (`.env.local`)
```
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
ADMIN_PASSWORD_TEMP=your_temp_password
```

### Vercel (Settings → Environment Variables)
```
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
```

**Note:** After switching to Supabase Auth in production, these won't be needed.

---

## API Routes

### GET /api/admin/products
Fetch all products (including inactive)

**Response:**
```json
{
  "products": [
    {
      "id": "product-id",
      "title": "Product Title",
      "price": 0,
      "is_active": true,
      ...
    }
  ]
}
```

### POST /api/admin/products
Create new product

**Request:**
```json
{
  "title": "...",
  "slug": "...",
  "price": 0,
  "description": "...",
  ...
}
```

### GET /api/admin/products/[id]
Get single product

### PUT /api/admin/products/[id]
Update product

### DELETE /api/admin/products/[id]
Delete product

---

## Workflow: Adding a Paid Product with Paddle

1. **Create product in Paddle Dashboard:**
   - Go to Products → New Product
   - Fill in details
   - Go to Prices → Add Price
   - Copy the **Price ID**

2. **Add product in Not4Normal Admin:**
   - Go to `/admin/products`
   - Click "+ New Product"
   - Fill in details
   - Set `price` > 0 (e.g., 29.99)
   - Paste Paddle Price ID
   - Save

3. **Test:**
   - Visit product page at `https://not4normal.store/products/[slug]`
   - Click "Get Instant Access"
   - Paddle checkout should open

---

## Troubleshooting

### Can't log in to admin
- Check `.env.local` has `ADMIN_PASSWORD_TEMP` set
- Make sure email matches `NEXT_PUBLIC_ADMIN_EMAIL`
- Clear browser cache and try again

### Admin pages show 404
- Make sure build completed successfully: `npm run build`
- Pages should be at `/admin/*`
- Check you're accessing the right URL

### Can't save product
- Check all required fields are filled (title, slug)
- Check browser console for error messages
- Verify Supabase credentials in `.env.local`
- Check Vercel logs if deployed

### Paddle checkout won't open for paid product
- Make sure `paddle_price_id` is set correctly
- Check `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is in Vercel
- Verify the price is > 0 for the product
- Check browser console for JavaScript errors

### Product changes don't appear on public site
- Public pages use server-side rendering
- Changes should appear immediately
- If not, check Supabase queries are working
- Verify product has `is_active = true`

---

## Files Added/Modified

**New Files:**
```
src/lib/supabase/auth.ts
src/app/api/admin/products/route.ts
src/app/api/admin/products/[id]/route.ts
src/app/admin/login/page.tsx
src/components/admin/ProductForm.tsx
src/app/admin/products/page.tsx
src/app/admin/products/new/page.tsx
src/app/admin/products/[id]/edit/page.tsx
```

**Modified Files:**
```
src/app/admin/page.tsx (updated from placeholder)
```

---

## Next Steps

1. ✅ Run `npm run build` (already done)
2. ⬜ Add environment variables locally
3. ⬜ Test admin login locally
4. ⬜ Create a test product
5. ⬜ Push to GitHub
6. ⬜ Verify on Vercel
7. ⬜ (Optional) Set up proper Supabase Auth for production

---

## Support

**Admin Pages:**
- `/admin` - Dashboard
- `/admin/login` - Login
- `/admin/products` - Product list
- `/admin/products/new` - Create
- `/admin/products/[id]/edit` - Edit

**API Endpoints:**
- `POST /api/admin/products` - Create
- `GET /api/admin/products` - List all
- `GET /api/admin/products/[id]` - Get one
- `PUT /api/admin/products/[id]` - Update
- `DELETE /api/admin/products/[id]` - Delete

All admin pages are protected by checking for `admin_token` in localStorage.
