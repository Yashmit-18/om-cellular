# OM Cellular

A full-stack mobile e-commerce and mobile repair platform.

## Features

- **Smartphone Marketplace** — Browse, search, and purchase new and refurbished phones
- **Product Management** — Categories, brands, variants, inventory, pricing, discounts
- **Sell Your Phone** — Submit device for valuation and sell
- **Phone Exchange** — Trade in old phone and pay the difference for a new one
- **Mobile Repair Booking** — Book repair services, track repair status
- **Customer Accounts** — Registration, login, order history, wishlist
- **Cart & Checkout** — Shopping cart, coupons, order placement
- **Reviews & Ratings** — Product reviews and ratings
- **Admin Dashboard** — Full admin panel for managing all operations
- **Homepage CMS** — Banners, information cards, testimonials, FAQs, homepage sections
- **Inventory Management** — Stock tracking, low stock alerts
- **Analytics** — Sales reports and analytics dashboard
- **Audit Logs** — Admin action tracking
- **Notifications** — User notification system

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS 3, React Router 6 |
| Backend | Node.js, Express 4, TypeScript |
| Database | MongoDB (Mongoose 8) |
| Auth | JWT (httpOnly cookies), bcryptjs |
| State | Zustand |
| Charts | Recharts |
| Animations | Framer Motion |

## Prerequisites

- Node.js 18+ (recommended: 20+)
- MongoDB 6+ (running locally or a connection string for Atlas)
- npm

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd omcellular
```

### 2. Server setup

```bash
cd server
cp .env.example .env    # Edit with your MongoDB URI and secrets
npm install
npm run dev             # Starts on http://localhost:5000
```

### 3. Client setup

```bash
cd client
cp .env.example .env    # Default works for local dev
npm install
npm run dev             # Starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the Express backend on port 5000.

### 4. Seed data (optional)

Use the admin dashboard or MongoDB tools to populate categories, brands, products, and CMS content.

## Available Scripts

### Server (`/server`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |

### Client (`/client`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |

## Project Structure

```
omcellular/
├── client/                # React + Vite frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── layouts/       # Shop, Admin, Account layouts
│   │   ├── pages/         # All page components
│   │   ├── services/      # API service layer (axios)
│   │   ├── stores/        # Zustand state stores
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                # Express + Mongoose backend
│   ├── src/
│   │   ├── config/        # Environment, database, CORS
│   │   ├── middleware/    # Auth, error handling, validation
│   │   ├── models/        # Mongoose schemas (20 models)
│   │   ├── routes/        # Express route handlers (20 routes)
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   ├── tsconfig.json
│   └── package.json
│
├── public/uploads/        # User-uploaded files
├── .gitignore
└── README.md
```

## API Endpoints

All API routes are prefixed with `/api/v1/`.

| Route | Description |
|-------|-------------|
| `/auth` | Register, login, logout, refresh token |
| `/products` | Product CRUD, search, filtering |
| `/categories` | Category management |
| `/brands` | Brand management |
| `/orders` | Order placement and management |
| `/repairs` | Repair booking and tracking |
| `/sell-requests` | Sell phone requests |
| `/exchange-requests` | Phone exchange requests |
| `/phone-valuations` | Phone valuation calculator |
| `/reviews` | Product reviews |
| `/coupons` | Coupon management |
| `/banners` | CMS banners |
| `/homepage-sections` | CMS homepage sections |
| `/testimonials` | CMS testimonials |
| `/faqs` | CMS FAQs |
| `/information-cards` | CMS information cards |
| `/settings` | Site settings |
| `/customers` | Customer management (admin) |
| `/notifications` | User notifications |
| `/contact-requests` | Contact form submissions |
| `/analytics` | Sales analytics |
| `/audit-logs` | Admin action logs |
| `/uploads` | File uploads |
| `/inventory` | Inventory management |

## Deployment

### Backend

1. Set environment variables on your hosting platform
2. `npm run build && npm start`
3. Ensure MongoDB is accessible

### Frontend

1. `npm run build` — outputs to `client/dist/`
2. Serve `client/dist/` with any static host or configure nginx to proxy `/api` to the backend

## License

Private project — All rights reserved.
