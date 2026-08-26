import { env } from './config/env'
import { connectDatabase } from './config/database'
import app from './app'

async function startServer() {
  await connectDatabase()

  app.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT}`)
    console.log(`✓ Environment: ${env.NODE_ENV}`)
    console.log(`✓ Client URL: ${env.CLIENT_URL}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
