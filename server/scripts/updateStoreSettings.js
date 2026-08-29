// Run: node scripts/updateStoreSettings.js
// Idempotently fills in the store's official contact/map information and new
// payment/repair setting defaults.
//
// SAFETY:
//  - Only ever fills values that are MISSING (empty/absent) for the business
//    address, maps and repair fee — never overwrites admin-entered values.
//  - New keys (UPI, WhatsApp default message, etc.) are inserted only if absent.
//  - Does not delete or touch any other settings or collections.
//
// Requires MONGODB_URI env var. No credentials are hardcoded in this file.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

const STORE_ADDRESS = '1st Floor, Central Square Mall, Kotri Road, Kota, Rajasthan, India'

const FILL_IF_EMPTY = [
  { key: 'business_address', value: STORE_ADDRESS, group: 'business' },
  { key: 'google_maps_url', value: 'https://maps.google.com/maps?q=Central%20Square%20Mall%20Kotri%20Road%20Kota%20Rajasthan%20India&z=16&output=embed', group: 'maps' },
  { key: 'google_maps_link', value: 'https://www.google.com/maps/search/?api=1&query=Central%20Square%20Mall%2C%20Kotri%20Road%2C%20Kota%2C%20Rajasthan%2C%20India', group: 'maps' },
  { key: 'opening_hours', value: 'Mon-Sat: 10:00 AM - 8:00 PM', group: 'business' },
  { key: 'repair_pickup_drop_fee', value: '99', group: 'repair' },
]

const INSERT_IF_ABSENT = [
  { key: 'business_name', value: 'OM Cellular', group: 'business' },
  { key: 'whatsapp_default_message', value: 'Hello OM Cellular, I need help with a mobile phone.', group: 'whatsapp' },
  { key: 'upi_id', value: '', group: 'payment' },
  { key: 'upi_display_name', value: '', group: 'payment' },
  { key: 'upi_qr_image', value: '', group: 'payment' },
  { key: 'footer_about', value: 'Your trusted partner for buying, selling, repairing and exchanging mobile phones.', group: 'footer' },
]

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const col = db.collection('settings')

    let filled = 0
    let skipped = 0
    for (const s of FILL_IF_EMPTY) {
      const existing = await col.findOne({ key: s.key })
      if (existing && existing.value && String(existing.value).trim()) {
        skipped++
        continue
      }
      await col.updateOne(
        { key: s.key },
        {
          $set: { key: s.key, value: s.value, group: s.group },
          $setOnInsert: { createdAt: new Date(), updatedAt: new Date() },
        },
        { upsert: true }
      )
      filled++
      console.log(`  filled ${s.key}`)
    }

    let inserted = 0
    for (const s of INSERT_IF_ABSENT) {
      const result = await col.updateOne(
        { key: s.key },
        {
          $setOnInsert: {
            key: s.key,
            value: s.value,
            group: s.group,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted++
    }

    console.log(`Store settings: ${filled} filled, ${skipped} already set, ${inserted} new keys inserted`)

    const all = await col.find({}).sort({ key: 1 }).toArray()
    console.log('\nCurrent settings:')
    for (const s of all) console.log(`  ${s.key}=${s.value || ''}`)
  } catch (e) {
    console.error('Failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()