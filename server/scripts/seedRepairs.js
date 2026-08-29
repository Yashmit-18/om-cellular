// Run: node scripts/seedRepairs.js
// Seeds only the repair services collection with real starting prices.
// Idempotent: upserts keyed on slug; updates prices/fields on re-run.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { repairServices, REPAIR_PRICES } = require('./data/repairServices')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

async function seed() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const repairCol = db.collection('repairservices')
    let created = 0, updated = 0

    for (const service of repairServices) {
      const result = await repairCol.updateOne(
        { slug: service.slug },
        {
          $set: {
            name: service.name,
            description: service.description,
            startingPrice: REPAIR_PRICES[service.slug] || 500,
            estimatedDuration: service.estimatedDuration,
            warranty: service.warranty,
            category: service.category,
            priceType: 'starting',
            isActive: true,
            sortOrder: service.sortOrder,
            updatedAt: new Date(),
          },
          $setOnInsert: { compatibleDevices: [], createdAt: new Date() },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) created++
      else if (result.modifiedCount > 0) updated++
    }

    console.log(`Repair services seed complete: ${created} created, ${updated} updated, ${repairServices.length - created - updated} unchanged`)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()