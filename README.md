# OM Cellular

> **Current-state documentation — last audited 05 Sep 2026.** This README is an honest, code-verified description of what actually exists. Nothing here is aspirational; every claim was checked against the source, the configured database, and the running builds during this audit. Anything that could not be verified is explicitly marked `❓ NOT VERIFIED`.

Maintenance rule: only the active branch `mern-migration` is maintained. No other branches exist and none should be created.

---

## 1. Project Overview

OM Cellular is a full-stack mobile phone commerce platform with four customer-facing service lines — **Buy Phones**, **Sell Phone**, **Repair**, **Exchange** — plus a complete admin operations panel. It is a classic MERN stack:

- **Client**: React 18 + TypeScript + Vite 5 single-page app (`client/`)
- **Server**: Node.js + Express 4 + TypeScript API (`server/`)
- **Database**: MongoDB Atlas via Mongoose 8
- **Payments**: Razorpay Checkout SDK wired (init → verify → webhook), **currently disabled in the configured environment because no Razorpay keys are set**
- **Hosting targets**: Vercel/Netlify (frontend), Render (backend) — deployment config present, but the live deployments do **not yet run the latest branch code**

The product catalog is a mix of new and refurbished phones with variants (storage/RAM/colour), a server-side phone-valuation engine (225 valuation records), a serviceability (pincode × service) rule engine, and persisted status-history tracking for orders, repairs, sell requests and exchange requests.

**Where the project really stands:** the application is *architecturally complete* and *technically deployable*, and the primary buy + COD flow plus all four service lines work end-to-end against a real MongoDB database. It is **not** business-ready: online payments are unprovisioned, the catalog/CMS content databases are only partially populated, and several mature-platform capabilities (refunds, cancellations, logistics, notifications delivery, fraud controls) are missing.

---

## 2. Current Architecture

```
┌────────────────────────────┐        ┌────────────────────────────────┐
│  React SPA (client/)       │  HTTP  │  Express API (server/)          │
│  Vite + TS + Tailwind      │ ─────► │  REST under /api/v1             │
│  React Router 6 (SPA)      │  JSON  │  JWT cookie auth, CORS allow-list│
│  Zustand (cart/wishlist/   │        │  Mongoose models                │
│    auth in-memory)         │        │  Razorpay init/verify/webhook   │
│  Axios (services/api)      │        │  Multer uploads (server/uploads)│
└────────────┬───────────────┘        └───────────────┬────────────────┘
             │                                        │
             └────────── Vite dev proxy  / -> localhost:5000
                           Production: VITE_API_URL
                                        │
                          ┌─────────────▼─────────────┐
                          │  MongoDB Atlas (Mongoose 8)│
                          └───────────────────────────┘
```

Key architectural decisions (verified):

- **Auth is cookie-based.** Login/refresh issue httpOnly `accessToken` + `refreshToken` cookies; the axios layer also looks for a `localStorage.authToken` which **nothing ever writes** (dead code). In-memory Zustand user is rehydrated on layout mount via `GET /auth/me`, so sessions survive page refresh via the cookies.
- **Cart and wishlist are client-only** (localStorage via Zustand `persist`). There is **no cart model or cart API on the server** — carts are not synced across devices and are not reserved server-side.
- **Orders are created only after checkout.** Stock is decremented and coupon usage incremented at order creation (no Mongo transaction, no stock restore on cancellation).
- **The serviceability engine is database-backed** (ServiceArea) with a deliberate "legacy allow-all" mode when no areas are configured.
- **Admin is fully database-backed.** Every admin page queries real collections; no dummy/mock data was found anywhere (`grep` for `mock|dummy|placeholder|TODO|FIXME` across client + server source → zero matches).

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React (with TypeScript) | 18.3.1 |
| Build tool | Vite | 5.4.x |
| Styling | Tailwind CSS (custom `brand` palette, 44px min tap targets) | 3.4.10 |
| Routing | React Router | 6.26.2 |
| HTTP client | Axios (with 401 → `/auth/refresh` retry) | 1.7.7 |
| State | Zustand (persisted cart + wishlist; in-memory auth) | 4.5.5 |
| Charts | Recharts (admin dashboard) | 2.12.7 |
| Icons / animation / toasts | lucide-react, framer-motion, react-hot-toast | — |
| Backend runtime | Node.js + Express | 4.21.x |
| Language (both) | TypeScript | 5.5.4 |
| ODM | Mongoose | 8.6.x |
| Auth | jsonwebtoken + bcryptjs (12 rounds) + cookie-parser | — |
| Payments | Razorpay node SDK + `checkout.js` (client) | 2.9.8 |
| File uploads | Multer (JPEG/PNG/WebP/GIF, ≤5 MB) | — |
| Security | helmet, CORS allow-list, express-rate-limit (500 req/15 min app-wide) | — |
| Validation | zod (middleware defined but **unused**) | 3.23.8 |

`npm` scripts (verified):

- **Server**: `dev` (tsx watch), `build` (tsc), `start` (`node dist/server.js`), `seed`/`seed:all`, `seed:admin`, `seed:phones`, `seed:repairs`, `seed:products`, `seed:images`, `seed:catalog`
- **Client**: `dev` (vite), `build` (`tsc -b && vite build`), `preview`

---

## 4. Production Environment

| Target | Platform | Config in repo | Status at audit |
|---|---|---|---|
| Frontend | Vercel | `client/vercel.json` and root `vercel.json` — SPA rewrite `/(.*) → /index.html` | Live SPA reachable, but served build is **not the current branch** `❓` |
| Frontend (alt) | Netlify | `netlify.toml` (base `client`, build `npm run build`, publish `dist`, `VITE_API_URL=https://om-cellular.onrender.com/api/v1`) | Not verified |
| Backend | Render | No `render.yaml` in repo — config is dashboard/env only | `/api/health` 200; **new endpoints (e.g. `/api/v1/serviceability/check`) return 404** → production is running an older build ❓ |
| Database | MongoDB Atlas | Connection string via `MONGODB_URI` (server `.env`, gitignored); `database.ts` forces public DNS (8.8.8.8/1.1.1.1) | Connected; used by this audit and by the E2E harness |

