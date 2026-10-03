# Naija Boy Apparel

A beginner-friendly Next.js fashion shop with a catalog, database-backed shopping bag, authentication, checkout and order history. Read PRD.md for the product plan.

## Run the demo on your Chromebook Linux terminal

Install Node.js 24 LTS (Node 22.13+ is the minimum), and pnpm. Extract this folder, then:

```bash
cd naija-boy-apparel
pnpm install
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
DEMO_MODE=true
APP_URL=http://localhost:3000
```

Then run:

```bash
pnpm dev
```

Open http://localhost:3000 in your browser. The first request creates `.data/shop.sqlite` and seeds the products and demo account. Use `demouser@microsoft.com` with password `DemoShop2026!`. Add an item, open checkout, sign in, and place a demo order. Orders and the cart persist in SQLite. The shared demo password is for local testing only.

Demo email previews are rows in the `email_jobs` collection in SQLite. No real email or payment occurs. Google login and account creation remain unavailable until Supabase is configured.

Stop the server with Ctrl+C. Restarting keeps your data. To reset the local demo, stop the server and delete only `.data/shop.sqlite` and its SQLite WAL/SHM companion files.

## Connect Supabase

1. Create an account at https://supabase.com and create a project.
2. Open the SQL editor and run `supabase/schema.sql` once.
3. Set `DEMO_MODE=false` in `.env.local`.
4. Copy the project URL into both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`.
5. Copy the project's public anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Copy the legacy service-role key into `SUPABASE_SERVICE_ROLE_KEY`. Keep this key server-only; never give it a NEXT_PUBLIC prefix.
7. In Authentication, enable email sign-in and email confirmation. Set the Site URL to `http://localhost:3000` while developing and allow the relevant redirect URLs.
8. Restart the app. Its first request invokes the idempotent catalog seed function. Existing product rows are preserved.

All store database operations go through the server API. RLS is enabled, browser roles have no table access, and only the service role can call the checkout functions. Server handlers check the session's user ID before returning or updating orders. Supabase Auth handles production passwords.

To create the requested demo email in a SEPARATE test Supabase project, set `ALLOW_DEMO_USER_SEED=true` and `DEMO_USER_PASSWORD` to a unique 12+ character password, then:

```bash
node --env-file=.env.local scripts/seed-demo-user.mjs
```

This explicitly confirms the test user's email without sending mail. It does not prove ownership of that mailbox. Never run this in your real production project, and do not use the local shared demo password for that account.

## Configure Google sign-in

1. Sign in to https://console.cloud.google.com and create/select a project.
2. Configure Google Auth Platform branding, audience and consent settings. If the application remains in testing, add your Google account as a test user.
3. Create a Web application OAuth client.
4. Add `http://localhost:3000` as an authorized JavaScript origin, and your final HTTPS domain when deploying.
5. In Supabase Authentication → Providers → Google, copy the provider callback URL. It looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`. Add this exact URL as the authorized redirect URI in Google.
6. Copy the Google client ID and client secret into the Supabase Google provider and enable it. The secret belongs in Supabase's provider settings, not browser code.
7. In Supabase URL configuration, allow `http://localhost:3000/auth/callback` and `https://YOUR_DOMAIN/auth/callback`.
8. Use Continue with Google on the account page. Google creates/signs into a Supabase user; the app validates the access token on the server and establishes its own one-hour HttpOnly session.

For a public launch, complete Google's audience/publishing requirements applicable to your consent configuration. Do not assume a testing-only configuration works for all customers.

Official guide: https://supabase.com/docs/guides/auth/social-login/auth-google

## Configure Paystack

1. Register at https://paystack.com and start in test mode.
2. Put the test secret key in `PAYSTACK_SECRET_KEY`. Do not put it in browser code. This integration uses hosted checkout, so no frontend public key is required.
3. Set APP_URL to your deployed HTTPS origin before testing return callbacks.
4. Set the Paystack webhook URL to `https://YOUR_DOMAIN/api/paystack/webhook`. A hosted test environment is needed for incoming webhooks; Paystack cannot call your Chromebook's localhost.
5. Place a test order using Paystack's documented test payment details. Confirm its reference, amount, NGN currency and email through the server verification endpoint.
6. Test webhook replays, failed payments and order cancellation. A repeated confirmation must not deduct stock twice.
7. Complete Paystack live activation, change to live credentials, and repeat the launch checklist before real sales.

