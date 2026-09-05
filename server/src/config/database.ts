import dns from 'dns'
import mongoose from 'mongoose'
import { env } from './env'

// Force Node.js to use reliable public DNS servers.
// Required because the system DNS resolver is returning ECONNREFUSED
// for MongoDB Atlas SRV records.
dns.setServers(['8.8.8.8', '1.1.1.1'])

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI!)
    console.log('✓ MongoDB connected')
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