Documented origins (from `server/src/config/cors.ts` and `netlify.toml`): `https://om-cellular-iota.vercel.app`, Render backend at `https://om-cellular.onrender.com`. CORS also allow-lists `env.CLIENT_URL`, `env.CLIENT_ORIGINS` (comma-separated), and `localhost:5173/3000`.

⚠️ **Deployment gap (verified):** after pushing the latest code to `mern-migration`, the live frontend/backend did not redeploy. The backend health endpoint works but new routes 404, and the frontend root returns 404 from the configured Vercel project. Likely cause: cloud dashboards are bound to a different branch or require a manual deploy. Until this is resolved, **production does not reflect this repository.**

---

## 5. Current Feature Status (at a glance)

| Feature | Status |
|---|---|
| Browse / filter / search products | ✅ COMPLETE (search suggestions degraded, see Search) |
| Product detail with variants | ✅ COMPLETE |
| Cart (client-side localStorage) | ✅ COMPLETE / 🟡 no server sync |
| Checkout + COD | ✅ COMPLETE |
| Checkout online payment (UPI/NetBanking) | 🟡 PARTIAL — full gateway plumbing exists, **disabled (no keys)** |
| Registration / login / account | ✅ COMPLETE |
| Buy Phone flow | ✅ COMPLETE |
| Sell Phone flow | ✅ COMPLETE (valuation engine real; sell request stores client estimate) |
| Repair flow | ✅ COMPLETE |
| Exchange flow | 🟡 PARTIAL — request + admin valuation, no automated binding |
| Order / repair / sell / exchange tracking | ✅ COMPLETE (persisted status history) |
| Serviceability check + areas | ✅ COMPLETE (DB-backed; allow-all currently as 0 areas) |
| Notify-me requests | ✅ COMPLETE (admin-managed only — no SMS/email sending) |
| Admin panel (≈23 pages, all DB-backed) | ✅ COMPLETE / 🟡 notifications page missing |
| Coupons | 🟡 PARTIAL — backend + checkout wired, **0 coupons in DB** |
| Reviews & ratings | 🟡 PARTIAL — backend + rating hooks, **0 reviews in DB** |
| Wishlist | 🟡 PARTIAL — model + client store, no server route |
| Notifications (in-app) | 🟡 PARTIAL — backend routes exist, no admin UI, no push/email/SMS |
| Homepage CMS | 🟡 PARTIAL — CRUD works, **all CMS collections empty** |
| Online payments (live) | 🔴 NOT ENABLED in current environment |
| Refunds / cancellations | 🔴 MISSING |
| Mobile app (iOS/Android) | 🔴 MISSING (responsive web only) |

---

## 6. Customer Features

| Page/Feature | Route | Verified status |
|---|---|---|
| Landing page | `/` | ✅ Renders products/brands from API; CMS-driven sections fall back to defaults because CMS content is empty |
| Header / desktop nav | — | ✅ sticky; cart + wishlist badge counts; user menu; admin shortcut for admins |
| Mobile bottom navigation | — | ✅ Home / Buy Phones / Sell / Repair / Account (icon-only) |
| Search overlay | — | 🟡 search popover with 250 ms debounce + keyboard nav; model suggestions query an **empty** phone-catalog collection → often empty; brand chips fail over to a hardcoded list |
| Full search page | `/search` | ✅ `GET /products?query=` |
| Buy Phones | `/buy-phones` | ✅ filters (brand/category/condition/price/sort), pagination, real data |
| Product listing | `/products` | ✅ real data |
| Product detail | `/products/:slugOrId` | ✅ variants, stock, images (with fallback), add to cart |
| Cart | `/cart` | ✅ localStorage cart, qty update, empty state |
| Checkout | `/checkout` | ✅ address (saved + new), serviceability check, coupon, COD/online methods, order summary |
| Login / Register | `/login`, `/register` | ✅ register then auto-login; identifier = phone or email |
| Account dashboard | `/account` | ✅ order/sell/repair/exchange counts (API) |
| Profile | `/account/profile` | ✅ name/email/alternate phone; phone deliberately immutable |
| My Orders / Order detail | `/account/orders` | ✅ status timeline, tracking number, address, payment info |
| My Repairs / Sell / Exchange requests | `/account/...` | ✅ status timelines, pickup info |
| Order tracking (public) | `/track-order` | ✅ `GET /orders/track/:orderNumber` |
| Repair tracking (public) | `/repair-track` | ✅ `GET /repairs/track/:bookingNumber` |
| Sell Phone | `/sell-phone` | ✅ 5-step flow; server valuation engine |
| Repair | `/book-repair` | ✅ service catalog → booking (store drop or doorstep pickup), guest allowed |
| Exchange | `/exchange` | ✅ old-device details + optional new-device link; value assigned by admin |
| FAQ / Contact | `/faq`, `/contact` | ✅ static FAQ list; contact form → admin inbox |
| WhatsApp float button | — | ✅ settings-driven |

---

## 7. Buy Phone Flow (verified end to end)

```
Browse/Home ─► Search or filter (GET /products) ─► Product detail (variants, stock)
      ─► Cart (localStorage) ─► Checkout ─► Address (saved address or new form:
          alt phone + landmark + city + state + PIN) ─► Serviceability check (PIN × delivery)
      ─► Coupon (optional) ─► Payment (COD, or Razorpay if enabled)
      ─► POST /orders (stock decrement, shipping/tax from settings, snapshot of address)
      ─► Order confirmed ─► Track (public order number) ─► Admin status progression
```

✅ **Complete** up to order placement and tracking. Verified in E2E: COD order create → status history → public tracking → admin mark paid → ship with tracking number → invalid statuses rejected.

Real gaps in this flow:
- 🟡 Online payment only if Razorpay keys provisioned (currently disabled).
- 🔴 No guest checkout (orders require an account).
- 🔴 No invoice/PDF, no cancellation by customer (only admin), no returns workflow UI (status enum has `RETURN_REQUESTED`/`RETURNED` but no customer action exists).
- 🟡 Stock decrement and coupon usage are **not atomic** and cancelled orders **do not restore stock**.

---

