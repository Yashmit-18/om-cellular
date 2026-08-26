import LegalContactInfo from "@/components/layout/LegalContactInfo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-8 text-sm text-gray-400">Last updated: January 2026</p>

        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm prose prose-sm max-w-none">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Information We Collect</h2>
            <p className="mt-2 text-gray-600">
              We collect information you provide directly to us, including:
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>Name, email address, phone number, and address when you create an account or place an order</li>
              <li>Device information when you use our sell, exchange, or repair services</li>
              <li>Payment information (currently only COD is supported)</li>
              <li>Communication preferences and feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. How We Use Your Information</h2>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>To process your orders, sell requests, exchange requests, and repair bookings</li>
              <li>To communicate with you about your services and updates</li>
              <li>To improve our website and services</li>
              <li>To send promotional communications (with your consent)</li>
              <li>To ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Information Sharing</h2>
            <p className="mt-2 text-gray-600">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>Service providers who help us deliver our services (delivery partners, technicians)</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners only with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Data Security</h2>
            <p className="mt-2 text-gray-600">
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Cookies</h2>
            <p className="mt-2 text-gray-600">
              Our website uses cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Your Rights</h2>
            <p className="mt-2 text-gray-600">
              You have the right to:
            </p>
            <ul className="mt-2 list-disc pl-6 text-gray-600 space-y-1">
              <li>Access, update, or delete your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
              <li>Lodge a complaint with a data protection authority</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Data Retention</h2>
            <p className="mt-2 text-gray-600">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Account data is retained until you request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Children&apos;s Privacy</h2>
            <p className="mt-2 text-gray-600">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to This Policy</h2>
            <p className="mt-2 text-gray-600">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Contact Us</h2>
            <p className="mt-2 text-gray-600">
              For questions about this privacy policy, <LegalContactInfo email="privacy@omcellular.com" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
