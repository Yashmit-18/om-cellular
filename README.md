# OM Cellular

A full-stack mobile e-commerce and mobile repair platform built with Next.js.

## Features

- **Smartphone Marketplace** - Browse, search, and purchase new and refurbished phones
- **Product Management** - Categories, brands, variants, inventory, pricing, discounts
- **Sell Your Phone** - Submit device for valuation and sell
- **Phone Exchange** - Trade in old phone and pay the difference for a new one
- **Mobile Repair Booking** - Book repair services, track repair status
- **Customer Accounts** - Registration, login, order history, wishlist
- **Cart & Checkout** - Shopping cart, coupons, order placement
- **Reviews & Ratings** - Product reviews and ratings
- **Admin Dashboard** - Full admin panel for managing all operations
- **Homepage CMS** - Banners, information cards, testimonials, FAQs, homepage sections
- **Inventory Management** - Stock tracking, low stock alerts
- **Analytics** - Sales reports and analytics dashboard
- **Audit Logs** - Admin action tracking
- **Notifications** - User notification system

## Tech Stack

- **Framework:** Next.js 16
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4
- **Database:** SQLite (local development), Prisma ORM
- **Authentication:** NextAuth.js 4 with Prisma Adapter
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Animations:** Framer Motion

## Local Setup

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm

### Installation

```bash
git clone <your-repo-url>
cd omcellular
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set a strong `NEXTAUTH_SECRET` for production. For local development the defaults work.

Install dependencies and generate Prisma client:

```bash
npm install
```

Push the database schema:

```bash
npm run db:push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:migrate:deploy` | Deploy migrations (production) |
| `npm run db:studio` | Open Prisma Studio |

## Build

```bash
npm run build
npm run start
```

## Production Deployment

This project is designed for deployment on platforms like Render or Vercel.

For production:

1. Set environment variables in your hosting platform:
   - `DATABASE_URL` - Use PostgreSQL for production
   - `NEXTAUTH_SECRET` - Generate a strong random secret
   - `NEXTAUTH_URL` - Your production domain

2. The local development database is SQLite. For production, switch the Prisma provider to `postgresql` and update `DATABASE_URL` accordingly.

3. Run `npm run db:migrate:deploy` during deployment to apply migrations.

**Note:** Do not use the local SQLite database in production.

## Project Structure

```
omcellular/
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets and uploads
├── src/
│   ├── app/             # Next.js App Router pages and API routes
│   │   ├── (shop)/      # Public-facing pages
│   │   ├── admin/       # Admin panel pages
│   │   └── api/         # API routes
│   ├── components/      # React components
│   │   ├── layout/      # Layout components (Header, Footer, Sidebar)
│   │   ├── ui/          # Reusable UI primitives
│   │   ├── cart/        # Cart components
│   │   ├── home/        # Homepage components
│   │   └── product/     # Product components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries (auth, prisma, utils)
│   ├── stores/          # Zustand stores
│   └── types/           # TypeScript type definitions
├── .env.example         # Environment variable template
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Git Workflow

```bash
git init
git add .
git commit -m "Initial OM Cellular project"
git branch -M main
git remote add origin <your-github-repository-url>
git push -u origin main
```

## License

Private project - All rights reserved.