## 8. Sell Phone Flow (verified)

```
Brand ─► Model ─► Condition (+ display/battery/camera/body) ─► Storage/RAM/Age
   ─► server valuation POST /phone-valuations/calculate ─► Pickup details / serviceability (pickupDrop)
   ─► Review ─► POST /sell-requests (stores client-supplied estimatedPrice)
   ─► Admin: INSPECTED / UNDER_REVIEW / APPROVED (finalOfferedPrice) / PICKUP_SCHEDULED / PICKED_UP / PAYMENT_COMPLETED / CANCELLED
```

✅ Complete UI + backend + persisted history.

Real gaps:
- 🟡 The valuation engine is used for the **display estimate only**; the sell request stores whatever the client sends (`estimatedPrice`) — the server never re-validates or binds the official valuation, so an edited client value flows through.
- 🔴 No IMEI capture, no functional test checklist, no payout method, no scheduling backend (admin sets scheduled pickup fields manually), no seller settlement record.

---

## 9. Repair Flow (verified)

```
Service (30 seeded services: startingPrice, duration, warranty, category)
   ─► Device brand/model ─► issue ─► service mode (STORE_DROP | DOORSTEP_PICKUP)
   ─► serviceability check for pickup (if doorstep) ─► pickup fee from settings
   ─► POST /repairs (guest allowed via optionalAuth) ─► bookingNumber
   ─► Track via /repairs/track/:bookingNumber ─► ADMIN: APPROVED / IN_DIAGNOSIS / DIAGNOSED /
       IN_REPAIR / AWAITING_PARTS / COMPLETED / READY_FOR_PICKUP / OUT_FOR_DELIVERY / DELIVERED / CANCELLED
```

✅ Complete with **dual persistence**: embedded `statusHistory` on the booking **and** a separate `RepairStatusHistory` collection. Admin detail page supports technician notes, estimated/final cost, and note-required status updates.

Real gaps:
- 🔴 No technician-facing workflow (no separate staff app; repairs are managed by the same admin panel).
- 🟡 No repair warranty record per device; only the service-level warranty string.
- 🔴 No spare-parts/order-of-parts tracking beyond a status label (`AWAITING_PARTS`).

---

## 10. Exchange Flow (verified)

```
Old device brand/model/condition/storage/RAM ─► optional new-device link (variant)
   ─► POST /exchange-requests ─► admin assigns estimatedExchangeValue / finalExchangeValue/difference
   ─► status: SUBMITTED / UNDER_REVIEW / INSPECTED / APPROVED / REJECTED / PICKUP_SCHEDULED / PICKED_UP / COMPLETED / CANCELLED
```

🟡 **Partial.** The request/tracking side is complete and persisted, but:
- The **old-device valuation is not computed** anywhere at submit time (UI shows no feed from the valuation engine; admin sets figures manually).
- No difference-payment linkage to an actual new-device order.

---

## 11. Cart & Checkout

- ✅ Cart: client-side Zustand persisted to localStorage (`cart`), add/update/remove/clear, count badge, cart page with empty state.
- 🟡 Not stored server-side, not merged across devices, not reserved.
- ✅ Checkout: saved addresses + inline address form (with alternate phone + landmark + city/state/PIN), delivery serviceability check with **"notify me" fallback form**, coupon apply, order notes, order summary with tax + shipping (from settings), and payment method selection.
- ✅ COD is fully functional (order → `paymentStatus PENDING`, `paymentGateway 'cod'`; admin can mark paid).
- 🟡 UPI / Net Banking / "Online": **UI + gateway flow exist but are hidden while Razorpay keys are unset** (see Payments).

---

## 12. Payment System

Classification (must not be over-stated):

| Method | Classification | Evidence |
|---|---|---|
| **COD** | ✅ REAL | `POST /orders` sets `paymentGateway:'cod'`, `paymentStatus:'PENDING'`; admin marks paid → `PAYMENT_CONFIRMED` + `paidAt`, gateway becomes `manual`. Verified in E2E. |
| **UPI / Net Banking / Online(credit-card/wallet via Razorpay)** | 🟡 PARTIAL — plumbing real, **not operationally enabled** | `GET /payments/config` returns `enabled=false` because `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` are empty in `server/.env` (presence-checked, values not logged). Checkout hides online methods & shows "Online payment is temporarily unavailable". |
| **Razorpay order init** | ✅ REAL code | `POST /payments/init` (auth) creates Razorpay order (amount = `total×100` INR, reuses existing `razorpayOrderId`, sets `PENDING_PAYMENT`). |
| **Server-side verification** | ✅ REAL | `POST /payments/verify` HMAC-SHA256 over `razorpayOrderId|paymentId`, then re-fetches from Razorpay (`status==='captured'`, amount match); sets `PAID`, `paidAt`, `razorpaySignature`, gateway `razorpay`, pushes `PAYMENT_CONFIRMED`. Idempotent (`alreadyPaid`). |
| **Webhook** | ✅ REAL code | `POST /payments/webhook` verifies HMAC-SHA256 over **raw body** (`X-Razorpay-Signature`). Handles **only `payment.captured`**, updates order guarded by `paymentStatus $ne 'PAID'` (idempotency). |
| **QR code** | 🟡 PARTIAL | No custom static/dynamic QR checkout. "Scan QR with any UPI app" is inside the Razorpay modal (only when enabled). A `upi_qr_image`/`upi_id` setting exists but is only editable in admin settings — not rendered in checkout. |
| **Refunds** | 🔴 MISSING | No Razorpay refund call. `REFUNDED` is only a manual admin status. |
| **Failed payments** | 🟡 | Signature-verify failure → order set `FAILED`; webhook ignores `payment.failed`. |

**Verdict: payments are NOT production-ready.** Online money movement cannot be exercised in the current environment; only COD is end-to-end real. The gateway *integration layer* is credible (signature verification, webhook with raw-body signing, idempotency) but unproven with real keys.

---

## 13. Serviceability (verified)

