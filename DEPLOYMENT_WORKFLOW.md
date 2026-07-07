# Deployment Workflow

## Overview

Not4Normal is deployed on **Vercel** and connected to **GitHub**. When you push code changes to the main branch, Vercel automatically detects the changes and redeploys your site.

## Local Development

Start the development server:

```bash
npm run dev
```

The site runs on `http://localhost:3000`. Changes are hot-reloaded as you edit files.

## Testing Before Deployment

Build and test locally before pushing:

```bash
npm run build
npm start
```

This ensures your code compiles correctly and catches any errors before they reach production.

## Pushing to GitHub (Triggers Automatic Redeploy)

1. **Stage your changes:**
   ```bash
   git add .
   ```

2. **Commit with a clear message:**
   ```bash
   git commit -m "Your change description"
   ```

3. **Push to GitHub:**
   ```bash
   git push
   ```

**After you push**, Vercel automatically:
- Detects the push to `main` branch
- Runs the build (`npm run build`)
- Deploys to https://www.not4normal.store
- Takes ~2-5 minutes typically

## What Requires a Redeploy

### ✅ Code/Design Changes → REDEPLOY NEEDED

These changes require pushing to GitHub and triggering a Vercel redeploy:

- **New pages** (e.g., adding `/new-page`)
- **Design changes** (CSS, Tailwind classes, component updates)
- **API route changes** (e.g., `/api/download/*`, `/api/checkout`)
- **Component updates** (buttons, forms, layout)
- **Library/dependency updates** (package.json changes)
- **Environment variable changes in Vercel** (updated in Vercel settings)
- **Next.js config changes** (next.config.js)
- **Type definitions** (TypeScript changes)

**Workflow:**
1. Make the code change locally
2. Test with `npm run build`
3. Push to GitHub with `git push`
4. Vercel automatically redeploys

## What Does NOT Require a Redeploy

### 🔄 Database Content Changes → NO REDEPLOY NEEDED

These changes update **Supabase data** and take effect immediately without a redeploy:

- **Product title changes**
- **Product description updates**
- **Price changes**
- **Product image URL updates**
- **File path changes** (which PDF/file the product links to)
- **Feature list updates**
- **Active status changes** (showing/hiding products)
- **Gallery image updates**
- **Any other product metadata**

**How it works:**
- Your Next.js site queries Supabase in real-time (server-side rendering)
- When you edit a product in Supabase, the change appears immediately on the live site
- No redeploy needed because the code doesn't change, only the data

**Example:** If you update a product price in Supabase, customers will see the new price on the next page load—instantly, without waiting for a Vercel redeploy.

## Environment Variables

### Local Development (.env.local)

Create a `.env.local` file in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
FROM_EMAIL=your_sender_email
```

This file is in `.gitignore` and never pushed to GitHub.

### Production (Vercel)

Environment variables are set in **Vercel Project Settings**:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add/update the same variables as `.env.local`

**Important:** If you change an environment variable in Vercel, you must trigger a redeploy:
- Go to Vercel dashboard → Deployments → Click "Redeploy" on latest
- OR: Push any code change to GitHub to trigger an automatic redeploy

## Deployment Checklist

Before pushing to production:

- [ ] Code builds locally: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] All new features tested locally
- [ ] `.env.local` is NOT staged (check with `git status`)
- [ ] Commit message is clear and descriptive
- [ ] Ready for production

## Quick Reference

| Action | Command |
|--------|---------|
| Start development | `npm run dev` |
| Build for production | `npm run build` |
| Run production build | `npm start` |
| Check code quality | `npm run lint` |
| Add changes | `git add .` |
| Commit | `git commit -m "message"` |
| Push (triggers redeploy) | `git push` |

## Troubleshooting

**Build fails after push:**
- Check Vercel deployment logs in dashboard
- Run `npm run build` locally to see the error
- Fix the error and push again

**Changes don't appear on live site:**
- If it's code: Wait for redeploy (check Vercel dashboard)
- If it's Supabase data: Refresh the page (usually appears instantly)

**Environment variables not loading:**
- Verify variables are set in Vercel Settings
- Ensure they're named exactly as used in code
- Trigger a redeploy after updating variables

## Support

For questions about deployment, check:
- Vercel docs: https://vercel.com/docs
- Next.js docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
