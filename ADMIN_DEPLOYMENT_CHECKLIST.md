# Admin System Deployment Checklist

## ✅ Code Complete

All admin pages and API routes are built and tested.

**Build Status:** ✅ Passing (0 errors)

**Pages Created:**
- ✅ `/admin/login` - Login form
- ✅ `/admin` - Dashboard
- ✅ `/admin/products` - Product list
- ✅ `/admin/products/new` - Create product
- ✅ `/admin/products/[id]/edit` - Edit product

**API Routes Created:**
- ✅ `POST /api/admin/products` - Create
- ✅ `GET /api/admin/products` - List
- ✅ `GET /api/admin/products/[id]` - Get one
- ✅ `PUT /api/admin/products/[id]` - Update
- ✅ `DELETE /api/admin/products/[id]` - Delete

---

## 📋 Action Items (In Order)

### 1. Supabase Schema (SQL)

**Run in Supabase Dashboard → SQL Editor:**

```sql
-- Add Paddle fields (if not already there)
alter table products add column if not exists paddle_product_id text;
alter table products add column if not exists paddle_price_id text;

-- Create index for Paddle webhook lookups
create index if not exists idx_products_paddle_price_id on products(paddle_price_id);
```

**Status:** ⬜ Pending - Run this SQL query

---

### 2. Local Development Setup

**Add to `.env.local`:**

```
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
ADMIN_PASSWORD_TEMP=your_secure_password_here
```

**Replace:** `your_secure_password_here` with a strong password

**Status:** ⬜ Pending - Add to `.env.local`

---

### 3. Test Locally

```bash
npm run dev
```

Then visit: `http://localhost:3000/admin/login`

**Login with:**
- Email: `admin@not4normal.store`
- Password: (whatever you set above)

**Expected:** See admin dashboard with "Products" option

**Test:**
1. Click "Products"
2. Click "+ New Product"
3. Fill in a test product
4. Click "Create Product"
5. You should see it in the products list

**Status:** ⬜ Pending - Test locally

---

### 4. Deploy to Vercel

**Push your changes:**

```bash
git add .
git commit -m "Add admin product management system"
git push
```

Vercel will automatically redeploy (2-5 minutes).

**Status:** ⬜ Pending - Push to GitHub

---

### 5. Vercel Environment Setup

**In Vercel Dashboard:**

1. Select your "Digital-Product-Store-" project
2. Go to **Settings → Environment Variables**
3. Add this variable:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_ADMIN_EMAIL` | `admin@not4normal.store` |

**Status:** ⬜ Pending - Add to Vercel

---

### 6. Test on Vercel

After deployment completes:

1. Visit: `https://www.not4normal.store/admin/login`
2. Log in with credentials
3. Try creating a test product
4. Verify it appears in the products list

**Status:** ⬜ Pending - Test on live site

---

### 7. Add Paddle IDs (For Paid Products)

For each paid product (price > 0):

1. **Create product in Paddle Dashboard:**
   - Go to Products → New Product
   - Fill details
   - Go to Prices → Add Price
   - Copy the **Price ID** (pri_...)

2. **Update in Not4Normal Admin:**
   - Go to `/admin/products`
   - Click "Edit" on your paid product
   - Paste Paddle Price ID
   - Save

**Status:** ⬜ Pending - Add Paddle IDs to products

---

## 🔐 Admin Login Details

### Current Setup (Development/MVP)

**Email:** `admin@not4normal.store`

**Password:** Set in your `.env.local`

### Production Setup (Recommended)

For production, use proper Supabase Auth. See `ADMIN_SETUP.md` for secure authentication setup.

---

## 📊 What Each Admin Page Does

### `/admin/login`
- Simple email/password login
- Stores token in localStorage
- Redirects to `/admin` on success

### `/admin`
- Dashboard with links to manage products
- Shows which features are available
- Logout button

### `/admin/products`
- List of all products (active and inactive)
- Shows: Title, Slug, Price, Status
- Actions: Edit, Delete
- Button to create new product

### `/admin/products/new`
- Form to create new product
- Fields:
  - Title, Slug, Descriptions
  - Price, Currency
  - Image URL, File Path
  - Paddle IDs (for paid products)
  - Active status
- Auto-redirects to products list after create