- ✅ **Database-backed** `ServiceArea` model: city, state, `pinCodes[]`, `isEnabled`, per-service flags `delivery / repair / pickupDrop / sell / exchange`.
- ✅ Check engine (`services/serviceability.service.ts`): if **zero enabled areas** → legacy allow-all (`configured:false, serviceable:true`); otherwise gating applies and a pincode is serviceable only if listed in an area with that service enabled. 6-digit PIN validation everywhere.
- ✅ Admin CRUD (`/api/v1/serviceability/areas`), customer check (`POST /check`), gate enforced in **orders** (delivery), **repairs** (doorstep pickup), **sell** (pickup when pickup details provided).
- ✅ Notify-me → `ServiceabilityRequest` (WAITING/NOTIFIED/CLOSED) + admin list/update with notes; **admin-managed only — no SMS/email delivery provider exists**.
- ❗ Current DB state: `serviceareas = 0` → the platform is **effectively allow-all** right now. Gate logic was verified in E2E by creating a test area (blocked non-deliverable pincode 400, allowed after enabling). Fixed a real bug during the audit: an area with a service disabled previously returned "not configured" → now correctly treats any enabled area as "configured".

---

## 14. Order & Service Tracking (verified)

| Entity | Status history location | Server updates | Customer visibility |
|---|---|---|---|
| Order | embedded `statusHistory[]` on Order | admin `PUT /orders/:id`; system on create + payment confirm | `GET /orders/track/:orderNumber` (public), account order detail |
| Repair | embedded `statusHistory[]` **and** `RepairStatusHistory` collection | admin `PUT /:id` / `POST /:id/status` | `GET /repairs/track/:bookingNumber` (public), account |
| Sell request | embedded `statusHistory[]` | admin `PUT /|:id` | account |
| Exchange request | embedded `statusHistory[]` | admin `PUT /:id` | account |

Every entry records `status`, `changedAt`, `changedBy` (`SYSTEM|CUSTOMER|ADMIN`), `note`. UI timeline (`components/StatusTimeline.tsx`) renders sorted history and an empty-state. **This is real persisted tracking, not static UI** (verified by E2E: history counts grow and invalid statuses return 400).

Caveats (verified):
- No strict transition map (e.g., `PENDING → DELIVERED` allowed) except: orders block further changes after `DELIVERED`/`CANCELLED`/`RETURNED`.
- No customer-initiated cancellation from any entity. `CANCELLED`/`RETURNED` are admin-only.

---

## 15. Authentication & Security

Implemented (verified):
- `POST /auth/register` — validation (name ≥2, Indian phone `^[6-9]\d{9}$`, password ≥6), unique phone/email, bcrypt **12 rounds**.
- `POST /auth/login` — identifier = **phone or email** + password; sets httpOnly `accessToken` (7 d) + `refreshToken` (30 d) cookies.
- `POST /auth/refresh` — rotates both via refresh cookie (verify JWT → reload user → re-issue).
- `POST /auth/logout` — clears cookies.
- `GET /auth/me` — current user incl. `addresses[]`; `PUT /auth/me` — name/email/alternatePhone only (phone immutable by design; admin account rejected).
- `requireAdmin` middleware enforces `decoded.role === 'ADMIN'` on ~all `/api/v1/customers`, `/analytics`, `/orders` (PUT), `/repairs` (admin), `/sell-requests`, `/exchange-requests`, `/serviceability/areas`, `/settings/all`, `/payments` (n/a), etc.
- Customer ownership checks on order/sell/repair/exchange detail + addresses.
- Cookies: `secure` + `sameSite='none'` in production, `lax` in dev; CORS `credentials:true` with an origin allow-list.

Limitations (verified, none of this is hidden):
- 🔴 No password-change / forgot-password / reset endpoints.
- 🟡 Login has **no dedicated rate limit** (only app-wide 500 req/15 min).
- 🟡 Access token is also returned in the JSON body (cookies are the primary channel, but this widens XSS surface).
- 🟡 Refresh tokens are not versioned/blacklisted server-side → not revocable.
- 🟡 `JWT_SECRET`/`JWT_REFRESH_SECRET` fall back to default dev strings if env is unset (safe only in dev).
- 🟡 Application-wide rate limit `max:500` per 15 min may be tight for production traffic.
- 🟡 Client: `localStorage.authToken` is read but never written (dead code, harmless).
- ⚠️ CMS "includeAll" endpoints hand-roll JWT verification instead of reusing `requireAdmin`.
- 🟡 `validation.ts` (zod) middleware is defined but never used; most validation is manual.

---

## 16. Admin Panel (verified — all real data)

**Dummy data present: NO.** Every admin page queries real MongoDB collections; no hardcoded/mock arrays exist. Dashboard metric cards are `countDocuments`/`aggregate` against live collections.

| Admin page | Route | Data source |
|---|---|---|
| Dashboard | `/admin` | `GET /analytics` — total/today sales, orders, pending, delivered, cancelled, repairs, sell/exchange counts, customers, new customers, products, low stock, serviceability totals, 7-day sales/orders charts, top cities. All DB-backed. **Chart data is DB-backed.** |
| Orders (+detail) | `/admin/orders` | real orders; status + payment + tracking updates (note required), mark paid/failed |
| Customers (+detail) | `/admin/customers` | enriched list (order count, total spent, address) + full profile (orders+items, repairs, sell/exchange, metrics) |
| Products (+edit, variants) | `/admin/products` | real CRUD + variants + images |
| Brands / Categories | `/admin/brands` | real CRUD (soft delete) |
| Repairs (+detail, services) | `/admin/repairs` | real; status/cost/technician notes; repair-services CRUD |
| Sell Requests (+detail) | `/admin/sell-requests` | real; valuation & final offer entry |
| Exchange Requests (+detail) | `/admin/exchange-requests` | real; exchange value entry |
| Service Areas / Requests | `/admin/service-areas`, `/admin/service-requests` | real; area CRUD + notify-me queue |
| Phone Catalog / Valuation | `/admin/phone-catalog`, `/admin/phone-valuation` | real CRUD + valuation rule editor |
| Coupons | `/admin/coupons` | real CRUD (**0 coupons currently in DB**) |
| Inventory | `/admin/inventory` | real — **note: `inventories` collection is empty in current DB**, so the page shows nothing until inventory docs are created (stock lives on ProductVariant) |
| Audit Logs | `/admin/audit-logs` | real (`auditlogs` empty; logs are only written manually) |
| Contact Requests | `/admin/contact-requests` | real |
| Settings | `/admin/settings` | real key/value editor (19 settings keys seeded) |
| CMS (banners/homepage/tests/FAQs/cards) | `/admin/*` | real shared CRUD component; **collections currently empty** |
| Notifications admin UI | — | 🔴 **missing** (bell in admin header is decorative; backend notifications routes exist) |

