import api from './api'

export type OnlinePaymentMethod = 'upi' | 'netbanking' | 'card' | 'wallet'

export interface PaymentInitResponse {
  orderId: string
  keyId: string
  razorpayOrderId: string
  amount: number
  currency: string
  method: string
}

let razorpayPromise: Promise<any> | null = null

// Dynamically load the Razorpay Checkout.js script once and reuse it.
export function loadRazorpayScript(): Promise<any> {
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay)
  if (razorpayPromise) return razorpayPromise
  razorpayPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay]')
    if (existing) {
      const check = () => (window as any).Razorpay ? resolve((window as any).Razorpay) : setTimeout(check, 100)
      check()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.setAttribute('data-razorpay', '')
    script.onload = () => resolve((window as any).Razorpay)
    script.onerror = () => reject(new Error('Failed to load payment gateway'))
    document.body.appendChild(script)
  })
  return razorpayPromise
}

export const paymentService = {
  getConfig: () => api.get(`/payments/config`).then(r => r.data),

  init: (orderId: string, method: OnlinePaymentMethod) =>
    api.post(`/payments/init`, { orderId, method }).then(r => r.data),

  verify: (data: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post(`/payments/verify`, data).then(r => r.data),
}
