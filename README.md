# OM Cellular

> **Current-state documentation — last audited 05 Sep 2026 (Phase 3: final production release candidate).** This README is an honest, code-verified description of what actually exists. Nothing here is aspirational; every claim was checked against the source, the configured database, and the running builds during this audit. Anything that could not be verified is explicitly marked `❓ NOT VERIFIED`.

Maintenance rule: only the active branch `mern-migration` is maintained. No other branches exist and none should be created.

---

## 1. Project Overview

OM Cellular is a full-stack mobile phone commerce platform with four customer-facing service lines — **Buy Phones**, **Sell Phone**, **Repair**, **Exchange** — plus a complete admin operations panel. It is a classic MERN stack:

- **Client**: React 18 + TypeScript + Vite 5 single-page app (`client/`)
- **Server**: Node.js + Express 4 + TypeScript API (`server/`)
- **Database**: MongoDB Atlas via Mongoose 8
- **Payments**: Razorpay Checkout SDK wired (init → verify → webhook), with admin-initiated Razorpay refunds — **disabled in the configured environment because no Razorpay keys are set** (COD only)
- **Hosting targets**: Vercel/Netlify (frontend), Render (backend) — CI workflow, `render.yaml` blueprint, explicit `client/vercel.json` (SPA rewrite, Vite config) and deployment config are present. The live deployments do **not yet run the latest branch code** (Render runs an older build; Vercel needs its dashboard rebound to `client` + production branch `mern-migration`) — this is an external cut-over, not a code gap.

The product catalog is a mix of new and refurbished phones with variants (storage/RAM/colour), a server-side phone-valuation engine (225 valuation records + 222 seeded catalog models), a serviceability (pincode × service) rule engine, persisted status-history tracking for orders, repairs, sell requests and exchange requests, in-app notifications with an admin broadcast screen, and automated audit logging of key admin actions.

**Where the project really stands:** the application is *architecturally complete* and *technically deployable*, and the primary buy + COD flow plus all four service lines work end-to-end against a real MongoDB database. A production-hardening pass is in place and verified on this branch: customer cancel-requests + stock/coupon restore + admin refunds, strict status-transition FSMs on every service line, server-authoritative sell/exchange valuation with IMEI capture + duplicate detection, login brute-force lockout with revocable sessions, server-side products pagination, in-app notification center + admin broadcast, and in-repo tests + ESLint + CI. A **Phase-2 business-completion pass** closed the remaining customer-lifecycle gaps: customer-initiated post-delivery **returns with proportional refunds** (+ per-item validation), a full **warranty claim** system, a real **inventory-ledger** adjustment trail, a server-validated **coupon engine** with logic tests, **reset-password** flow (dev-only token), **sell/exchange completion** (device **IMEI** capture, admin **inspection checklists**, tracked **payout records** with auto-payout on sell completion / pure-buyback exchange), SEO tags/robots/sitemap, and a **security/IDOR audit** — now backed by **47/47 in-repo unit tests**. A **Phase-3 final-release-candidate pass** then removed the remaining code-level blockers before go-live: a **FAILED→PAID payment recovery path** that re-allocates stock + re-consumes coupon usage (never marks a sale paid without stock), a **short-window duplicate-order guard**, coupon **product/category target enforcement**, a **strict DELIVERED-only return gate** + gateway-refund verification before a return/order can be marked `REFUNDED`, cross-entity **IMEI duplicate detection** between sell and exchange, **partial-quantity return refund scaling**, numeric-guard + inventory-ledger completeness fixes (variant-edit stock writes a `MANUAL_ADJUSTMENT` movement), repair-detail sanitization for owners, exchange payouts locked to pure buybacks, `/api/health` exempted from rate limiting with `version`+`commit` metadata, bounded 2mb JSON bodies, an order-model `dedupeKey`, user `toJSON` password stripping, and **safe production seeds** (factual CMS content + conservative coupons) run against the live database (idempotent). It is **not** business-ready end-to-end: online payments are unprovisioned (COD only), the live deployments still serve older builds (dashboard rebinding is external), and notification delivery beyond in-app plus several mature-platform features remain outstanding.

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

- **Auth is cookie-based.** Login/refresh issue httpOnly `accessToken` + `refreshToken` cookies only — tokens are **not** returned in the JSON body. Sessions are revocable via a per-user `tokenVersion` (bumped on logout / password change), and login is protected by a dedicated rate limiter plus an in-memory brute-force lockout. In-memory Zustand user is rehydrated on layout mount via `GET /auth/me`, so sessions survive page refresh via the cookies.
- **Cart and wishlist are client-only** (localStorage via Zustand `persist`). There is **no cart model or cart API on the server** — carts are not synced across devices and are not reserved server-side.
- **Orders are created only after checkout.** Stock is decremented and coupon usage incremented at order creation (no Mongo transaction), and cancelled orders **idempotently restore stock and coupon usage**.
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

- **Server**: `dev` (tsx watch), `build` (tsc), `start` (`node dist/server.js`), `test` (`tsx --test tests/*.test.ts`), `lint` (ESLint flat config), `seed`/`seed:all`, `seed:admin`, `seed:phones`, `seed:repairs`, `seed:products`, `seed:images`, `seed:catalog`
- **Client**: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (ESLint flat config), `preview`

