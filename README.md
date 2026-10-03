# Naija Boy Apparel

A JavaScript learning project for a Nigerian clothing shop, prepared on **3 October 2026** from your uploaded PRD and setup guide. The original documents are preserved in `docs/`; this README describes the code actually in this folder.

## Start here

Dependencies are already installed in `node_modules`. From this project folder run:

```bash
npm run dev
```

Open **http://localhost:3000**. Leave the terminal running while you use the shop. Press **Ctrl+C** to stop it.

The local `.env.local` is already configured for demo mode. If you copy the project to another computer:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Use Node.js **24 LTS** for a new setup. This project also builds on the available Node.js 20.20.2; its declared minimum is 20.19.0. All application code uses JavaScript (`.js` / `.mjs`), not TypeScript. JSX in `.js` files describes the React interface.

## Try a complete practice order

1. Choose a size and click **Add to bag**.
2. Open **Bag**. Change the quantity or remove an item if you like.
3. Click **Continue to checkout**, then sign in:
   - Email: **wisdom.ugwoh@gmail.com**
   - Local demo password: **DemoShop2026!**
4. Enter sample delivery details and click **Place demo order**.
5. Open **Account** to see your order history.

This password is only for the local demo. It is **not your Gmail password**. Demo orders do not charge money, send email, or arrange deliveries. Google sign-in and registration are disabled in the demo. Production mode cannot use this shared demo login, even if `DEMO_MODE=true` was accidentally left set.

Bags, sessions, orders, inventory and email previews are saved in `.data/shop.sqlite`. Stop and restart the development server to see that they persist. The SQLite demo supports **one server process** at a time; production uses Supabase. To inspect email previews, open the SQLite file with a SQLite viewer and select `app_records` rows whose `kind` is `email_jobs`.

To start the demo over, stop the server and rename `.data/shop.sqlite` to `.data/shop.backup.sqlite`. A fresh database will be created on the next request. Renaming keeps your old data as a backup.

## Your email and private settings

`wisdom.ugwoh@gmail.com` is used for shop contact links, the default reply-to/sender settings, and the local demo login. Customers register using **their own email**, so their receipts go to them.

`.env.local` holds private settings. `.gitignore` excludes `.env`, `.env.*`, `node_modules`, `.next`, local databases and test output. `.env.example` contains no passwords or keys and is deliberately allowed in Git. Gitignore prevents new untracked secrets from being added; it does not remove secrets that were already committed elsewhere.

Every direct dependency has an **exact version** in `package.json`. `package-lock.json` also locks the dependency tree. `.npmrc` sets `save-exact=true` for future installations. Use `npm ci` to reproduce the lockfile and commit the lockfile with your source code. Do not commit `node_modules`.

## What is included

- Responsive shop, size selection, persistent bag, quantity updates and removal.
- Guest bag merged into the customer bag at sign-in.
- Supabase email/password registration and Google OAuth integration.
- Delivery validation and sign-in required for checkout.
- Server-calculated prices in integer kobo: ₦18,000 = 1,800,000 kobo.
- Atomic inventory reservation and checkout, duplicate-request protection, order history and unpaid cancellation.
- Paystack hosted checkout, server verification of amount/reference/currency/email, and signed webhooks.
- Email outbox with an atomic sending claim; local email previews in demo mode.
- One-hour HttpOnly sessions; server-only database access and owner checks on order operations.

The photos, product claims, prices, stock and flat ₦2,500 delivery fee are **sample content**. Replace them with your actual shop details before selling.

## Connect Supabase

