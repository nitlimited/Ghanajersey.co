import { Header, Footer } from "./LandingPage";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-bone-white" data-testid="terms-page">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl mb-8">Terms and Conditions</h1>
        <p className="font-body text-sm text-muted-text mb-8">Last updated: January 2024</p>

        <div className="prose prose-sm max-w-none font-body space-y-8">
          <section>
            <h2 className="font-heading text-xl mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-text leading-relaxed">
              By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">2. Use of Service</h2>
            <p className="text-muted-text leading-relaxed mb-4">
              Our platform provides a marketplace for Ghana-inspired jerseys. Users may:
            </p>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Browse and purchase jerseys from various designers</li>
              <li>Create vendor accounts to sell jerseys (subject to approval)</li>
              <li>Leave reviews and ratings for purchased products</li>
              <li>Vote for their favorite jersey designs</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">3. User Accounts</h2>
            <p className="text-muted-text leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must be at least 18 years old to create an account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">4. Vendor Terms</h2>
            <p className="text-muted-text leading-relaxed mb-4">
              Vendors agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>List only authentic, original designs or properly licensed products</li>
              <li>Provide accurate descriptions and high-quality images</li>
              <li>Ship orders within 3 business days with tracking</li>
              <li>Accept our 15% commission on all sales</li>
              <li>Handle returns and exchanges as per our return policy</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">5. Payments</h2>
            <p className="text-muted-text leading-relaxed">
              All payments are processed securely through Stripe, PayPal, or Paystack. Prices are displayed in multiple currencies for convenience. Vendor payouts are processed weekly, with a minimum payout threshold of GHS 50 or USD 5.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">6. Intellectual Property</h2>
            <p className="text-muted-text leading-relaxed">
              Vendors retain ownership of their designs. By listing on our platform, vendors grant us a non-exclusive license to display, promote, and sell their products. We respect intellectual property rights and will remove infringing content upon valid notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">7. Prohibited Activities</h2>
            <ul className="list-disc pl-6 text-muted-text space-y-2">
              <li>Selling counterfeit or unauthorized merchandise</li>
              <li>Fraudulent transactions or chargebacks</li>
              <li>Harassment of other users or vendors</li>
              <li>Manipulation of reviews or votes</li>
              <li>Any illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-text leading-relaxed">
              We act as a marketplace connecting buyers and vendors. We are not responsible for the quality, safety, or legality of items listed. Disputes between buyers and vendors should be resolved directly, though we may assist in mediation.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">9. Changes to Terms</h2>
            <p className="text-muted-text leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl mb-4">10. Contact</h2>
            <p className="text-muted-text leading-relaxed">
              For questions about these terms, contact us at legal@blackstarthreads.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;