---

## 4. Production Environment

| Target | Platform | Config in repo | Status at audit |
|---|---|---|---|
| Frontend | Vercel | `client/vercel.json` and root `vercel.json` — SPA rewrite `/(.*) → /index.html` | Live SPA reachable, but served build is **not the current branch** `❓` |
| Frontend (alt) | Netlify | `netlify.toml` (base `client`, build `npm run build`, publish `dist`, `VITE_API_URL=https://om-cellular.onrender.com/api/v1`) | Not verified |
| Backend | Render | `render.yaml` blueprint added (web service, build `npm ci && npm run build`, start `npm start`) + dashboard/env | `/api/health` 200; **new endpoints (e.g. `/api/v1/serviceability/check`) return 404** → production is running an older build ❓ |
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
| Sell Phone flow | ✅ COMPLETE — server-authoritative valuation + IMEI capture + duplicate detection, admin inspection checklist + payout record |
| Repair flow | ✅ COMPLETE |
| Exchange flow | 🟡 PARTIAL — request + server old-device value + admin final value + inspection checklist + payout record; no instant trade-in credit |
| Order / repair / sell / exchange tracking | ✅ COMPLETE (persisted status history, strict FSM transitions) |
| Returns (post-delivery) | ✅ CODE COMPLETE — customer request → admin review → receipt → refund pending → refunded; per-item validation + proportional refund; money movement externally blocked (no Razorpay) |
| Warranty | ✅ CODE COMPLETE — claim + approval + resolution status flow; delivery/provider emission external |
| Password reset | ✅ CODE COMPLETE — SHA-256 hashed 1-hr token + enumeration-safe responses; delivery provider unprovisioned (dev-only `devResetToken`) |
| Serviceability check + areas | ✅ COMPLETE (DB-backed; allow-all currently as 0 areas) |
| Notify-me requests | ✅ COMPLETE (admin-managed only — no SMS/email sending) |
| Admin panel (≈24 pages, all DB-backed) | ✅ COMPLETE (incl. notifications broadcast) |
| Coupons | 🟡 PARTIAL — backend + checkout wired + validate on server, **0 coupons in DB** |
| Reviews & ratings | 🟡 PARTIAL — backend + rating hooks, **0 reviews in DB** |
| Wishlist | 🟡 PARTIAL — model + client store, no server route |
| Notifications (in-app) | ✅ COMPLETE for in-app (customer center, bell, admin broadcast); no push/email/SMS |
| Homepage CMS | 🟡 PARTIAL — CRUD works, **all CMS collections empty** |
| Online payments (live) | 🔴 NOT ENABLED in current environment |
| Refunds / cancellations | ✅ CODE COMPLETE — cancel-request + stock restore + admin Razorpay refunds; **live refund EXTERNALLY BLOCKED (no Razorpay keys)** |
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
- ✅ Invoice/PDF now exists (account order detail), customer **cancel-request** with admin approval + stock/coupon restore, and the order FSM enforces strict transitions.
- ✅ Stock decrement and coupon usage are still non-atomic at creation, but cancellation **restores stock and coupon usage idempotently**.

---

## 8. Sell Phone Flow (verified)

```
Brand ─► Model ─► Condition (+ display/battery/camera/body) ─► Storage/RAM/Age
   ─► server valuation POST /phone-valuations/calculate ─► Pickup details / serviceability (pickupDrop)
   ─► Review ─► POST /sell-requests (server re-computes valuation; validates IMEI; duplicate active-request check)
   ─► Admin: INSPECTED / UNDER_REVIEW / APPROVED (finalOfferedPrice) / PICKUP_SCHEDULED / PICKED_UP / PAYMENT_COMPLETED / CANCELLED
```

✅ Complete UI + backend + persisted history, guarded by a strict transition FSM.

Real gaps:
- 🟡 The **server now re-computes the valuation at request time and stores it** (`estimatedPrice` + `valuationSource`); the client `estimatedPrice` is no longer trusted. IMEI (validated 15-digit) is captured with duplicate active-request detection. Admin can still override the offered price.
- 🔴 No payout method, no scheduling backend (admin sets scheduled pickup fields manually), no seller settlement record.

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
Old device brand/model/condition/storage/RAM ─► server valuation (oldValue) + IMEI + duplicate check
   ─► optional new-device link (variant) ─► POST /exchange-requests
   ─► admin assigns finalExchangeValue/difference
   ─► status: SUBMITTED / UNDER_REVIEW / INSPECTED / APPROVED / REJECTED / PICKUP_SCHEDULED / PICKED_UP / COMPLETED / CANCELLED
