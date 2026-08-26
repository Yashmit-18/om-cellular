import LegalContactInfo from "@/components/layout/LegalContactInfo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms & Conditions</h1>
        <p className="mb-8 text-sm text-gray-400">Last updated: January 2026</p>

        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm prose prose-sm max-w-none">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-2 text-gray-600">
              By accessing and using OM Cellular&apos;s website and services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Services</h2>
            <p className="mt-2 text-gray-600">
              OM Cellular provides mobile phone buying, selling, exchanging, and repair services. All services are subject to availability and these terms.
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Selling:</strong> We provide estimated prices for used phones. Final prices are determined after physical inspection.</li>
              <li><strong>Buying:</strong> All refurbished phones undergo quality testing and come with a 6-month warranty.</li>
              <li><strong>Exchange:</strong> Exchange values are estimates. Final values are confirmed after device inspection.</li>
              <li><strong>Repairs:</strong> Repair costs may vary after diagnosis. We will inform you before proceeding.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Orders and Payment</h2>
            <p className="mt-2 text-gray-600">
              Orders placed on our platform are subject to product availability. We reserve the right to cancel any order. Currently, Cash on Delivery (COD) is available. Online payment options will be available soon.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Shipping and Delivery</h2>
            <p className="mt-2 text-gray-600">
              Standard delivery is free for orders above ₹999. Express delivery is available at an additional charge of ₹149. Delivery timelines are estimates and may vary based on location.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Returns and Refunds</h2>
            <p className="mt-2 text-gray-600">
              We offer a 7-day return policy on new products and a 3-day return policy on refurbished products. Returns are accepted only if the product is in its original condition with all accessories. Refunds are processed within 5-7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Warranty</h2>
            <p className="mt-2 text-gray-600">
              Refurbished phones come with a 6-month warranty covering manufacturing defects. Repair services come with a 30-180 day warranty depending on the service type. Warranty does not cover physical or liquid damage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. User Accounts</h2>
            <p className="mt-2 text-gray-600">
              You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information and notify us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Limitation of Liability</h2>
            <p className="mt-2 text-gray-600">
              OM Cellular shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid for the product or service in question.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to Terms</h2>
            <p className="mt-2 text-gray-600">
              We reserve the right to modify these terms at any time. Changes will be effective upon posting on the website. Continued use of our services constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Contact</h2>
            <p className="mt-2 text-gray-600">
              For questions about these terms, <LegalContactInfo email="info@omcellular.com" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