Admin UX notes: lazy-loaded pages, per-row edit/delete/toggle with inline forms on CMS, note-required status updates, disabled loading states, toast errors. Some pages (ProductEdit, CustomerDetail) are leaner than the rest.

---

## 17. Product & Phone Catalog

**Current database contents (configured Atlas DB, captured 05 Sep 2026 — shared with the dev/E2E environment):**

| Collection | Count | Notes |
|---|---|---|
| `users` | 23 | 1 ADMIN + 22 CUSTOMER |
| `products` | 246 (144 active) | new + refurbished mix |
| `productvariants` | 670 (664 active; all with `stock>0`) | storage/RAM/colour/price/stock |
| `brands` | 19 (all active) | |
| `categories` | 4 (all active) | |
| `repairservices` | 30 | e.g. screen/fix/water listings with pricing + warranty |
| `phonevaluations` | 225 (all active) | valuation rule records |
| `phonecatalogmodels` | 0 | ⚠️ empty → search "models" suggestions empty; catalog page empty. Seed scripts exist (`seed:phones`). |
| `serviceareas` | 0 | engine in allow-all mode |
| `serviceabilityrequests` | 6 (2 WAITING) | |
| `orders` / `orderitems` | 12 / 12 | 3 paid, 4 COD—includes E2E-generated orders |
| `repairbookings` (+`repairstatushistories`) | 17 (19 entries) | |
| `sellrequests` / `exchangerequests` | 14 / 14 | |
| `addresses` | 14 | |
| `coupons` / `reviews` / `notifications` | 0 / 0 / 0 | features backend-ready, unused |
| `banners`/`homepagesections`/`informationcards`/`testimonials`/`faqs` | 0 | CMS empty → homepage falls back to built-in defaults |
| `inventories` / `auditlogs` / `wishlists` | 0 / 0 / 0 | |

Product model: name, slug, brand category, images[], condition, rating, feature flags (new/refurbished/best seller), specs. Variants: sku, price, discountPrice, stock, storage/RAM/colour, condition. Product listing returns per-product summary (lowestPrice, inStock, variantCount, primaryImage).

- Product images: mix of absolute URLs (seeded) and `/uploads/...` paths (admin upload); client has an image-fallback tile.
- **Valuation engine** (real): `POST /phone-valuations/calculate` → base value + storage/RAM adjustments + age depreciation (0/5/10/18/30%) × condition multiplier (NEW 1.00 → POOR 0.45) − accessory/damage deductions, clamped ≥0. 225 DB rule records take precedence over a hardcoded default engine.

---

## 18. Search

- ✅ Full results: `SearchPage` → `GET /products?query=` (name/description/slug) + filters (brand/category/condition/price range/sort). Real pagination (`total/totalPages/hasNext`).
- ✅ Search overlay: product suggestions (`/products?query=&limit=8`) work.
- 🟡 Search overlay: model suggestions (`/phone-catalog?search=`) correct code-path but the model catalog is **empty** → no suggestions; brand chips fall back to a hardcoded list.
- ⚠️ Pagination is implemented **in memory** (loads all matches + slices); fine for the current catalog, poor at scale.
- 🔴 No full-text index, no typo-tolerance, no trending/facet counts, no SEO product pages (SPA).

---

## 19. Mobile UX (verified)

- ✅ Responsive Tailwind layout; dedicated **mobile bottom nav**; 44 px minimum tap targets via global CSS; floating WhatsApp button offset to clear the nav; image/type-safe fallbacks.
- ✅ Product cards, detail, cart, checkout, account pages are mobile-usable; search overlay supports keyboard nav and touch.
- ✅ Loading spinners, empty states (cart/orders/addresses), toast errors, disabled-while-saving buttons.
- 🟡 Admin tables/forms are usable but less mobile-polished (table overflow on narrow screens).
- 🟡 Error handling for background list fetches is mostly silent (`.catch` clears a spinner) — failures may appear as empty lists.
- 🟡 Hard-cling: in-memory auth means first paint after reload briefly shows the account guard before `/auth/me` resolves (mitigated by layouts calling `fetchUser`).

---

## 20. Database Models

All collections use Mongoose default lowercase-plural names. Relationship sketch:

```
User ─┬─ Address (1:N, default flag)
      ├─ Order ── OrderItem ── ProductVariant ── Product ── Brand / Category
      ├─ RepairBooking ── RepairService (+ RepairStatusHistory)
      ├─ SellRequest      ├─ ExchangeRequest ──(optional) ProductVariant
      ├─ ServiceabilityRequest
      ├─ Notification / Review / ContactRequest / Wishlist(no route)
ServiceArea (standalone rules)
PhoneValuation / PhoneCatalogModel (valuation + catalog)
Coupon / Setting / AuditLog / Inventory
CMS: Banner, HomepageSection, InformationCard, Testimonial, FAQ
```

Model inventory (verified to exist): `User, Address, Product, ProductVariant, Brand, Category, Order, OrderItem, RepairService, RepairBooking, RepairStatusHistory, SellRequest, ExchangeRequest, PhoneValuation, PhoneCatalogModel, Coupon, Notification, ContactRequest, AuditLog, Inventory, ServiceArea, ServiceabilityRequest, Review, Wishlist, Setting, Banner, HomepageSection, InformationCard, Testimonial, FAQ`.

- 🔴 `Wishlist` model exists but **no route uses it** (client wishlist is localStorage).
- 🟡 `Inventory` model + `inventory` route exist and write stock to variants, but the collection is empty in the current DB.
- 🛑 There is **no Cart, Payment, Refund, or OrderReturn model** — payments/refunds live as fields on `Order`; cart is client-only.

---