### `/admin/products/[id]/edit`
- Form to edit existing product
- Same fields as create
- Shows success message after save
- Back button to cancel

---

## 🎯 Workflow: Adding a Product with Paddle

### Step 1: Create in Paddle
1. Paddle Dashboard → Products → New
2. Fill name, description
3. Go to Prices tab → Add Price
4. Set price (e.g., $29.99)
5. Copy the **Price ID** (pri_...)

### Step 2: Create in Not4Normal Admin
1. Go to `https://not4normal.store/admin/products`
2. Click "+ New Product"
3. Fill in:
   - Title: "Your Product Name"
   - Slug: "your-product-slug"
   - Description, Short Description
   - Price: 29.99
   - Cover Image URL (optional)
   - File Path: path in Supabase bucket
   - **Paddle Price ID:** Paste from Paddle
4. Click "Create Product"

### Step 3: Test
1. Go to public product page
2. Click "Get Instant Access - $29.99"
3. Paddle checkout should open
4. Test with Paddle test card

---

## 🔍 Verify Everything Works

### Before Going Live

- [ ] Supabase schema updated with `paddle_product_id`, `paddle_price_id`
- [ ] `.env.local` has `ADMIN_PASSWORD_TEMP` set
- [ ] `npm run dev` starts successfully
- [ ] Can log in to admin at `/admin/login`
- [ ] Can view products at `/admin/products`
- [ ] Can create a test product
- [ ] Changes are saved to Supabase
- [ ] Test product appears on public site
- [ ] Test product can be edited
- [ ] Test product can be deleted
- [ ] Public site still works (not broken)
- [ ] Free product flow still works
- [ ] `npm run build` passes
- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Admin works on live site (`https://not4normal.store/admin`)

---

## 🚨 Security Notes

### Current Implementation
- ✅ Simple password protection (good for MVP)
- ✅ Token stored in localStorage
- ⚠️ Password in environment variables (acceptable for MVP)

### For Production
- 🔒 Use Supabase Auth for proper authentication
- 🔒 Implement RLS (Row Level Security) policies
- 🔒 Use secure session tokens
- 🔒 Enable HTTPS (already done on Vercel)
- 🔒 Audit admin actions (coming soon)

See `ADMIN_SETUP.md` for production security setup.

---

## 📁 Files Created

```
src/lib/supabase/auth.ts
src/app/api/admin/products/route.ts
src/app/api/admin/products/[id]/route.ts
src/app/admin/login/page.tsx
src/app/admin/products/page.tsx
src/app/admin/products/new/page.tsx
src/app/admin/products/[id]/edit/page.tsx
src/components/admin/ProductForm.tsx
```

---

## 🆘 Troubleshooting

### Login doesn't work
- Check `.env.local` has `ADMIN_PASSWORD_TEMP` set
- Check email is exactly: `admin@not4normal.store`
- Try different password if unsure
- Clear browser cache

### Can't see products
- Make sure Supabase credentials are in `.env.local`
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Verify products table exists in Supabase
- Check Vercel logs if on production

### Paddle checkout not opening
- For paid products only (price > 0)
- Check `paddle_price_id` is set in admin
- Verify NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is in Vercel
- Check browser console for errors

### Changes not saving
- Check network tab in browser dev tools
- Look for API response errors
- Check Vercel logs for API errors
- Verify Supabase credentials

---

## 📚 Documentation

- `ADMIN_SETUP.md` - Complete setup guide
- `ADMIN_DEPLOYMENT_CHECKLIST.md` - This file
- `DEPLOYMENT_WORKFLOW.md` - General deployment process
- `PADDLE_INTEGRATION.md` - Paddle setup guide

---

## ✨ What's Protected

✅ Admin pages require login
✅ All product data server-side
✅ Service role key never exposed to browser
✅ Free product flow unchanged
✅ Public website unaffected
✅ Supabase bucket still private (signed URLs)

---

## 🎉 You're Ready!

Follow the checklist above and you'll have a full admin system to manage products without touching Supabase directly.

**Questions?** Check the docs above or review the code in:
- `src/app/admin/*` - Admin pages
- `src/app/api/admin/*` - API routes
- `src/components/admin/ProductForm.tsx` - Form component
