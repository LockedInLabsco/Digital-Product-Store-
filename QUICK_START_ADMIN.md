# Admin System - Quick Start

## 5-Minute Setup

### 1. Run SQL in Supabase

Go to **Supabase → SQL Editor** and paste:

```sql
alter table products add column if not exists paddle_product_id text;
alter table products add column if not exists paddle_price_id text;
create index if not exists idx_products_paddle_price_id on products(paddle_price_id);
```

### 2. Add to `.env.local`

```
NEXT_PUBLIC_ADMIN_EMAIL=admin@not4normal.store
ADMIN_PASSWORD_TEMP=your_strong_password
```

### 3. Test Locally

```bash
npm run dev
```

Visit: `http://localhost:3000/admin/login`

Login:
- Email: `admin@not4normal.store`
- Password: (whatever you set)

### 4. Deploy

```bash
git add .
git commit -m "Add admin product management"
git push
```

---

## Admin URLs

- **Login:** `/admin/login`
- **Dashboard:** `/admin`
- **Products:** `/admin/products`
- **Create:** `/admin/products/new`
- **Edit:** `/admin/products/[id]/edit`

---

## What You Can Do

✅ Create products  
✅ Edit products  
✅ Delete products  
✅ Toggle active/inactive  
✅ Set Paddle IDs  
✅ Add download file paths  

---

## Adding a Paid Product with Paddle

1. Create product in Paddle (copy Price ID: `pri_...`)
2. In admin, create product with `price > 0`
3. Paste Paddle Price ID
4. Save
5. Done! Checkout will work

---

## Vercel Deployment

1. After push, Vercel auto-deploys
2. Go to `https://www.not4normal.store/admin/login`
3. Log in
4. Manage products

---

## Default Login

```
Email: admin@not4normal.store
Password: (from ADMIN_PASSWORD_TEMP in .env.local)
```

---

## API Endpoints

All internal, no external calls needed:

- `GET /api/admin/products` - List all
- `POST /api/admin/products` - Create
- `GET /api/admin/products/[id]` - Get one
- `PUT /api/admin/products/[id]` - Update
- `DELETE /api/admin/products/[id]` - Delete

---

## That's It!

You now have a full admin panel to manage products without touching Supabase tables directly.

For more details, see:
- `ADMIN_DEPLOYMENT_CHECKLIST.md` - Full checklist
- `ADMIN_SETUP.md` - Detailed guide
