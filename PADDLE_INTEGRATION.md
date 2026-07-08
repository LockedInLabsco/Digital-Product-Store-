# Paddle Integration Setup Guide

This document outlines everything needed to integrate Paddle payment processing into the Not4Normal digital products website.

## Current Status

✅ **Code Changes Complete:**
- Paddle utilities created (`src/lib/paddle.ts`)
- Paddle webhook endpoint created (`src/app/api/webhooks/paddle/route.ts`)
- Paid product button component created (`src/components/PaidProductButton.tsx`)
- Product types updated to include `paddleProductId` and `paddlePriceId`
- Product detail page updated to use Paddle checkout
- Product listing page updated with correct button text

## Step 1: Update Supabase Schema

Run these SQL commands in your Supabase dashboard (SQL Editor):

```sql
-- Add Paddle fields to products table
alter table products add column paddle_product_id text;
alter table products add column paddle_price_id text;

-- Create indexes for faster lookups (optional but recommended)
create index idx_products_paddle_price_id on products(paddle_price_id);
```

**Why these fields?**
- `paddle_product_id`: Identifies the product in Paddle
- `paddle_price_id`: Identifies the specific price point (used in webhook)

## Step 2: Local Environment Setup

Add these variables to your `.env.local` file:

```
# Paddle Configuration
PADDLE_API_KEY=your_paddle_api_key_here
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret_here
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_paddle_client_token_here
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

**Getting These Values:**

1. **From Paddle Dashboard:**
   - Go to Developer Tools → Credentials
   - Copy your **API Key** (server-side only)
   - Copy your **Webhook Secret** (server-side only)
   - Copy your **Client Token** (for frontend)

2. **Environment:**
   - Use `sandbox` for testing
   - Use `production` for live payments

## Step 3: Vercel Environment Setup

Add these variables to your Vercel project:

**Settings → Environment Variables → Add**

```
PADDLE_API_KEY = (your API key from Paddle)
PADDLE_WEBHOOK_SECRET = (your webhook secret from Paddle)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = (your client token from Paddle)
NEXT_PUBLIC_PADDLE_ENVIRONMENT = sandbox (or production)
```

**Important:** 
- Keep `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` secret (server-side only)
- The `NEXT_PUBLIC_*` variables are safe to expose to the frontend
- After adding variables, trigger a redeploy on Vercel

## Step 4: Configure Paddle Webhook

In your Paddle Dashboard:

1. Go to **Developer Tools → Webhooks**
2. Click **Add Endpoint**
3. Set the URL to:
   ```
   https://www.not4normal.store/api/webhooks/paddle
   ```
4. Select these events to listen for:
   - `transaction.completed` (required)
   - `transaction.created` (optional, for logging)
   - `transaction.updated` (optional, for logging)

5. Copy the **Webhook Secret** and add it to both `.env.local` and Vercel

## Step 5: Add Paddle Product Information

In your Supabase database, for each paid product, update:

1. Go to your Supabase Products table
2. For each product with `price > 0`:
   - Set `paddle_product_id` (e.g., `prod_1234567890`)
   - Set `paddle_price_id` (e.g., `pri_1234567890`)

**How to get these IDs:**

1. In Paddle Dashboard, go to **Products**
2. Create or select a product
3. Go to **Prices** tab
4. Copy the Price ID (shown in the pricing table)

Example:
```
Product: "The Deep Work Starter Pack"
paddle_product_id = "pro_01ARZ3NDEKTSV4RRFFQ69G5FAV"
paddle_price_id = "pri_01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

## Step 6: Test the Integration

### Test in Sandbox Mode

1. **Start your local dev server:**
   ```bash
   npm run dev
   ```

2. **Go to a paid product page:**
   ```
   http://localhost:3000/products/[paid-product-slug]
   ```

3. **Click "Get Instant Access" button**
   - Should open Paddle checkout overlay

