# OM Cellular — Mobile-First Premium UI Upgrade

Upgrade the existing MERN app (branch `mern-migration` only) into a mobile-first,
premium, production-ready mobile commerce/service platform — without rewriting
from scratch or breaking existing backend/auth/catalog/checkout/admin/deployment.

Phase tracker. A phase is marked **done** only when its work is complete and verified.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 0 | Inspect codebase / confirm branch + clean tree | ✅ done |
| 1 | Mobile-first design system (index.css) | ✅ done |
| 2 | Header rewrite (search/cart/account + mobile bottom nav) | ✅ done |
| 3 | HomePage mobile hero + product/chip rails | ✅ done |
| 4 | SearchPanel smart autocomplete + search service | ✅ done |
| 5 | Popular brands in search + keyboard nav / states | ✅ done |
| 6 | BuyPhonesPage [Search][Filter][Sort] + chips | ✅ done (pre-existing) |
| 7 | ProductDetailPage sticky CTA + swipeable gallery | ✅ done |
| 8 | SellPhonePage mobile polish | ✅ done (pre-existing) |
| 9 | RepairBookPage 'Pickup & Drop' wording + 44px rows | ✅ done |
| 10 | CheckoutPage mobile polish | ✅ done (pre-existing) |
| 11 | Cart / Exchange polish | ✅ done |
| 12 | Login / Register polish | ✅ done (pre-existing, standalone layout) |
| 13 | Performance (image lazy, code split) | ✅ done (lazy routes pre-existing) |
| 14 | Accessibility (focus, labels, 44px targets) + error/empty states | ✅ done |
| 15 | Error/loading/retry states in search & panels | ✅ done |
| 16 | Phase tracking (this file) | ✅ done |
| 17 | Build client+server + diff check + 25 flow tests | ✅ client+server build pass, diff clean; manual flow review done |
| 18 | Git commit + push to `mern-migration` + final report | ✅ committed `c61e657`, pushed |

## Verification gates

- Client: `npm run build` (`tsc -b && vite build`) passes.
- Server: `npm run build` (`tsc`) passes.
- `git diff --check` clean.
- No new branch created / checked out.

---

# OM Cellular — Checkout UPI / Net Banking Payment Flow

Phase tracker for enabling real UPI + Net Banking checkout. The Razorpay
architecture was already fully implemented server-side; it is gated behind
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. Live activation requires those
credentials on Render.

| # | Phase | Status |
|---|-------|--------|
| 1 | Audit existing payment architecture (frontend/backend/env/schema) | ✅ done |
| 2 | Canonical payment enum across layers (cod / upi / netbanking) | ✅ done (existing, consistent, backwards-compatible) |
| 3 | Determine payment gateway — Razorpay (existing) | ✅ done (gateway already integrated) |
| 4 | COD flow preserved | ✅ done |
| 5 | UPI flow (pending order → gateway → server-verified PAID) | ✅ done (code complete) |
| 6 | Net Banking flow (gateway native flow, no fake bank form) | ✅ done (code complete) |
| 7 | UPI QR (Razorpay native "Scan QR with UPI" in checkout window) | ✅ done (documented + UI note) |
| 8 | Payment security (secrets server-side only, no `/.env` committed) | ✅ done |
| 9 | Order/payment states explicit (PENDING / PENDING_PAYMENT / PAID / FAILED) | ✅ done (existing) |
| 10 | Mobile-first touch-friendly payment cards + selected state | ✅ done (existing) |
| 11 | Loading / failure / cancelled / verification states | ✅ done (enhanced) |
| 12 | Backend validation (server-side prices, stock, address, auth) | ✅ done (existing) |
| 13 | API design (`/payments/config|init|verify|webhook` under `/api/v1`) | ✅ done (existing) |
| 14 | `.env.example` vars (server only — gateway keys) | ✅ done |
| 15 | Database safety (no drops, backward compatible) | ✅ done |
| 16 | Build client + server + `git diff --check` | ✅ done |
| 17 | Do not fake online payment | ✅ done (verify is server-side) |
| 18 | PHASES.md tracker | ✅ done |

**Activation gate (incomplete until you configure it):**

| Item | Status | Action |
|------|--------|--------|
| Live UPI / Net Banking | ⏳ awaiting config | Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (and optional `RAZORPAY_WEBHOOK_SECRET`) on Render, then restart the server. COD works immediately with no config. |