The API computes prices and shipping on the server. PostgreSQL reserves inventory atomically. Payments initialize after order creation. Initialization failure cancels the reservation. Paystack signatures use SHA-512 HMAC; webhook processing additionally verifies directly with Paystack. Paid status is idempotent. An unpaid order can be cancelled from order history. Late payment after cancellation must be reviewed/refunded; automatic reservation expiry/reconciliation is a launch requirement still to add.

Official documentation: https://paystack.com/docs/payments/accept-payments/ and https://paystack.com/docs/payments/verify-payments/

## Configure email with Nodemailer

Nodemailer needs no account. Register with an SMTP email provider or use SMTP credentials from an existing email service, verify your sender, and configure:

```env
SMTP_HOST=your-provider-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=Naija Boy Apparel <orders@your-domain>
```

Port 465 uses secure TLS; port 587 negotiates STARTTLS. Follow your provider's current settings. Configure SPF/DKIM and other sender DNS records using the provider's instructions in Namecheap.

A successful payment triggers a plain-text confirmation. Failed/unconfigured email leaves a pending database email job and keeps the paid order intact. Retrying payment verification can retry email; add an independent claimed outbox worker before live commerce. There is no scheduled retry service in this starter.

## Deploy to Vercel and use your Namecheap domain

1. Create a GitHub repository and push the source, excluding `.env.local`, `.data`, `node_modules`, and `.next`.
2. Register/sign in at https://vercel.com and import the repository.
3. Select the Next.js framework and Node.js 24 runtime. Build command: `pnpm build`.
4. Add the variables from `.env.example`. Set `DEMO_MODE=false`, configure Supabase/SMTP/Paystack, and use the exact HTTPS project address for APP_URL. Browser-public Supabase variables are injected at build time, so redeploy after changing them.
5. Deploy and test the generated Vercel address with test Paystack keys.
6. In Vercel Project Settings → Domains, add your domain and optionally `www`.
7. In Namecheap → Domain List → Manage → Advanced DNS, apply the exact A/CNAME/TXT records Vercel displays. Do not guess IP addresses. Remove only conflicting website records; retain email MX/SPF/DKIM records.
8. Wait for DNS verification and HTTPS activation. Update APP_URL and the auth redirect/origin settings to the final domain; redeploy and retest.
9. Replace sample products and shipping assumptions, add your policies/contact information, complete the PRD launch requirements, and only then use live payment keys.

Your Namecheap account remains the domain registrar. No transfer to Vercel is required. Namecheap shared hosting is not the chosen runtime for this Next.js API application.

Official domain guide: https://vercel.com/docs/domains/working-with-domains/add-a-domain

## Where customers register

- Browsing and adding to the bag: no account required.
- Checkout: sign-in/register required.
- Account page: email/password registration or Google sign-in.
- Saved account bag and order history: sign-in required.
- Paystack payment: no separate Paystack customer account required.

## Checks and project map

```bash
pnpm exec tsc --noEmit
pnpm build
node scripts/smoke-test.mjs
```

The smoke test runs a development server and creates a sample order in the local demo database. It does not test external credentials.

- `app/page.tsx`: shop and bag
- `app/account/page.tsx`: sign-in, registration and order history
- `app/checkout/page.tsx`: delivery form and payment return flow
- `app/auth/callback/page.tsx`: Google OAuth return
- `app/api/shop/route.ts`: protected app API
- `app/api/paystack/webhook/route.ts`: signed payment webhook
- `lib/shop/`: database, session, email and payment helpers
- `supabase/schema.sql`: database migration, seed and transactional checkout functions

## Sample photography

Images are illustrative Unsplash photos, not pictures of actual Naija Boy Apparel inventory. Replace them before selling products. Sources: Haryo Setyadi https://unsplash.com/photos/acn5ERAeSb4, Felipe R. https://unsplash.com/photos/f5P1emDHupU, and Anomaly https://unsplash.com/photos/WWesmHEgXDs. Review the Unsplash license and relevant rights for your actual use.

## Current limitations

This starter is not yet publicly deployed. External integrations are implemented but unverified without your service credentials. There is no admin interface, automatic reservation expiry, background email worker, password-reset interface, advanced fraud prevention, tax engine, saved-card feature or size-specific stock system. Sessions last one hour. Supabase password resets can be added as a subsequent feature. See PRD.md for the launch checklist.
