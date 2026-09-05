// Seed safe default CMS content for OM Cellular.
// Idempotent: upserts keyed on stable natural keys (title/question). Never
// deletes or duplicates. Banners are intentionally NOT seeded (image assets are
// the store's brand assets, added from Admin > Banners) and testimonials are
// intentionally NOT seeded (never fabricate customer reviews).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

const homepageSections = [
  {
    key: 'categories',
    title: 'Explore Categories',
    subtitle: 'Phones, tablets, wearables and accessories',
    type: 'categories',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'new-arrivals',
    title: 'Fresh Arrivals',
    subtitle: 'Newly added refurbished and pre-owned devices',
    type: 'new_arrivals',
    isActive: true,
    sortOrder: 2,
  },
  {
    key: 'best-sellers',
    title: 'Best Sellers',
    subtitle: 'The most popular picks this month',
    type: 'best_sellers',
    isActive: true,
    sortOrder: 3,
  },
  {
    key: 'sell-or-exchange',
    title: 'Sell or Exchange Your Phone',
    subtitle: 'Get an instant valuation from our pricing engine, then schedule a free doorstep pickup.',
    type: 'custom',
    isActive: true,
    sortOrder: 4,
    ctaText: 'Get an offer',
    ctaLink: '/sell-phone',
  },
  {
    key: 'repair-made-easy',
    title: 'Repair Made Easy',
    subtitle: 'Book a certified repair with doorstep pickup or store drop-off in Kota.',
    type: 'custom',
    isActive: true,
    sortOrder: 5,
    ctaText: 'Book a repair',
    ctaLink: '/repair',
  },
]

const informationCards = [
  {
    key: 'device-protection',
    title: 'Device Protection',
    description: 'Every pre-owned device is inspected and covered by our warranty policy. What you see in the listing is what we stand behind.',
    icon: 'ShieldCheck',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'doorstep-pickup',
    title: 'Doorstep Pickup',
    description: 'Sell, exchange or repair from home — schedule a pickup and our team handles the rest.',
    icon: 'Truck',
    isActive: true,
    sortOrder: 2,
  },
  {
    key: 'pay-your-way',
    title: 'Pay Your Way',
    description: 'Pay on delivery (COD) or pay online via UPI / net banking when checkout allows it.',
    icon: 'Wallet',
    isActive: true,
    sortOrder: 3,
  },
]

const faqs = [
  {
    question: 'Where is OM Cellular located?',
    answer: 'OM Cellular is at Shop No. 8, Upper Ground Floor, Center Square Mall, Gumanpura Road, Kota, Rajasthan 324007. Use the Get Directions link on the contact page.',
    category: 'support',
    sortOrder: 1,
    isActive: true,
  },
  {
    question: 'Which payment methods do you accept?',
    answer: 'Cash on delivery is always available. UPI and net banking are enabled whenever online payment is configured and active at checkout.',
    category: 'shopping',
    sortOrder: 2,
    isActive: true,
  },
  {
    question: 'Can I cancel my order after placing it?',
    answer: 'Yes — as long as the order has not yet been shipped, you can request a cancellation from your order page. Stock and any coupon usage are restored automatically.',
    category: 'shopping',
    sortOrder: 3,
    isActive: true,
  },
  {
    question: 'How do returns work for delivered items?',
    answer: 'You can request a return from your order page after delivery. Items are validated against your purchase, and approved returns are refunded once the device is received and inspected.',
    category: 'shopping',
    sortOrder: 4,
    isActive: true,
  },
  {
    question: 'What does your repair service cover?',
    answer: 'Screen, battery, charging port, camera, speaker and general diagnostics are all available. Book online, choose doorstep pickup or store drop-off, and track the repair status in real time.',
    category: 'repair',
    sortOrder: 5,
    isActive: true,
  },
  {
    question: 'How is my phone valued for sell or exchange?',
    answer: 'Our server-side valuation engine prices your device by brand, model, storage, condition and accessories. The estimate you see is the value our team works from — no window-shopping of prices.',
    category: 'sell',
    sortOrder: 6,
    isActive: true,
  },
  {
    question: 'What happens after I accept a sell offer?',
    answer: 'We schedule a pickup, inspect the device against a checklist, confirm the payout amount, and pay you once the payout is marked complete.',
    category: 'sell',
    sortOrder: 7,
    isActive: true,
  },
  {
    question: 'How do I track my order, repair or sell/exchange request?',
    answer: 'Use the public tracking pages with your order number or booking number, or sign in to your account to see status timelines and history.',
    category: 'support',
    sortOrder: 8,
    isActive: true,
  },
]

async function seedCms(db, log = console.log) {
  let sectionsCreated = 0
  let cardsCreated = 0
  let faqsCreated = 0

  const sectionsCol = db.collection('homepagesections')
  for (const s of homepageSections) {
    const result = await sectionsCol.updateOne(
      { key: s.key },
      {
        $setOnInsert: {
          key: s.key,
          title: s.title,
          subtitle: s.subtitle || '',
          type: s.type,
          productIds: [],
          isActive: s.isActive,
          sortOrder: s.sortOrder,
          ctaText: s.ctaText || '',
          ctaLink: s.ctaLink || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) sectionsCreated++
  }

  const cardsCol = db.collection('informationcards')
  for (const c of informationCards) {
    const result = await cardsCol.updateOne(
      { key: c.key },
      {
        $setOnInsert: {
          key: c.key,
          title: c.title,
          description: c.description || '',
          icon: c.icon || '',
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) cardsCreated++
  }

  const faqsCol = db.collection('faqs')
  for (const f of faqs) {
    const result = await faqsCol.updateOne(
      { question: f.question },
      {
        $setOnInsert: {
          question: f.question,
          answer: f.answer,
          category: f.category || '',
          sortOrder: f.sortOrder,
          isActive: f.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) faqsCreated++
  }

  log(`  CMS content: ${sectionsCreated} sections, ${cardsCreated} info cards, ${faqsCreated} FAQs created (skipped existing)`)
  return { sectionsCreated, cardsCreated, faqsCreated }
}

if (require.main === module) {
  ;(async () => {
    const client = new MongoClient(MONGODB_URI)
    try {
      await client.connect()
      console.log('Connected to MongoDB\n')
      const result = await seedCms(client.db())
      console.log(`\nCMS seed complete (created: ${result.sectionsCreated} sections, ${result.cardsCreated} cards, ${result.faqsCreated} FAQs)`)
    } catch (e) {
      console.error('CMS seed failed:', e.message)
      process.exit(1)
    } finally {
      await client.close()
      console.log('\nMongoDB connection closed')
    }
  })()
}

module.exports = { seedCms }