## 21. API Overview

All under `/api/v1`. Auth legend: **pub** = public, **auth** = any logged-in user, **admin** = `requireAdmin`, **opt** = `optionalAuth` (guest allowed).

| Module | Endpoints (abridged) | Access |
|---|---|---|
| auth | `POST /register, /login, /logout, /refresh`, `GET /me`, `PUT /me` | pub / pub / pub / pub / auth / auth |
| products | `GET /` (search/filter/sort/paginate), `GET /:id`, variants CRUD | pub; write+delete admin |
| brands / categories | CRUD | pub read; admin write |
| orders | `POST /`, `GET /`, `GET /:id`, `GET /track/:orderNumber`, `PUT /:id` | auth; track pub; PUT admin |
| repairs | services CRUD, `POST /` (book), `GET /`, track, `POST /:id/status`, `PUT /:id` | opt book; track pub; admin manage |
| sell-requests | `POST /`, `GET /`, `GET /:id`, `PUT /:id` | opt; admin manage |
| exchange-requests | `POST /`, `GET /`, `GET /:id`, `PUT /:id` | opt; admin manage |
| phone-valuations | `GET /`, `POST /calculate`, `GET /:id` + admin CRUD | pub calc; admin write |
| phone-catalog | `GET /` (+`search`), `/brands`, `/models/:brand`, `/admin/all`, CRUD, `POST /seed` | pub read; admin write/seed |
| payments | `GET /config`, `POST /init`, `POST /verify`, `POST /webhook` | pub / auth / auth / pub(signature) |
| addresses | CRUD + `PATCH /:id/default` | auth |
| serviceability | `POST /check`, areas CRUD, requests + `PUT /:id` | check pub; areas admin; requests opt/admin |
| customers | `GET /`, `GET /:id` | admin |
| analytics | `GET /` | admin |
| settings | `GET /` (public subset), `GET /all`, `PUT /` | pub / admin / admin |
| coupons | `GET /`, `GET /validate/:code`, CRUD | admin / pub / admin |
| cms (5 modules) | CRUD | pub read; admin write |
| notifications | `GET /`, `POST /`, `PUT /:id/read`, `PUT /read-all`, `DELETE /:id` | auth / admin / auth |
| contact-requests | `POST /`, admin list + `PUT /:id` | opt / admin |
| audit-logs | `GET /`, `POST /` | admin |
| uploads | `POST /` (image) | admin |
| inventory | `GET /`, `GET /:id`, `PUT /` | admin |
| health | `GET /api/health` | pub |

Client-side freshness note: `services/analytics.service.ts` calls `/analytics/dashboard` but the page calls `/analytics` (the working path) — the service function is unused.

---

## 22. Deployment Architecture

- **Frontend build**: `client` → `tsc -b && vite build` → `dist/`; SPA rewrite configured (`vercel.json`). Vite dev proxies `/api` → `localhost:5000`.
- **Backend build/start**: `tsc` → `node dist/server.js`; serves `/uploads` statically.
- **Env (server)**: `PORT, MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, NODE_ENV, UPLOAD_DIR, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, CLIENT_ORIGINS`. See `server/.env.example` for all keys with comments (values are placeholders, never committed).
- **Env (client)**: `VITE_API_URL` (`client/.env.example`). Netlify sets `https://om-cellular.onrender.com/api/v1` at build time.
- No `render.yaml` — Render is configured via its dashboard.
- Production deploy state: ❓ backend running an older build (new routes 404); frontend reachable but not verified as current.

---

## 23. Environment Variables

| Variable | Where | Required | Notes |
|---|---|---|---|
| `MONGODB_URI` | server | ✅ | Atlas/local URI |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | server | ✅ (strong, random) | fallbacks to dev strings when unset |
| `CLIENT_URL`, `CLIENT_ORIGINS` | server | ✅ | CORS allow-list |
| `PORT`, `NODE_ENV`, `UPLOAD_DIR` | server | — | defaults 5000 / development / uploads |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | server | for online payments | **currently empty** → gateway disabled |
| `ADMIN_PASSWORD` | server (seed only) | seed-time | never stored/logged |
| `VITE_API_URL` | client (build-time) | ✅ | production API base |

Security status: only `.env.example` files are committed (no real secrets). Verified scan found no API keys, passwords, or private keys in the repository.

---

## 24. Testing & Verification

| Check | Result |
|---|---|
| Server TypeScript build (`npm run build` = `tsc`) | ✅ **PASS** (05 Sep 2026) |
| Client build (`npm run build` = `tsc -b && vite build`) | ✅ **PASS** (05 Sep 2026, 2524 modules) |
| `git diff --check` | ✅ **PASS** (no whitespace errors) |
| Lint | ❌ **NOT CONFIGURED** (no ESLint setup in either package) |
| Automated unit/integration tests in repo | ❌ **NOT CONFIGURED** (no test framework or `test` script) |
| Ad-hoc E2E integration harness (temporary, outside repo) | ✅ **PASS 43/43** against live Atlas: serviceability check/gate, notify-me, area CRUD, register/login, addresses, auth/me, sell/exchange/repair with status history, COD order → public tracking → admin mark paid/ship, delivery-gate block/allow, customers enrichment, analytics. This harness is not part of the repository. |
| Production API (`GET /api/health`) | ✅ REACHABLE (200) — but running an older build (`/api/v1/serviceability/check` → 404) |

---

## 25. Known Issues (verified)