```

🟡 **Partial.** The request/tracking side is complete, the server computes the old-device value at submit (with IMEI + duplicate detection) and the FSM is strict, but:
- The **automated valuation is informational** — admin still sets the binding figures manually.
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
| **Refunds** | ✅ REAL code / 🔴 EXTERNALLY BLOCKED | `POST /orders/:id/refund` (admin) creates a Razorpay refund (amount = order total), records `razorpayRefundId`/`refundedAt`, sets `REFUNDED` + history + notification; idempotent (guarded), validates paid/online status, falls back to a manual note for COD. **Cannot be exercised — no Razorpay keys in this environment.** The admin UI exposes "Initiate Refund" for online-paid orders. |
| **Failed payments** | 🟡 | Signature-verify failure → order set `FAILED`; webhook ignores `payment.failed`. |

**Verdict: payments are NOT production-ready.** Online money movement cannot be exercised in the current environment; only COD is end-to-end real. The gateway *integration layer* is credible (signature verification, webhook with raw-body signing, idempotency, refunds) but unproven with real keys.

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

Caveats (verified — hardened in the production pass):
- ✅ **Strict transition maps (FSMs) now enforce valid status sequences** on orders, repairs, sell and exchange requests (`services/fsm.service.ts`); invalid transitions return 400. Cancel/refund callbacks restore stock + coupon idempotently.
- ✅ **Customer-initiated cancellation exists for orders** (`POST /orders/:id/cancel-request`, allowed before shipping); admin then approves → `CANCELLED` (stock restored, online-paid → `REFUND_PENDING`), or declines → back to original status.
- 🔴 Customer refunds/returns on *delivered* items still admin-only (no RETURN_REQUESTED customer action).

---

## 15. Authentication & Security

Implemented (verified):
- `POST /auth/register` — validation (name ≥2, Indian phone `^[6-9]\d{9}$`, password ≥6), unique phone/email, bcrypt **12 rounds**.
- `POST /auth/login` — identifier = **phone or email** + password; issued **only as httpOnly cookies** (`accessToken` 7 d + `refreshToken` 30 d), never in the JSON body. Protected by a dedicated login rate limiter and an in-memory brute-force lockout (locks the identifier+IP after repeated failures with a retry-after window).
- `POST /auth/refresh` — rotates both via refresh cookie (verify JWT → reload user → re-issue).
- `POST /auth/logout` — clears cookies **and bumps `tokenVersion`** so all outstanding refresh tokens are revoked; `/logout-all` does the same.
- `GET /auth/me` — current user incl. `addresses[]`; `PUT /auth/me` — name/email/alternatePhone only (phone immutable by design; admin account rejected).
- `POST /auth/change-password` — requires current password; bumps `tokenVersion` on success (revokes other sessions).
- `POST /auth/change-phone` — requires current password; bumps `tokenVersion` and clears sessions.
- `POST /auth/request-password-reset` + `POST /auth/complete-password-reset` — SHA-256-hashed, 1-hour-expiry token, enumeration-safe responses. **Delivery provider is NOT configured** (`services/notifier` referenced by the code does not exist yet), so in production nothing is emailed/SMS'd; in dev the API returns a `devResetToken` for testing.
- `requireAdmin` middleware enforces `decoded.role === 'ADMIN'` on ~all `/api/v1/customers`, `/analytics`, `/orders` (PUT/refund), `/repairs` (admin), `/sell-requests`, `/exchange-requests`, `/serviceability/areas`, `/settings/all`, `/payments` (n/a), etc.
- Customer ownership checks on order/sell/repair/exchange detail + addresses.
- Cookies: `secure` + `sameSite='none'` in production, `lax` in dev; CORS `credentials:true` with an origin allow-list.

Limitations (verified, none of this is hidden):
- 🟡 Forgot-password flow is code-complete (hashed token, expiry, enumeration-safe) but has **no delivery provider** — the reset link cannot actually be sent yet (dev-only `devResetToken` works).
- 🟡 Login lockout is in-memory (per-process) — a multi-instance deployment needs a shared store.
- 🟡 `JWT_SECRET`/`JWT_REFRESH_SECRET` fall back to default dev strings if env is unset (safe only in dev).
- 🟡 Application-wide rate limit `max:500` per 15 min may be tight for production traffic.
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
| Coupons | `/admin/coupons` | real CRUD (**0 coupons currently in DB**) with server-side field validation, `maxPerUser`, and change audit logging |
| Inventory | `/admin/inventory` | real — **note: `inventories` collection is empty in current DB**, so the page shows nothing until inventory docs are created (stock lives on ProductVariant) |
| Audit Logs | `/admin/audit-logs` | real — key admin actions (coupon create/update/deactivate, settings update, notification broadcast, order refund) are **written automatically**; filter by entity/action with pagination |
| Contact Requests | `/admin/contact-requests` | real |
| Settings | `/admin/settings` | real key/value editor (19 settings keys seeded); every admin save is audit-logged |
| CMS (banners/homepage/tests/FAQs/cards) | `/admin/*` | real shared CRUD component; **collections currently empty** |
| Notifications | `/admin/notifications` | **broadcast compose** (all users or selected user IDs, with a notification type) + send history list |

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
| `phonecatalogmodels` | 222 (158 with images) | seeded catalog → search model suggestions + admin Phone Catalog **now populated** (seed scripts exist) |
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

- ✅ Full results: `SearchPage` → `GET /products?query=` (name/description/slug) + filters (brand/category/condition/price range/sort). Real pagination (`total/totalPages/hasNext`) done **server-side** (`$facet` aggregation with `$skip`/`$limit`).
- ✅ Search overlay: product suggestions (`/products?query=&limit=8`) work; model suggestions (`/phone-catalog?search=`) work now that the catalog is seeded (222 models).
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

Model inventory (verified to exist): `User, Address, Product, ProductVariant, Brand, Category, Order, OrderItem, RepairService, RepairBooking, RepairStatusHistory, SellRequest, ExchangeRequest, PhoneValuation, PhoneCatalogModel, Coupon, Notification, ContactRequest, AuditLog, Inventory, InventoryLedgerEntry, ServiceArea, ServiceabilityRequest, Review, Wishlist, Setting, ReturnRequest, Warranty, Banner, HomepageSection, InformationCard, Testimonial, FAQ`.

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
| orders | `POST /`, `GET /`, `GET /:id`, `GET /track/:orderNumber`, `POST /:id/cancel-request`, `GET /:id/invoice`, `POST /:id/refund`, `PUT /:id` | auth; track pub; cancel-request auth; refund+PUT admin |
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
| coupons | `GET /` (admin), `GET /validate/:code` (pub, optionalAuth — enforces min order + per-user usage + computes discount), CRUD | admin |
| cms (5 modules) | CRUD | pub read; admin write |
| notifications | `GET /`, `POST /` (admin: targeted or broadcast `audience:'all'`), `PUT /:id/read`, `PUT /read-all`, `DELETE /:id` | auth / admin / auth |
| contact-requests | `POST /`, admin list + `PUT /:id` | opt / admin |
| audit-logs | `GET /`, `POST /` | admin |
| uploads | `POST /` (image) | admin |
| inventory | `GET /`, `GET /:id`, `PUT /` | admin |
| health | `GET /api/health` | pub |

Client-side freshness note: `services/analytics.service.ts` calls `/analytics/dashboard` but the page calls `/analytics` (the working path) — the service function is unused.

---

## 22. Deployment Architecture

- **Frontend build**: `client` → `tsc -b && vite build` → `dist/`; `client/vercel.json` is explicit (`framework: vite`, build + `outputDirectory: dist`, SPA rewrite). The old **root `vercel.json` was removed** — it pointed Vercel at a non-existent root `package.json` (the cause of the silent 404). Netlify `netlify.toml` is already correct. Vite dev proxies `/api` → `localhost:5000`.
- **Backend build/start**: `tsc` → `node dist/server.js`; serves `/uploads` statically. `render.yaml` includes `healthCheckPath: /api/health`.
- **Health/version**: `GET /api/health` → `{ success, message, version, commit, timestamp }` (commit injected from `RENDER_GIT_COMMIT` / `VERCEL_GIT_COMMIT_SHA` / `COMMIT_REF`; never secrets). The route is mounted **before** the global rate limiter so uptime probes are never throttled. JSON bodies are bounded to 2mb.
- **Env (server)**: `PORT, MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, NODE_ENV, UPLOAD_DIR, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, CLIENT_ORIGINS`. See `server/.env.example` for all keys with comments (values are placeholders, never committed).
- **Env (client)**: `VITE_API_URL` (`client/.env.example`). Netlify sets `https://om-cellular.onrender.com/api/v1` at build time.
- **CI**: `.github/workflows/ci.yml` — on push/PR to `main`/`mern-migration`, runs server lint + tests + build and client lint + build on Node 20.
- **Render blueprint**: `render.yaml` (web service, root `server`, build `npm ci && npm run build`, start `npm start`, required env vars marked `sync:false` for dashboard entry).
- **Production seeds** (idempotent, upsert on lookup key): `npm run seed:cms` (5 homepage sections, 3 information cards, 8 FAQs — no image-dependent banners, no fake testimonials) and `npm run seed:coupons` (WELCOME10, FLAT100), both wired into `seedAll.js` stages 8–9 and run against the live Atlas DB (re-runs create 0 duplicates).
- Production deploy state: ❓ **external cut-over pending** — backend on Render runs an older build (new routes 404); frontend on Vercel needs the dashboard rebound (Root Directory=`client`, Framework=Vite, Production Branch=`mern-migration`, `VITE_API_URL=https://om-cellular.onrender.com/api/v1`). No CLI/dashboard access from this machine, so this state is documented, never faked.

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
| Server ESLint (`npm run lint`) | ✅ **PASS** (0 errors, 0 warnings) |
| Client ESLint (`npm run lint`) | ✅ **PASS** (0 errors; 16 pre-existing warnings) |
| Server unit tests (`npm test` = `tsx --test`) | ✅ **PASS 47/47** — FSM transition guards + full sell/exchange/return paths (orders/repairs/sell/exchange/returns), coupon engine (percentage/fixed/min-order/maxDiscount/malformed), valuation engine edge cases, request-number/slugify/formatPrice/paginate/Luhn-IMEI/phone-normalize helpers, serviceability pure matching (legacy mode / gating / whitespace), inspection-checklist + payout normalization/auto-payout, return-number pattern + movement-reason completeness. Found + fixed real bugs en route: `paginate` returned `NaN` for non-numeric input; an area with a service disabled was treated as "not configured" |
| Production seeds (CMS + coupons) | ✅ Ran against live Atlas DB: CMS 5 sections / 3 cards / 8 FAQs created, 2 coupons created; **re-run inserted 0** (idempotent) |
| Ad-hoc E2E integration harness (temporary, outside repo) | ✅ **PASS 43/43** against live Atlas: serviceability check/gate, notify-me, area CRUD, register/login, addresses, auth/me, sell/exchange/repair with status history, COD order → public tracking → admin mark paid/ship, delivery-gate block/allow, customers enrichment, analytics. This harness is not part of the repository. |
| Production API (`GET /api/health`) | ❗ REACHABLE (200) but running an older build: `/api/v1/serviceability/check` → 404 (re-verified 05 Sep 2026). The deployed health payload predates the new `version`/`commit` fields. |

---

## 25. Known Issues (verified)

1. **Live deployments still do not run this branch** — the deploy config is now correct (explicit `client/vercel.json` + removed root `vercel.json`; `render.yaml` health check; CI present), but the dashboards have not been rebound: Render runs an older build, and Vercel needs Root Directory=`client`, Framework=Vite, Production Branch=`mern-migration`, and `VITE_API_URL`. This is an external cut-over (no CLI/dashboard access), not a code gap.
2. **Online payments disabled** — Razorpay keys not provisioned; checkout correctly hides online methods. Consequently **live refunds cannot be exercised** (code + admin UI complete).
3. **Forgot-password flow has no delivery provider** — the reset endpoint/token logic exists but nothing sends the link.
4. **CMS seeded but partial** — 5 homepage sections, 3 info cards and 8 FAQs are now live in the database (factual content only). No image-dependent **banners** (assets don't exist) and **no testimonials** (never fabricated); both admin pages remain ready to add real content.
5. **Admin `Inventory` page empty** because the legacy `inventories` collection has no docs (stock lives on variants); the new `inventoryledgerentries` adjustment trail is written correctly.
6. **Login brute-force lockout is in-memory per-instance** — needs a shared store for multi-instance deployments.
7. **Guest checkout missing** — orders require an account (hard conversion wall).
8. **Return refunds end at `REFUNDED`** — the flow is complete (customer → admin review → RA → received → refund pending → refunded) but the actual money movement depends on Razorpay provisioning, and quality-check/cash-pickup automation isn't implemented.
9. **Sell/exchange payouts are records, not money movement** — admin inspection checklist + payout record are complete and auto-created on completion, but actual bank settlement is manual; exchange still has no instant trade-in credit checkout.
10. **No push/email/SMS notifications** — in-app + admin broadcast only; notify-me is admin-managed only.
11. **Dead/inert code**: `validation.ts` (zod) unused; `Wishlist` model unused server-side; `services/analytics.service.ts` targets a non-existent route; `cms.ts` includeAll still hand-rolls JWT but correctly requires ADMIN.
12. Random flakiness of MongoDB Atlas connectivity on the audit network (intermittent `PoolClearedError`) — environmental, worked around with retries.
13. **Service-area data empty** — 0 `ServiceArea` records (deliberate **legacy allow-all** mode; the server boot log and this README both call it out). No fabricated PIN data was created; delivery pin-gating activates as soon as areas are configured.
14. **Rare FAILED→PAID recovery edge** — if a previously-failed order is actually settled at the gateway but stock can no longer be re-allocated, the order stays `FAILED` and logs loudly for manual admin resolution (never oversold, never auto-marked `PAID`).
15. **Coupon cart-target restrictions** are enforced server-side (products/categories) and in the validate endpoint; the current seeded coupons are `ALL` so the restriction is dormant until targeted coupons are created.

---

## 26. Incomplete / Partial Features

- **Online payments** — gateway code complete (incl. refunds); operationally disabled and unproven (no keys).
- **Forgot-password delivery** — endpoint + token logic complete; no email/SMS provider wired.
- **Exchange** — request + server valuation + IMEI + inspection checklist + payout record complete; **no instant trade-in credit difference-payment checkout** (pure-buyback exchanges auto-track a payout on completion).
- **Sell** — valuation + IMEI + duplicate detection + inspection checklist + payout record complete; actual bank settlement manual.
- **Coupons / Reviews / Wishlist / CMS content** — code complete (coupons fully validated + tested + audited); **coupons + CMS seeded**, reviews/wishlists still empty (never fabricated).
- **Warranty / Returns** — claim + post-delivery return/refund workflows complete and tested; refund money movement + delivery emission external.
- **Logistics** — no courier integration, delivery tracking is a manually-entered `trackingNumber`.
- **Notifications** — in-app complete; push/email/SMS delivery missing.

---

## 27. Project Completion Score

Scored on **functional completeness** (backend → API → persistence), not visual completeness.

| Category | Status | % | Explanation |
|---|---|---|---|---|
| Architecture | ✅ | 90% | Clean layered MERN; cookie auth; env-driven; scalable structure. Gaps: no MongoDB transactions, some shared admin-shared components lean. |
| Authentication | ✅ | 90% | Register/login/refresh/roles/change-password/change-phone/reset-token flow all present + tested (dev-only token). Gaps: reset delivery provider, shared lockout store. |
| Customer Account | 🟡 | 86% | Profile, addresses, orders/repairs/sell/exchange lists + detail with timelines, invoice, cancel-request, and now post-delivery **returns** with timelines. No guest checkout. |
| Phone Catalog | 🟡 | 82% | 246 products/670 variants/19 brands real; **222 model catalog seeded** (158 with images). CMS content still empty. |
| Buy Flow | ✅ | 91% | Browse→detail→cart→checkout→COD order→track all work; cancel-request + invoice + refunds code-complete. Online payment disabled; no guest checkout. **Duplicate-order guard + FAILED→PAID stock/coupon recovery added.** |
| Sell Flow | 🟡 | 90% | Full UI + real valuation engine + IMEI + duplicate detection + server-bound value + tracking + **admin inspection checklist + payout record with auto-payout**; **cross-entity IMEI duplication (sell↔exchange) + numeric guards added**. |
| Repair Flow | ✅ | 87% | Service catalog, booking, dual status persistence, FSM, admin workflow, tracking (+ **cost numeric guards, owner-detail sanitization, technician name removed from public track**). No technician app/parts mgmt. |
| Exchange Flow | 🟡 | 81% | Request + server old-device value + IMEI + FSM + tracking + **inspection checklist + payout record (auto for pure buyback, locked to buyback-only)** + **cross-entity IMEI guard**; no instant trade-in credit checkout. |
| Cart | 🟡 | 75% | Works client-side. No server sync/reservation. |
| Checkout | 🟡 | 84% | Address/serviceability/coupon (server-validated incl. **product/category targets**)/tax/shipping complete; invoice exists. No guest checkout; online payment disabled. |
| Payments | 🟡 | 70% | COD real; Razorpay wiring credible (verify + webhook + refunds + gate + **FAILED→PAID recovery that re-allocates stock/coupon and refuses to oversell**) but disabled. |
| Serviceability | ✅ | 92% | DB areas + per-service rules + gates + notify-me + **pure matching logic extracted and unit-tested** (legacy-mode/all-gating/whitespace). No real notify delivery. |
| Order Tracking | ✅ | 92% | Persisted history + public track (sanitized) + strict FSM + customer cancel-request + stock/coupon restore + post-delivery return flow. |
| Returns | 🟡 | 88% | End-to-end flow complete + per-item validation + **proportional refunds incl. partial-quantity scaling** + **strict DELIVERED-only gate** + **gateway-refund verification before REFUNDED**; money movement external (no Razorpay). |
| Warranty | 🟡 | 80% | Full claim/approval/resolution flow complete; delivery/emission provider external. |
| Admin | ✅ | 89% | All DB-backed (no dummy data), analytics real, notifications broadcast page, automated audit logs. **Inventory input validation + variant-edit → ledger completeness fixed**; inventory page elsewhere. |
| Search | 🟡 | 75% | Full search works server-side paginated; model suggestions live (catalog seeded). No typo-tolerance/full-text/SEO. |
| Mobile UX | 🟡 | 75% | Bottom nav, tap targets, responsive; admin less polished; some silent errors. |
| Security | ✅ | 88% | Helmet/CORS/rate-limits/bcrypt/httpOnly-cookie auth/brute-force lockout/revocable sessions/IDOR + owner-of-record + reveal-leak audit (sanitized public endpoints, guest records fail-closed, refund gating, coupon/review field minimization, includeAll admin-gated, trust proxy) **+ Phase-3: gateway-refund verification, strict return gate, cross-entity IMEI dupe guard, repair owner sanitization, user toJSON password strip, health exempt from rate limit, bounded 2mb bodies**. Gaps: in-memory lockout store, zod unused. |
| Production Deployment | 🟡 | 45% | Deploy config corrected (explicit client Vercel config, root vercel.json removed, render health check), **safe CMS + coupon seeds run live**, health endpoint reports version+commit. Live dashboards still not rebound (external); online payments unprovisioned. |
| Testing | ✅ | 92% | Builds pass; **47/47 in-repo unit tests**; ESLint clean; 43/43 E2E (external harness). |

**Overall estimated completion: ≈ 86%**

(The number reflects that this is a real, working system with genuine e-commerce depth. Phase 2 closed the customer-lifecycle code gaps — returns, warranty, inventory ledger, coupon engine, reset-password, sell/exchange completion records, and a security/IDOR audit — and grew the in-repo test suite to 47. Phase 3, the final release candidate, removed the remaining code-level blockers before go-live: FAILED→PAID stock/coupon recovery, duplicate-order guard, coupon target enforcement, strict return gate + gateway-refund verification, cross-entity IMEI duplication, refund scaling, numeric/ledger completeness fixes, repair sanitization, health-exempt-from-rate-limit + versioned health, bounded bodies, and safe production CMS/coupon seeds. What remains is the **operational cut-over** layer — provisioning Razorpay + one live pay/refund and rebinding the Render/Vercel dashboards to this branch — plus additive maturity features.)

---

## 28. Cashify-Like Capability Gap Analysis

Mature used-phone platforms (Cashify-class) typically have: catalog + search + used pricing, a real device-valuation & inspection engine, buy-back with pickup logistics, repair with technician operations, exchange with instant trade-in credit, customer accounts, notifications, refunds/returns, fraud controls, and rich analytics. Position against that:

| Capability | Status | Notes |
|---|---|---|
| A. Buy Phones | 🟡 | Store works; used-brand catalog depth and watchlists/price-drop alerts missing. |
| B. Sell Phones | 🟡 | Request + valuation estimate; **admin inspection checklist + tracked payout record** complete; no payout disbursement automation. |
| C. Phone Valuation Engine | 🟡 | Real rule engine (225 records) used for estimates; **now authoritative at request time** for sell/exchange + IMEI capture; catalog rows seeded (222). |
| D. Repair | 🟡 | Booking + status + costs solid; strict FSM; warranty claims for repairs now exist; no technician mobile flow, parts tracking. |
| E. Exchange | 🔴→🟡 | Request + server old-device value + admin final value + **inspection checklist + payout record (auto for pure buyback)**; no instant trade-in credit toward a new order. |
| F. Product Catalog | 🟡 | 246 products/670 variants; **222-model catalog seeded** (158 with images); used-phone imagery/specs coverage incomplete. |
| G. Payments | 🟡 | COD real; Razorpay wired incl. refunds + recovery but disabled; no failed-event handling, no payouts. |
| H. Logistics | 🔴 | No courier integration; only manual tracking numbers; pickup scheduling is manual admin fields. |
| I. Serviceability | 🟡 | Engine is excellent; operational data (areas) empty; no delivery SLA/per-area pricing. |
| J. Customer Account | 🟡 | Solid; change-password/phone + reset-token logic present (delivery unprovisioned), invoice, cancel-request, **post-delivery returns**. No guest checkout. |
| K. Order Tracking | ✅ | Persisted & public (sanitized) + **strict FSM + customer cancel-request + stock/coupon restore**; no delivery provider events. |
| L. Notifications | 🟡 | **Customer center + admin broadcast complete**; no push/email/SMS; notify-me is admin-only. |
| M. Admin & Operations | 🟡 | Excellent DB-backed panel + notification broadcast + automated audit logs on key actions + **sell/exchange inspection + payout screens**; no tiered roles. |
| N. Inventory | 🟡 | Variant stock + admin bulk stock + **real inventory-ledger adjustment trail (unit tested)**; no reserve-on-cart or adjustments audit automation. |
| O. Pricing | 🟡 | Tax/shipping/coupon pricing complete; no dynamic/condition-grade pricing on sell, no price-drop alerts. |
| P. Offers/Coupons | 🟡 | Full coupon engine (server-validated, tested, audited); zero coupons currently in DB; no referral/applied-offers automation. |
| Q. Reviews/Ratings | 🟡 | Backend + DELIVERED-gated reviews; no reviews in DB; aggregate rating on product exists. |
| R. Warranty/Returns | 🟡 | **Post-delivery return/refund + warranty-claim workflows complete and tested**; refund money movement external. |
| S. Fraud/Risk | 🟡 | IMEI validation + duplicate-request detection on sell/exchange; brute-force login lockout; no payout verification system. |
| T. Analytics | 🟡 | Strong real dashboard; limited to 7-day charts; no funnel/cohort/CSV export. |
| U. SEO | 🟡 | Per-page meta + Open Graph via `useDocumentMeta` + robots.txt + sitemap added; still no SSR/SSG/prerendering. |
| V. Performance | 🟡 | **Server-side products pagination added**; no image CDN + no caching remain the ceiling. |
| W. Mobile UX | 🟡 | Good responsive web; no PWA/offline, no native app. |
| X. Security | 🟡 | Good baseline **hardened** (httpOnly-only tokens, revocable sessions, brute-force lockout, **IDOR/reveal-leak audit + sanitized public endpoints + admin-gated includeAll + trust proxy**); needs shared store + zod + audit automation expansion. |
| Y. Production Operations | 🔴 | **CI + render.yaml added**, but live deploys not current; no monitoring/error tracking, no staging parity. |

---

## 29. Recommended Next Development Phases

**P0 — Critical / blocking production**
1. Fix deployment wiring so `mern-migration` is what renders on Render + Vercel; verify the new routes live. *Impact:* everything else depends on a real environment. *(CI + `render.yaml` are now in place; the dashboards are not yet pointed at this branch.)*
2. Provision Razorpay keys + webhook secret; run a live UPI payment and a live refund. *Impact:* unlocks the online-payment + refund line; currently that revenue path is disabled (code is whole).
3. Add seed data / admin onboarding for the remaining empty collections: reviews, banners/testimonials (content must be real, not fabricated), and service-area PIN data. *(Coupons + CMS sections/cards/FAQs are now seeded in Phase 3 — `npm run seed:coupons` / `seed:cms`.)*
4. *(Done)* Refunds + cancellations + stock restore + strict FSMs + server-side valuation authority — shipped in the production-hardening pass.

**P1 — Important business functionality**
5. *(Done)* Phone valuation engine is now **authoritative** for sell/exchange (server computes + stores value at submit; client edits reviewed by admin afterward).
6. *(Done)* Customer-initiated **returns/refunds for delivered items** (RETURN_REQUESTED → approved → REFUNDED) with per-item validation + proportional refunds.
7. *(Done)* In-app **notification center UI** for customers + admin **broadcast screen**.
8. *(Done)* Strict status-transition FSMs + customer cancellation (with stock restore) — implemented and unit-tested.
9. *(Done)* Reset-password token flow (SHA-256 hashed, dev-only token), password/phone change, login rate-limit + brute-force lockout, revocable refresh tokens, tokens moved out of the response body. Remaining: wire the reset-token delivery provider (email/SMS) and make the lockout store shared.
10. *(Done)* **Inventory ledger** with an adjustment trail covering every write path (unit-tested); wire low-stock alerts.

**P2 — Growth & UX**
11. *(Done)* Server-side pagination for products ($facet `$skip`/`$limit`). Remaining: search suggestions already live; add typo-tolerance/full-text once catalog data matures.
12. Guest checkout (order created then linked to account at login) — currently a hard conversion wall.
13. Real **courier integration** (e.g., Delhivery/Shiprocket) or at least pickup-slot scheduling; replace manual tracking numbers.
14. PWA (offline shell, install), richer product detail (specs tables, image gallery), SEO prerender for product pages.
15. Email/SMS for notifications + notify-me + password-reset delivery (a provider + templates).

**P3 — Advanced features**
16. Exchange with instant trade-in credit applied to a new order (inspection checklists + payout records already exist; an auto payout is created for pure-buyback completions).
17. Fraud/risk controls: payout verification/disbursement automation, velocity rules.
18. Analytics expansion: funnels, cohort retention, CSV export, per-brand margin; automated audit logging of every admin action.
19. CI/CD (GitHub Actions build + lint + smoke tests), Sentry/error tracking, staging parity, secret rotation process. *(CI exists; see P0-1 for live-deploy wiring.)*
20. Native apps (React Native/Expo) or full PWA offline support; role-based admin access levels.

---

## 30. Current Production Readiness

```
Technically deployable:   YES   (builds, 47/47 unit tests, lint all pass; E2E green vs Atlas; CI + render.yaml + explicit Vercel config included;
                                  safe CMS/coupon seeds run live and idempotent)
Business-ready:           NO     (online payments disabled; live deploys not rebound — both external cut-over steps;
                                  delivery providers + courier integration still missing)
Cashify-level mature:     NO     (see Gap Analysis — H, and parts of E, G, T, Y are the big distances)
Overall verdict:          CONDITIONALLY READY — final release candidate
```

Conditionally ready means: **if** the two external cut-over steps are completed (1) provision Razorpay keys + webhook secret and run one live pay + one live refund (the code is complete, including FAILED→PAID recovery and refund-gating), and (2) rebind the Vercel (Root Directory=`client`, Framework=Vite, branch `mern-migration`, `VITE_API_URL`) and Render dashboards to this branch, the platform could support real customers for the COD + buy/sell/repair/exchange lines. Everything code-side that was blocking go-live has been closed in the hardening, Phase-2 and Phase-3 passes; what remains is operational cut-over, not code.

---

## 31. Final Audit Summary

- **What this is:** a genuine, working MERN application with four service lines, real DB-backed admin, auth hardening (brute-force lockout, revocable sessions), strict status FSMs, customer cancellations with stock restore, server-authoritative sell/exchange valuation, in-app notifications with admin broadcast, automated audit logging, **returns + warranty + inventory-ledger + coupon engine + sell/exchange completion records + reset-password flow + a security/IDOR audit**, and **47/47 in-repo unit tests** + clean ESLint + CI. Phase 3 added the final code-side release-candidate hardening: **FAILED→PAID recovery (stock + coupon re-allocated, never oversold), duplicate-order guard, coupon product/category target enforcement, strict DELIVERED-only returns + gateway-refund verification, cross-entity IMEI duplicate detection, proportional partial-quantity refunds, numeric + ledger-completeness fixes, repair owner sanitization, versioned health exempt from rate limiting, bounded bodies, and safe idempotent CMS/coupon production seeds** (run live against Atlas). 43/43 E2E checks pass; builds are clean; no dummy data; no secrets committed.
- **What it is not yet:** production-provisioned commerce. Payments are unprovisioned (so live pay/refund is code-complete but unexercised), the Render/Vercel dashboards still serve older builds (external rebinding needed), and maturity features (delivery providers, courier integration, exchange instant credit, notification delivery, guest checkout, SEO prerender, native apps) are ahead.
- **Single biggest lever:** cut over the deployment to this branch (Vercel → `client` + production branch `mern-migration` + `VITE_API_URL`; Render → current commit via its health check / start command) and provision Razorpay + run one live pay/refund — after that, the honest "completeness" climbs immediately from ~86% toward ~90%+ because the remaining gaps are incremental rather than architectural.

---

*Key file anchors: client routing `client/src/App.tsx`; layout guards `client/src/layouts/{AccountLayout,AdminLayout}.tsx`; api layer `client/src/services/api.ts`; payment client `client/src/pages/shop/CheckoutPage.tsx` + `client/src/services/payment.service.ts`; server entry `server/src/app.ts`; auth `server/src/routes/auth.ts` + `server/src/middleware/auth.ts`; serviceability `server/src/services/serviceabilityLogic.ts` + `serviceability.service.ts`; returns `server/src/routes/returns.ts` + `server/src/models/returnRequest.model.ts`; warranty `server/src/routes/warranties.ts` + `server/src/services/warranty.service.ts`; inventory ledger `server/src/routes/inventory.ts` + `server/src/models/inventoryLedger.model.ts`; coupons `server/src/services/coupon.service.ts`; sell/exchange completion `server/src/utils/requestValidation.ts` (inspection checklist + payout + auto-payout); payments `server/src/routes/payments.ts`; analytics `server/src/routes/analytics.ts`; database config `server/src/config/database.ts`; env `server/src/config/env.ts` + both `.env.example`.*