1. Create a project at [Supabase](https://supabase.com).
2. Run `supabase/schema.sql` in its SQL editor. This creates the tables, restricted functions and three sample products. Re-running the file does not overwrite existing products.
3. In `.env.local`, set `DEMO_MODE=false` and provide:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

4. Enable email authentication and email confirmation in Supabase. Set the Site URL to `http://localhost:3000`. Use your final HTTPS site URL when deploying.
5. Restart `npm run dev`. Create an account on **Account**, confirm the email, and sign in.

The service-role key must **never** have a `NEXT_PUBLIC_` prefix. There are no public table policies: browser roles cannot read store records or call the persistence functions. The application server authenticates customers and returns only their own orders.

The `app_records` table stores typed JSON records. `shop_snapshot` reads a consistent snapshot; `shop_commit` checks its revision and atomically saves changes. Conflicting requests recompute before retrying. This makes stock reservation, cart changes and order creation atomic. The whole-store snapshot approach is deliberately small and educational; it is **not suitable for a large catalog or high traffic**. Before scaling, normalize the tables and use focused database functions.

For this starter, edit production product rows only while the application is stopped; direct dashboard edits do not participate in the application's revision protocol. The original guide's automatic first-request production seed has been replaced with the idempotent SQL seed in `schema.sql`.

There is no real production demo-user seed script. Register normally using an email you control. The shared local demo account is never created in Supabase.

## Enable Google sign-in

1. In Google Cloud Console, configure the Google Auth Platform branding, audience and consent screen.
2. Create a Web application OAuth client. Add your development and deployed site origins.
3. In Supabase Authentication → Providers → Google, copy the provider callback URL into Google's authorized redirect URIs. It looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`.
4. Put Google's client ID and secret in Supabase's Google provider settings and enable it. Do not put the Google secret in frontend code.
5. Add `http://localhost:3000/auth/callback` and your deployed `/auth/callback` URL to Supabase's allowed redirect URLs. Add your account as a Google test user if the Google application is in testing.
6. Restart the app and use **Continue with Google**.

The callback uses PKCE, validates the resulting access token on the server, creates a one-hour HttpOnly app session, and clears the temporary Supabase browser session. Check Google's current publishing requirements before opening sign-in to the public.

Official guide: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Configure Paystack test payments

1. Create your merchant account and obtain a **test** secret key.
2. Set `PAYSTACK_SECRET_KEY` in `.env.local`; no public key is required for this hosted checkout.
3. Set `APP_URL` to your exact site origin. The API checks this origin on browser POST requests. For local development use `http://localhost:3000`; use your HTTPS domain on deployment.
4. Set the Paystack webhook URL to `https://YOUR_DOMAIN/api/paystack/webhook`. Incoming webhooks need a publicly reachable deployment, not localhost.
5. Place a test order and use Paystack's official test payment details. Check return verification, webhook retries, failed payments and cancellation.

The server initializes transactions and checks reference, amount, NGN currency and customer email before marking an order paid. Webhooks require a valid SHA-512 HMAC signature and a direct Paystack verification. Repeated verification does not deduct stock again.

If initialization fails or times out, this version **keeps the unpaid order and reservation** for review because the external result may be uncertain. Open Account to check or cancel it; unlike the original guide, it does not automatically release stock on an ambiguous failure. Cancelling an unpaid order restores stock once. A payment arriving after cancellation is marked **Needs review**, and requires owner review/refund; it is not automatically fulfilled.

Official guides: [Accept payments](https://paystack.com/docs/payments/accept-payments/), [verify payments](https://paystack.com/docs/payments/verify-payments/), [webhooks](https://paystack.com/docs/payments/webhooks/).

## Configure confirmation email

Nodemailer is a library, not an account. Obtain SMTP credentials from your email provider and set:

```dotenv
SMTP_HOST=your-provider-host
SMTP_PORT=587
SMTP_USER=your-provider-username
SMTP_PASSWORD=your-provider-smtp-password
EMAIL_FROM=Naija Boy Apparel <wisdom.ugwoh@gmail.com>
```

Your provider must authorize the sender address. Simply entering your Gmail address does not enable sending. Use the provider's current SMTP setup; do not enter your normal Gmail password. Port 465 uses TLS from the start; other ports require STARTTLS here. A verified shop-domain sender can replace the Gmail sender later, while replies continue to use `CONTACT_EMAIL`.

Payment confirmation saves an email job first. A post-response task attempts delivery when SMTP is configured. Failure keeps the paid order and pending job. Payment verification can retry delivery. Claims reduce concurrent duplicate sends, but a process crash after SMTP acceptance can still cause a duplicate on retry. Add a scheduled worker and provider-supported idempotency before live sales.

Official guide: [Nodemailer SMTP](https://nodemailer.com/smtp).

## Deploy later: Vercel and Namecheap

This project has **not been published** or connected to your accounts.

1. Create a GitHub repository and add the project source plus `package-lock.json`. Exclude the ignored files.
2. Import it into Vercel as a Next.js project. Select Node.js 24, install command `npm ci`, and build command `npm run build`.
3. Add the environment settings, set `DEMO_MODE=false`, configure Supabase/Paystack/SMTP, and set `APP_URL` to your exact HTTPS address.
4. Deploy and test with Paystack **test** credentials. Public Supabase variables are injected during build, so redeploy after changing them.
5. Add your domain in Vercel. Copy exactly the DNS records Vercel shows into Namecheap Advanced DNS. Keep email-related MX/SPF/DKIM records. No registrar transfer is required.
6. Update `APP_URL`, Supabase redirects, Google origins, and the webhook address for the final domain. Redeploy and retest.

Official guide: [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Learning map

| File or folder | What you learn here |
| --- | --- |
| `app/page.js` | Product cards, sizes and add-to-bag |
| `app/bag/page.js` | Quantities, removal and totals |
| `app/account/page.js` | Sign-in, registration and orders |
| `app/checkout/page.js` | Delivery form and payment return |
| `app/auth/callback/page.js` | Google OAuth return |
| `app/globals.css` | Colours, spacing and responsive layout |
| `components/shop-provider.js` | Shared React state and API calls |
| `app/api/shop/route.js` | Server API and authorization |
| `lib/shop/model.js` | Prices, stock, cart and order rules |
| `lib/shop/database.js` | SQLite/Supabase persistence |
| `lib/shop/session.js` | Cookies and sessions |
| `lib/shop/payment.js` | Paystack integration |
| `lib/shop/email.js` | SMTP and email job claims |
| `supabase/schema.sql` | Production database setup |

## Checks

```bash
npm test
npm run build
npm run test:smoke
```

Stop your development server before the smoke test: it starts a server on port 3101, uses a fresh temporary database, checks checkout and security boundaries, restarts to verify persistence, and cleans up its own data. Your usual `.data/shop.sqlite` is not touched.

Browser tests (also stop the dev server first):

```bash
npx playwright install chromium
npm run test:browser
```

`npm run build` compiles JavaScript through Next.js. A generic Next.js log may mention TypeScript checks; this project contains no application TypeScript files.

## Before accepting real orders

This is a learning starter. Complete the uploaded PRD's launch checklist: real product/size inventory, delivery coverage, policies, confirmed registration, Google sign-in, tested payment success/failure/replays, SMTP delivery, database isolation, backups, monitoring and abuse protection. Add reservation expiry and reconciliation, a scheduled email worker and password recovery. Stock is per product across all sizes. No admin dashboard, automatic refunds, tax engine or saved cards are included.

The basic login limiter is not full deployment-level abuse protection. Sessions last one hour without automatic renewal. Guest records do not yet have scheduled cleanup. Catalog edits are manual. Supabase, Google, SMTP and Paystack integrations need testing with your credentials before launch; a local demo or successful build cannot prove they are configured.

## Sources and photography

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), Supabase, Paystack, Nodemailer and Vercel official guides linked above, plus your supplied documents.

Illustrative images are saved under `public/images/`:

- `essential.jpg`: [Haryo Setyadi](https://unsplash.com/photos/acn5ERAeSb4).
- `weekend.jpg`: [Felipe R.](https://unsplash.com/photos/f5P1emDHupU).
- `signature.jpg`: [Anomaly](https://unsplash.com/photos/WWesmHEgXDs).

These are not photographs of actual Naija Boy Apparel inventory. Review the [Unsplash license](https://unsplash.com/license) and relevant rights, and replace them before selling.