1. **Live deployments do not run the current branch** — new backend routes (e.g. `/api/v1/serviceability/check`) return 404 on Render; Vercel frontend did not update. Deploy config/branch binding must be fixed.
2. **Online payments disabled** — Razorpay keys not provisioned; checkout correctly hides online methods.
3. **`phonecatalogmodels` empty** → search model-suggestions and the admin Phone Catalog yield no data (seed script exists).
4. **All CMS collections empty** → homepage/campaign content is default only.
5. **No refunds, no cancellation endpoint, no stock restore on cancel, non-atomic stock/coupon updates.**
6. **Products list pagination is in-memory** (full load + slice) — degrades at scale.
7. **Sell/exchange requests do not bind the server valuation** (estimates are client-supplied / admin-entered).
8. **Customer account gaps**: no password change/reset, no phone change, no guest checkout, no invoice, no returns flow.
9. **Notifications incomplete**: backend routes exist, admin UI missing, no push/email/SMS provider, notify-me is admin-managed only.
10. **Auth hardening**: no login rate limit, access token also in JSON body, refresh tokens not revocable, dev JWT fallbacks.
11. **Dead/inert code**: `localStorage.authToken` read but never written; `validation.ts` (zod) unused; `Wishlist` model unused server-side; `services/analytics.service.ts` targets a non-existent route.
12. **Admin `Inventory` page empty** because the `inventories` collection has no docs (stock lives on variants).
13. Random flakiness of MongoDB Atlas connectivity on the audit network (intermittent `PoolClearedError`) — environmental, worked around with retries.

---

## 26. Incomplete / Partial Features

- **Online payments** — gateway code complete; operationally disabled and unproven.
- **Exchange** — no automated old-device valuation or difference-payment checkout.
- **Sell** — estimate not validated server-side; no inspection checklist/IMEI/payout.
- **Coupons / Reviews / Wishlist / Notifications / CMS content** — code complete, data empty or UI missing.
- **Search suggestions** — model catalog empty.
- **Warranty / Returns** — only status labels, no return/refund workflow.
- **Logistics** — no courier integration, delivery tracking is a manually-entered `trackingNumber`.

---

## 27. Project Completion Score

Scored on **functional completeness** (backend → API → persistence), not visual completeness.

| Category | Status | % | Explanation |
|---|---|---|---|
| Architecture | ✅ | 90% | Clean layered MERN; cookie auth; env-driven; scalable structure. Gaps: in-memory pagination, no transactions. |
| Authentication | 🟡 | 70% | Register/login/refresh/roles solid. Missing: password reset, phone change, login rate limit, revocable refresh. |
| Customer Account | 🟡 | 75% | Profile, addresses, orders/repairs/sell/exchange lists + detail with timelines. No invoice, returns, phone change. |
| Phone Catalog | 🟡 | 70% | 246 products/670 variants/19 brands real. Model catalog (`phonecatalogmodels`) empty; CMS empty. |
| Buy Flow | ✅ | 85% | Browse→detail→cart→checkout→COD order→track all work. Online payment disabled; no guest checkout. |
| Sell Flow | 🟡 | 65% | Full UI + real valuation engine + tracking. Value not server-bound; no IMEI/inspection/payout. |
| Repair Flow | ✅ | 80% | Service catalog, booking, dual status persistence, admin workflow, tracking. No technician app/parts mgmt. |
| Exchange Flow | 🟡 | 55% | Request + admin valuation + tracking only; no automated valuation or payment-of-difference. |
| Cart | 🟡 | 75% | Works client-side. No server sync/reservation. |
| Checkout | 🟡 | 70% | Address/serviceability/coupon/tax/shipping complete. No invoice; online payment disabled. |
| Payments | 🟡 | 45% | COD real; Razorpay wiring credible but disabled; no refunds/failed-event handling. |
| Serviceability | ✅ | 90% | DB areas + per-service rules + gates + notify-me. No real notify delivery. |
| Order Tracking | ✅ | 85% | Persisted history everywhere + public track + admin transitions. No strict transitions/cancel flow. |
| Admin | 🟡 | 80% | All DB-backed (no dummy data), analytics real. No notifications page; inventory empty; audit logs manual. |
| Search | 🟡 | 60% | Full search works; suggestions degraded (empty model catalog); in-memory pagination. |
| Mobile UX | 🟡 | 75% | Bottom nav, tap targets, responsive; admin less polished; some silent errors. |
| Security | 🟡 | 55% | Helmet/CORS/rate-limit/bcrypt/cookies present. Gaps: login limit, token exposure, refresh revoke, zod unused. |
| Production Deployment | 🟡 | 35% | Config present but live deployments not current; online payments unprovisioned. |
| Testing | 🟡 | 40% | Builds pass; 43/43 E2E (external harness); no in-repo automated tests or lint. |

**Overall estimated completion: ≈ 68%**

(The number reflects that this is a real, working system with genuine e-commerce depth — but the "make it production-grade" layer: provisioning payments, catalog/CMS data, refunds/cancellations, notifications delivery, and deployment wiring — is still outstanding.)

---

## 28. Cashify-Like Capability Gap Analysis

Mature used-phone platforms (Cashify-class) typically have: catalog + search + used pricing, a real device-valuation & inspection engine, buy-back with pickup logistics, repair with technician operations, exchange with instant trade-in credit, customer accounts, notifications, refunds/returns, fraud controls, and rich analytics. Position against that:

| Capability | Status | Notes |
|---|---|---|
| A. Buy Phones | 🟡 | Store works; used-brand catalog depth and watchlists/price-drop alerts missing. |
| B. Sell Phones | 🟡 | Request + valuation estimate; no seller payout, no inspection scheduling automation. |
| C. Phone Valuation Engine | 🟡 | Real rule engine (225 records) used for estimates; not authoritative at request time; catalog rows empty. |
| D. Repair | 🟡 | Booking + status + costs solid; no technician mobile flow, parts tracking, repair warranty records. |
| E. Exchange | 🔴→🟡 | Request flow + admin valuation only; no instant trade-in credit toward a new order. |
| F. Product Catalog | 🟡 | 246 products/670 variants; model catalog + images/specs coverage for used phones incomplete. |
| G. Payments | 🟡 | COD real; Razorpay wired but disabled; no refunds, no failed-event handling, no payouts. |
| H. Logistics | 🔴 | No courier integration; only manual tracking numbers; pickup scheduling is manual admin fields. |
| I. Serviceability | 🟡 | Engine is excellent; operational data (areas) empty; no delivery SLA/per-area pricing. |
| J. Customer Account | 🟡 | Solid; missing phone change, password reset, invoices, returns. |
| K. Order Tracking | 🟡 | Persisted & public; no strict transition FSM, no cancellation flow, no delivery provider events. |
| L. Notifications | 🔴→🟡 | In-app model + routes; no customer UI, no push/email/SMS; notify-me is admin-only. |
| M. Admin & Operations | 🟡 | Excellent DB-backed panel; no tiered roles, no inventory movement/audit automation, no queueing. |
| N. Inventory | 🟡 | Variant stock + admin bulk stock; separate inventory ledger empty; no reserve-on-cart or adjustments audit. |
| O. Pricing | 🟡 | Tax/shipping/coupon pricing complete; no dynamic/condition-grade pricing on sell, no price-drop alerts. |
| P. Offers/Coupons | 🟡 | Full coupon engine; zero coupons currently in DB; no referral/applied-offers automation. |
| Q. Reviews/Ratings | 🟡 | Backend + DELIVERED-gated reviews; no reviews in DB; aggregate rating on product exists. |
| R. Warranty/Returns | 🔴 | Only status enums; no return/refund/warranty claim workflow. |
| S. Fraud/Risk | 🔴 | None (no IMEI blacklist, device condition validation, payout verification, velocity checks). |
| T. Analytics | 🟡 | Strong real dashboard; limited to 7-day charts; no funnel/cohort/CSV export. |
| U. SEO | 🔴 | SPA without per-product meta/prerendering; needs SSR/SSG or prerender. |
| V. Performance | 🟡 | Fine at current size; in-memory pagination + no image CDN + no caching are ceiling. |
| W. Mobile UX | 🟡 | Good responsive web; no PWA/offline, no native app. |
| X. Security | 🟡 | Good baseline; needs login limits, token hardening, audit automation, secret rotation. |
| Y. Production Operations | 🔴 | Deploy wiring not current, no monitoring/error tracking (Sentry), no CI pipeline, no staging parity. |

---

## 29. Recommended Next Development Phases

**P0 — Critical / blocking production**
1. Fix deployment wiring so `mern-migration` is what renders on Render + Vercel; verify the new routes live. *Impact:* everything else depends on a real environment.
2. Provision Razorpay keys + webhook secret; run a live UPI payment. *Impact:* unlocks the entire online-payment line; currently that revenue path is disabled.
3. Add seed data / admin onboarding for the empty table-stakes collections: phone catalog models, coupons, reviews, CMS content. *Impact:* homepage, search suggestions, and marketing levers go live.
4. Implement **refunds + cancellation** (admin) and **stock restore on cancel**; atomic stock/coupon updates. *Impact:* fundamental commerce trust and correctness.

**P1 — Important business functionality**
5. Make the phone valuation engine **authoritative** for sell/exchange (server computes and stores value; client edits reviewed by admin afterward).
6. Customer-initiated **returns/refunds** with order flow (RETURN_REQUESTED → approved → REFUNDED via Razorpay).
7. **In-app notification center UI** for customers (backend routes already exist) and an admin broadcast screen.
8. Strict **status transition FSMs** for order/repair/sell/exchange + customer cancellation (with stock restore).
9. **Password reset / change**, login rate-limit, revocable refresh tokens, move token out of the response body.
10. Fill the **inventory ledger** (use the existing model/route) so admin stock + low-stock alerts work.

**P2 — Growth & UX**
11. Server-side pagination for products (`$skip`/`$limit`) + search suggestions from the phone catalog once seeded.
12. Guest checkout (order created then linked to account at login) — currently a hard conversion wall.
13. Real **courier integration** (e.g., Delhivery/Shiprocket) or at least pickup-slot scheduling; replace manual tracking numbers.
14. PWA (offline shell, install), richer product detail (specs tables, image gallery), SEO prerender for product pages.
15. Email/SMS for notifications + notify-me (a provider + templates).

**P3 — Advanced features**
16. Exchange with instant trade-in credit applied to a new order; sell with inspection review app + payout reconciliation.
17. Fraud/risk controls: IMEI validation, duplicate-request detection, payout verification, velocity rules.
18. Analytics expansion: funnels, cohort retention, CSV export, per-brand margin; automated audit logging of every admin action.
19. CI/CD (GitHub Actions build + lint + smoke tests), Sentry/error tracking, staging parity, secret rotation process.
20. Native apps (React Native/Expo) or full PWA offline support; role-based admin access levels.

---

## 30. Current Production Readiness

```
Technically deployable:   YES   (builds pass; E2E runs green vs Atlas; no runtime blockers)
Business-ready:           NO    (online payments disabled; catalog/CMS/loyalty data empty;
                                 no refunds/cancellations/logistics; deploy not live)
Cashify-level mature:     NO    (see Gap Analysis — F, G, H, L, S, U, Y are the big distances)
Overall verdict:          CONDITIONALLY READY
```

Conditionally ready means: **if** the P0 items above are completed (deploy wiring, Razorpay provisioning, critical data seeding, refund/cancel basics) the platform could support real customers for the COD + buy/sell/repair/exchange lines. Until then it is a *well-built, well-tested system that has not yet been cut over to production traffic*.

---

## 31. Final Audit Summary

- **What this is:** a genuine, working MERN application with four service lines, real DB-backed admin, auth, serviceability, valuation engine, and persisted tracking. 43/43 E2E checks pass; builds are clean; no dummy data; no secrets committed.
- **What it is not yet:** production-provisioned commerce. Payments are unprovisioned, deployments lag the branch, and maturity features (refunds, logistics, notifications delivery, fraud controls, SEO, native apps) are ahead.
- **Single biggest lever:** cut over the deployment to this branch and provision Razorpay — after that, the honest "completeness" climbs immediately from ~68% toward ~80%+ because the remaining gaps are incremental rather than architectural.

---

*Key file anchors: client routing `client/src/App.tsx`; layout guards `client/src/layouts/{AccountLayout,AdminLayout}.tsx`; api layer `client/src/services/api.ts`; payment client `client/src/pages/shop/CheckoutPage.tsx` + `client/src/services/payment.service.ts`; server entry `server/src/app.ts`; auth `server/src/routes/auth.ts` + `server/src/middleware/auth.ts`; serviceability `server/src/services/serviceability.service.ts`; payments `server/src/routes/payments.ts`; analytics `server/src/routes/analytics.ts`; database config `server/src/config/database.ts`; env `server/src/config/env.ts` + both `.env.example`.*
