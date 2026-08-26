import LegalContactInfo from "@/components/layout/LegalContactInfo";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Refund & Cancellation Policy</h1>
        <p className="mb-8 text-sm text-gray-400">Last updated: January 2026</p>

        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm prose prose-sm max-w-none">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Order Cancellation</h2>
            <p className="mt-2 text-gray-600">
              You may cancel your order before it is shipped. To cancel, please contact our support team with your order number. Once the order is shipped, cancellation is not possible, but you can return the product upon delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Return Policy</h2>
            <p className="mt-2 text-gray-600">
              We offer the following return windows:
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>New Products:</strong> 7 days from delivery date</li>
              <li><strong>Refurbished Products:</strong> 3 days from delivery date</li>
              <li><strong>Accessories:</strong> 7 days from delivery date</li>
            </ul>
            <p className="mt-2 text-gray-600">
              To be eligible for a return, the product must be in its original condition with all accessories, packaging, and tags intact.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Non-Returnable Items</h2>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>Products with physical or liquid damage caused by the buyer</li>
              <li>Products with altered or missing IMEI numbers</li>
              <li>Products without original packaging and accessories</li>
              <li>Gift cards and digital products</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Refund Process</h2>
            <p className="mt-2 text-gray-600">
              Once we receive and inspect the returned product, we will process your refund within 5-7 business days. Refunds will be credited to the original payment method. For COD orders, refunds will be made via bank transfer or UPI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Damaged or Defective Products</h2>
            <p className="mt-2 text-gray-600">
              If you receive a damaged or defective product, please contact us within 48 hours of delivery with photos of the damage. We will arrange a free pickup and either replace the product or issue a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Repair Service Cancellation</h2>
            <p className="mt-2 text-gray-600">
              You may cancel a repair booking before the diagnosis is completed. Once diagnosis is done and you have approved the repair estimate, cancellation is not possible. If the repair cost exceeds the estimate by more than 20%, we will inform you before proceeding.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Sell/Exchange Request Cancellation</h2>
            <p className="mt-2 text-gray-600">
              You may cancel a sell or exchange request at any time before the device pickup. Once the device has been collected, the transaction cannot be reversed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Partial Refunds</h2>
            <p className="mt-2 text-gray-600">
              Partial refunds may be issued if:
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>The product shows signs of use beyond what was described</li>
              <li>Original accessories or packaging are missing</li>
              <li>The product is returned after the return window (on a case-by-case basis)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Contact for Refunds</h2>
            <p className="mt-2 text-gray-600">
              For refund or cancellation requests, <LegalContactInfo email="support@omcellular.com" /> with your order number and reason for return/cancellation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