4. **Use Paddle Test Cards:**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ```

5. **After payment:**
   - Check your email for download link
   - Check Vercel logs for webhook confirmation

### Monitor in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Functions** → View logs
4. Look for logs from `/api/webhooks/paddle`

Expected log output:
```
🚀 ===== PADDLE WEBHOOK RECEIVED =====
🔐 Signature header received: ✅ yes
📨 Event Type: transaction.completed
✅ Product found: Product Title
🔗 Generating signed URL...
✅ Signed URL generated
📧 Sending download email...
✅ Email sent successfully
```

## How It Works

### Free Product Flow (Unchanged)
1. User clicks "Get Free Guide"
2. Email form appears
3. User enters email
4. Server generates signed URL
5. Download email sent via Resend
6. ✅ No Paddle involvement

### Paid Product Flow (New)
1. User clicks "Get Instant Access"
2. Paddle checkout opens
3. User completes payment in Paddle
4. Paddle webhook sends `transaction.completed` event
5. Your webhook endpoint:
   - Verifies webhook signature
   - Looks up product by `paddle_price_id`
   - Generates secure signed download URL
   - Sends download email via Resend
6. ✅ Customer receives download link

## Webhook Flow Diagram

```
User Pays → Paddle → Webhook Event → Your API
    ↓                                    ↓
Checkout              transaction.completed
Completes                              ↓
                           Verify Signature
                                   ↓
                           Find Product
                                   ↓
                        Generate Signed URL
                                   ↓
                         Send Email via Resend
                                   ↓
                           ✅ Customer Gets Download
```

## Testing Checklist

- [ ] Supabase schema updated with `paddle_product_id` and `paddle_price_id`
- [ ] `.env.local` has all 4 Paddle variables
- [ ] Vercel has all 4 Paddle variables set
- [ ] Webhook URL configured in Paddle Dashboard
- [ ] Webhook events (`transaction.completed`) enabled
- [ ] Test card payment completes successfully
- [ ] Email received with download link
- [ ] Vercel logs show successful webhook processing
- [ ] Free product flow still works
- [ ] Product listing shows "Get Access" for paid products

## Troubleshooting

### Email Not Sent After Payment
1. Check Vercel logs for webhook execution
2. Verify `RESEND_API_KEY` is set in Vercel
3. Check spam folder in email inbox
4. Verify Resend account has remaining credits

### Webhook Not Received
1. Verify webhook URL is correct (including `https://`)
2. Check webhook is enabled in Paddle Dashboard
3. Verify `transaction.completed` event is selected
4. Check Paddle Dashboard → Developer Tools → Webhooks → Recent Logs

### Signature Verification Fails
1. Verify `PADDLE_WEBHOOK_SECRET` matches Paddle Dashboard
2. Check webhook secret wasn't accidentally modified
3. Re-copy the secret from Paddle Dashboard

### Paddle Checkout Won't Open
1. Verify `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set correctly
2. Check browser console for JavaScript errors
3. Ensure `NEXT_PUBLIC_PADDLE_ENVIRONMENT` matches token's environment (sandbox/production)

### Product Not Found in Webhook
1. Verify `paddle_price_id` is set in Supabase for the product
2. Check webhook log to see which `paddle_price_id` was sent
3. Ensure no typos in the ID

## Security Notes

✅ **Secrets Protected:**
- `PADDLE_API_KEY` - Server-side only
- `PADDLE_WEBHOOK_SECRET` - Server-side only
- Both hidden from browser/frontend

✅ **Webhook Signature Verification:**
- Every webhook is verified using HMAC-SHA256
- Invalid signatures are rejected with 401 status

✅ **Download URLs:**
- Generated server-side only
- Signed by Supabase with 1-hour expiry
- Never exposed directly to user

✅ **File Bucket:**
- Remains private in Supabase
- Only accessible via signed URLs
- Time-limited access

## Next Steps

1. Create products in Paddle Dashboard
2. Get the Product IDs and Price IDs
3. Update Supabase with these IDs
4. Add Paddle credentials to `.env.local` and Vercel
5. Configure webhook in Paddle Dashboard
6. Test with Paddle test card
7. Go live with production credentials when ready

## Support

- Paddle Docs: https://developer.paddle.com/
- Paddle Webhooks: https://developer.paddle.com/webhooks
- Resend Docs: https://resend.com/docs

## Files Changed

- `src/types/product.ts` - Added Paddle fields
- `src/lib/supabase/transforms.ts` - Transform Paddle fields
- `src/lib/paddle.ts` - NEW: Paddle utilities
- `src/app/api/webhooks/paddle/route.ts` - NEW: Webhook handler
- `src/components/PaidProductButton.tsx` - NEW: Paddle checkout button
- `src/app/products/[slug]/page.tsx` - Updated to use PaidProductButton
- `src/components/ProductCard.tsx` - Updated button text
