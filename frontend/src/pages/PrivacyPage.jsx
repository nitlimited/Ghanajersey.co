import { Header, Footer } from "./LandingPage";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-bone-white" data-testid="privacy-page">
      <Header forceLight={true} />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl mb-8">Privacy Policy</h1>
        <p className="font-body text-sm text-muted-text mb-8">Last updated: January 2024</p>

        <div className="prose prose-sm max-w-none font-body space-y-8">
          <section>
            <h2 className="font-heading text-xl mb-4">1. Information We Collect</h2>
            <p className="text-muted-text leading-relaxed mb-4">
              We collect information you provide directly:
            </p>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Account information (name, email, password)</li>
              <li>Profile information (for vendors: brand name, location, contact details)</li>
              <li>Payment information (processed securely by our payment partners)</li>
              <li>Shipping addresses</li>
              <li>Communication with customer support</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Process transactions and send order confirmations</li>
              <li>Provide customer support</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Improve our platform and services</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">3. Information Sharing</h2>
            <p className="text-muted-text leading-relaxed mb-4">
              We share your information with:
            </p>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Vendors (shipping address for order fulfillment)</li>
              <li>Payment processors (Stripe, PayPal, Paystack)</li>
              <li>Shipping providers (for delivery tracking)</li>
              <li>Service providers (hosting, analytics, email)</li>
              <li>Law enforcement (when legally required)</li>
            </ul>
            <p className="text-muted-text leading-relaxed mt-4">
              We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">4. Data Security</h2>
            <p className="text-muted-text leading-relaxed">
              We implement industry-standard security measures including SSL encryption, secure payment processing, and regular security audits. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">5. Cookies</h2>
            <p className="text-muted-text leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site usage. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">6. Your Rights</h2>
            <p className="text-muted-text leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">7. Data Retention</h2>
            <p className="text-muted-text leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services. We may retain certain information for legal compliance, dispute resolution, and enforcement of agreements.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">8. International Transfers</h2>
            <p className="text-muted-text leading-relaxed">
              Your data may be transferred to and processed in countries other than Ghana. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">9. Children's Privacy</h2>
            <p className="text-muted-text leading-relaxed">
              Our services are not directed to children under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-text leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes via email or prominent notice on our site.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">11. Contact Us</h2>
            <p className="text-muted-text leading-relaxed">
              For privacy-related inquiries, contact us at privacy@blackstarthreads.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
