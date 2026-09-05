import { env } from './config/env'
import { connectDatabase } from './config/database'
import { release } from './config/version'
import app from './app'
import { ServiceArea } from './models/serviceArea.model'

async function startServer() {
  await connectDatabase()

  const enabledAreas = await ServiceArea.countDocuments({ isEnabled: true })
  const serviceabilityMode =
    enabledAreas === 0
      ? 'LEGACY ALLOW-ALL (no service areas configured — every pincode treated as serviceable; add areas via Admin > Service Areas to gate delivery/repair/pickup/sell/exchange)'
      : `GATED (${enabledAreas} enabled service area(s))`

  app.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT}`)
    console.log(`✓ Environment: ${env.NODE_ENV}`)
    console.log(`✓ Release: ${release.version}${release.commit ? ` (commit ${release.commit.slice(0, 12)})` : ''}`)
    console.log(`✓ Client URL: ${env.CLIENT_URL}`)
    console.log(`✓ Serviceability: ${serviceabilityMode}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
