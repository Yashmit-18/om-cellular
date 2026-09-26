import dns from 'dns'
import mongoose from 'mongoose'
import { env } from './env'
import { indexLifecycleOptions } from './indexPolicy'

// Force Node.js to use reliable public DNS servers.
// Required because the system DNS resolver is returning ECONNREFUSED
// for MongoDB Atlas SRV records.
dns.setServers(['8.8.8.8', '1.1.1.1'])

export async function connectDatabase(): Promise<void> {
  try {
    // Mongoose builds every schema-declared index by default, immediately after
    // the connection opens. That is convenient locally but unsafe in production:
    // deploying the D28 idempotency change would silently add
    // `uniq_user_idempotency_key` to the live orders collection as a side effect
    // of booting, with no audit, no review and no rollback.
    //
    // Production therefore never creates indexes on startup. Schema changes ship
    // as an explicit, reviewed operator step (see the D29 migration procedure),
    // so the application can only ever read an index that already exists.
    //
    // This is set per connection rather than via a global `mongoose.set` so the
    // real-MongoDB regression suite, which opens its own connection, keeps
    // building its indexes and stays a faithful test of production schemas.
    const policy = indexLifecycleOptions(env.isProduction)
    await mongoose.connect(env.MONGODB_URI!, policy)
    console.log(`✓ MongoDB connected (index auto-creation ${policy.autoIndex ? 'enabled' : 'DISABLED'})`)
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error)
    process.exit(1)
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error)
})