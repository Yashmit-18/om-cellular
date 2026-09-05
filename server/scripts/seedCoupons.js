// Seed conservative launch coupons for OM Cellular.
// Idempotent: upserts keyed on the unique coupon code. Never deletes or
// duplicates. Coupons are modest (capped) so enabling them costs little; each
// can be deactivated from Admin > Coupons.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

// expiresAt set relative to the moment the seed runs.
const sixMonthsFromNow = () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)

const coupons = [
  {
    code: 'WELCOME10',
    description: '10% off (up to ₹500) on orders above ₹999. One use per customer.',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: 999,
    maxDiscount: 500,
    maxPerUser: 1,
    usageLimit: 1000,
    isActive: true,
  },
  {
    code: 'FLAT100',
    description: 'Flat ₹100 off on orders above ₹1,999. One use per customer.',
    type: 'FIXED',
    value: 100,
    minOrderAmount: 1999,
    maxDiscount: 100,
    maxPerUser: 1,
    usageLimit: 500,
    isActive: true,
  },
]

async function seedCoupons(db, log = console.log) {
  let created = 0
  const col = db.collection('coupons')

  for (const c of coupons) {
    const result = await col.updateOne(
      { code: c.code },
      {
        $set: { isActive: c.isActive, updatedAt: new Date() },
        $setOnInsert: {
          code: c.code,
          description: c.description,
          type: c.type,
          value: c.value,
          minOrderAmount: c.minOrderAmount,
          maxDiscount: c.maxDiscount,
          maxPerUser: c.maxPerUser,
          usageLimit: c.usageLimit,
          usedCount: 0,
          applicableTo: 'ALL',
          applicableProductIds: [],
          applicableCategoryIds: [],
          expiresAt: sixMonthsFromNow(),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) created++
  }

  log(`  Coupons: ${created} created, ${coupons.length - created} skipped (already exist)`)
  return { created, total: coupons.length }
}

if (require.main === module) {
  ;(async () => {
    const client = new MongoClient(MONGODB_URI)
    try {
      await client.connect()
      console.log('Connected to MongoDB\n')
      const result = await seedCoupons(client.db())
      console.log(`\nCoupon seed complete (created: ${result.created}/${result.total})`)
    } catch (e) {
      console.error('Coupon seed failed:', e.message)
      process.exit(1)
    } finally {
      await client.close()
      console.log('\nMongoDB connection closed')
    }
  })()
}

module.exports = { seedCoupons }