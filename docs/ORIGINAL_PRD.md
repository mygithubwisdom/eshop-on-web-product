# Naija Boy Apparel — Simple Product Requirements Document

Version 1 · Learning project and online fashion shop · 2 October 2026

## 1. Purpose
Build a responsive fashion shop where customers browse clothes, select a size, save a shopping bag, sign in, provide delivery details, pay through Paystack, and see their orders. Start with a small catalog rather than a marketplace.

## 2. People using the app
- Visitor: browses products and adds items to a bag without signing in.
- Customer: signs in, keeps a saved bag, checks out, and views only their own orders.
- Store owner: configures products, prices, inventory, payments, shipping, and email services. This starter has no owner dashboard; product administration uses the Supabase dashboard with privileged owner access.

## 3. First-version requirements
| Area | Requirement | Acceptance check |
|---|---|---|
| Storefront | Show product photo, name, description, NGN price, available sizes | Seeded products appear on first request |
| Cart | Add, change quantity, remove, and save selected sizes in the database | Reload retains the bag; signing in merges the guest bag |
| Accounts | Email/password through Supabase Auth, plus Google OAuth | Customer can sign in and out; account page identifies them |
| Registration | Email confirmation when enabled in Supabase | New customer confirms email before signing in |
| Checkout | Require login; collect name, phone, street, city, state | Invalid or missing fields prevent checkout |
| Pricing | Server reads current database prices; amounts use integer kobo | Browser cannot set the amount charged |
| Inventory | Reserve stock when an unpaid order is created | Database transaction prevents overselling across orders |
| Payment | Paystack hosted checkout; signed webhook and server verification | Paid status only follows matching reference, amount, currency and customer email |
| Confirmation | Nodemailer SMTP email after verified payment | Paid order persists even if email delivery fails |
| Orders | Customer sees their own order history | Another customer's orders are not returned |
| Persistence | Supabase PostgreSQL for production data | Data survives deployment and browser changes |
| Mobile use | Responsive layout and keyboard-accessible controls | Shop and checkout remain usable on a phone |

## 4. Pages and registration gates
| Page or action | Must a shopper register/sign in? |
|---|---|
| Shop and product browsing | No |
| Add items and view bag | No; anonymous bag uses a database record and a browser cookie identifier |
| Save bag to an account for later sign-ins | Yes |
| Checkout and submit an order | Yes |
| Pay for an order | Yes, then redirect to Paystack; shopper needs no separate Paystack account |
| Order history / verify payment / cancel own unpaid order | Yes |
| Google sign-in | Uses the shopper's existing Google account; creates a Supabase identity on first sign-in |

## 5. User journey
Shop → choose size → add to bag → checkout → sign in/register → enter delivery details → Paystack → server verifies payment → order confirmation → email and order history.

## 6. Data and architecture
Next.js frontend and Node.js API hosted on Vercel. Supabase provides PostgreSQL and authentication. Google OAuth is configured in Google Cloud Console and enabled in Supabase. Nodemailer connects to an SMTP provider. Paystack collects payment details.

The starter uses one server-only PostgreSQL table, `app_records`, with typed record categories: products, carts, orders, sessions, rate limits, and email jobs. This keeps the initial migration short. Supabase Auth maintains customer identities separately. For a larger shop, migrate to normalized products, variants, cart items, orders, order items, and email outbox tables, with indexes and SQL ownership policies.

Products store prices in kobo (₦18,000 = 1,800,000 kobo). Orders snapshot product names, sizes, quantities, prices, delivery details and totals. Stock is currently per product, shared across sizes. Sessions expire after one hour and require a new sign-in. Browser cookies contain opaque identifiers, not passwords or card details.

## 7. First-run and demo behavior
- Local demo: `DEMO_MODE=true` with development mode creates a SQLite database, seeds three sample products and the demo account on the first application request.
- Demo login: `demouser@microsoft.com` / `DemoShop2026!`.
- Demo checkout saves an order and an email preview. It does not charge money, send mail, or contact Google.
- Production: apply `supabase/schema.sql` once, configure Supabase, and disable demo mode. The catalog is seeded idempotently on first request, without overwriting existing data.
- An isolated test Supabase project can use the supplied seed-user script with a unique password. Do not create the shared demo account in the real production store.

## 8. Services the owner must register for
| Service | Why it is needed | What to set up |
|---|---|---|
| Supabase | Database and customer authentication | Project, schema, project URL, public key, server-only service-role key |
| Google Cloud Console | Google sign-in | Cloud project, consent screen, OAuth web client ID and secret; provider callback URL |
| Paystack | Payment processing | Merchant account, test credentials, webhook, and live activation before real sales |
| SMTP email provider | Send confirmations with Nodemailer | SMTP host, port, username, password, verified sender/domain |
| Vercel | Host the app | Account, project, environment variables, production deployment |
| GitHub | Recommended source repository for Vercel imports | Private/public repository without secrets |
| Namecheap | Domain registration and DNS | Existing account is enough; buy/use a domain and configure the records Vercel supplies |

Nodemailer is a software library; there is no Nodemailer account to register for. Supabase is sufficient; Neon is not needed alongside it for this version.

## 9. Hosting and launch plan
Use Vercel for this Next.js/Node.js application and Namecheap for the domain. Keep the domain with Namecheap; add it to the Vercel project and copy the exact DNS records Vercel requests into Namecheap Advanced DNS. See README.md for the step-by-step setup.

Use separate test and live projects/keys. Complete tests with Paystack test mode first. Set the final HTTPS address in APP_URL, Supabase allowed redirects, Google OAuth origins and callback settings. Only switch to live payments after activation and operational checks are complete.

## 10. Launch requirements and limits of this starter
This is a working learning starter, not a completed production-commerce operation. Before taking real orders:
- Replace illustrative catalog photography, descriptions and prices with your actual products; verify photo rights and inventory per size.
- Set real delivery coverage, delivery charges, fulfilment procedures, returns/refunds policy, privacy notice and contact details. Current delivery is a sample fixed ₦2,500.
- Verify Google sign-in, confirmed-email registration, Paystack success/failure/duplicate webhooks, SMTP delivery and database isolation with your configured accounts.
- Establish a process to reconcile unpaid/cancelled orders and late payments. Unpaid reservations currently remain until explicitly cancelled; payments received after cancellation need manual review/refund. Add automatic expiry and reconciliation before public trading.
- Add scheduled retry for email jobs marked pending. The current implementation retries on payment verification/webhook replay but has no independent email worker. Concurrent retries may send a duplicate confirmation; add a claimed outbox job and provider idempotency when expanding.
- Add deployment-level abuse protection and monitoring. The starter's session-based login limiter is basic and can be bypassed by clearing cookies.
- Plan backups, secret rotation, privileged owner access, and order support. Customer cart updates currently use read/write operations; add optimistic concurrency or an atomic cart RPC before scaling.

## 11. Excluded from version 1
Discount codes, reviews, wishlists, saved payment cards, multi-vendor selling, international shipping, subscriptions, advanced search, and an admin dashboard. Paystack can support reusable payment authorizations later; this starter never stores card numbers or CVVs.

## 12. Validation status
The application is built and run locally for demo testing. Production build and TypeScript checks are included in verification. Live Supabase, Google, SMTP and Paystack tests require the owner's accounts and credentials. A successful local demo is not proof that those external services are configured.
