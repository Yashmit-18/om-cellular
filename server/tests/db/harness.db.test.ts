import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { useIsolatedDatabase, commerceClient, runningServerVersion } from '../helpers/dbSuite'
import { TEST_DB_NAME, supportsFailPoints } from '../helpers/mongodb'
import { createCustomer, createProduct, createVariant, tokenFor } from '../helpers/commerce'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Order, OrderItem } from '../../src/models/order.model'
import { MONGODB_TEST_VERSION } from '../helpers/mongodb'

useIsolatedDatabase()

describe('isolated MongoDB harness', () => {
  it('is connected to the isolated test database, not the configured application database', async () => {
    assert.equal(Order.db.name, TEST_DB_NAME)
  })

  it('is served by the pinned official mongod build', async () => {
    assert.equal(await runningServerVersion(), MONGODB_TEST_VERSION)
  })

  it('really persists and reads back through the production Mongoose models', async () => {
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 7 })
    assert.equal((await ProductVariant.findById(variant._id).lean())!.stock, 7)
  })

  it('really enforces the declared unique sku index', async () => {
    const product = await createProduct()
    await createVariant({ productId: product._id, stock: 1 })
    await assert.rejects(() => createVariant({ productId: product._id, stock: 1 }), /duplicate key/i)
  })

  it('reaches the real orders router over HTTP with a real JWT', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: {
        name: 'Test Recipient', phone: '9876543210', addressLine1: 'TEST-ADDRESS-LINE-1',
        city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
      },
      paymentMethod: 'cod',
    }, tokenFor(customer))

    assert.equal(response.status, 201)
    assert.equal(await Order.countDocuments({}), 1)
    assert.equal(await OrderItem.countDocuments({}), 1)
    assert.equal((await ProductVariant.findById(variant._id).lean())!.stock, 4)
  })

  it('accepts real MongoDB failpoints for failure injection', async () => {
    assert.equal(await supportsFailPoints(), true)
  })
})
