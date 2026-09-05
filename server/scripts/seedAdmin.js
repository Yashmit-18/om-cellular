// Run: npm run seed:admin
// Idempotent admin account ensure script for OM Cellular.
// Ensures exactly one ADMIN account (admin@gmail.com) exists with a hashed password.
//
// Requirements (from environment, never hardcoded):
//   MONGODB_URI   - MongoDB connection string (production Atlas URI from Render env)
//   ADMIN_PASSWORD- the desired admin password (plaintext is NEVER stored or logged)
//
// The script uses the same bcrypt hashing the app uses for registration (12 rounds),
// so the account works with the existing /api/v1/auth/login flow. It is safe to run
// multiple times: it never creates a duplicate account and does not clobber unrelated
// user data.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

// Force Node.js to use reliable public DNS servers.
// Required because the system DNS resolver is returning ECONNREFUSED
// for MongoDB Atlas SRV records (matches server/src/config/database.ts).
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
if (!ADMIN_PASSWORD) {
  console.error('ERROR: ADMIN_PASSWORD environment variable is required')
  console.error('Set it when running: ADMIN_PASSWORD=yourpassword npm run seed:admin')
  process.exit(1)
}

const BCRYPT_ROUNDS = 12

async function ensureAdmin(db) {
  const usersCol = db.collection('users')
  const email = ADMIN_EMAIL.toLowerCase()

  const existing = await usersCol.findOne({ email })

  if (!existing) {
    const password = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
    await usersCol.insertOne({
      name: 'Admin',
      email,
      role: 'ADMIN',
      password,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return { created: true, updated: false, email }
  }

  let updated = false
  const setFields = {}

  if (existing.role !== 'ADMIN') {
    setFields.role = 'ADMIN'
    updated = true
  }

  if (!existing.name || typeof existing.name !== 'string') {
    setFields.name = 'Admin'
    updated = true
  }

  const storedPassword = existing.password
  const hasUsablePassword =
    typeof storedPassword === 'string' &&
    storedPassword.length > 0 &&
    storedPassword.startsWith('$2')

  if (!hasUsablePassword || !bcrypt.compareSync(ADMIN_PASSWORD, storedPassword)) {
    setFields.password = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
    updated = true
  }

  if (updated) {
    await usersCol.updateOne({ _id: existing._id }, {
      $set: { ...setFields, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    })
  }

  return { created: false, updated, email }
}

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db()
    console.log('Connected to MongoDB\n')

    const result = await ensureAdmin(db)
    console.log(`Admin account: ${result.email}`)
    if (result.created) {
      console.log('  Status: created')
    } else if (result.updated) {
      console.log('  Status: updated to ADMIN / valid password hash')
    } else {
      console.log('  Status: already exists and is correct (no changes)')
    }

    const verify = await db.collection('users').findOne({ email: result.email })
    if (!verify) {
      throw new Error('Verification failed: admin account not found after ensure')
    }
    if (verify.role !== 'ADMIN') {
      throw new Error('Verification failed: role is not ADMIN')
    }
    if (typeof verify.password !== 'string' || !/^\$2[aby]\$/.test(verify.password)) {
      throw new Error('Verification failed: password field is not a bcrypt hash')
    }
    if (!bcrypt.compareSync(ADMIN_PASSWORD, verify.password)) {
      throw new Error('Verification failed: admin password does not authenticate')
    }

    console.log('  Verification: role=ADMIN, password=hashed (bcrypt), login password matches')
    console.log('\nAdmin ensure complete — safe to run again (idempotent, no duplicates).')
  } catch (e) {
    console.error('Admin seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log('MongoDB connection closed')
  }
}

main()