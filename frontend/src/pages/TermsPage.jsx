import { Header, Footer } from "./LandingPage";

const sections = [
  {
    title: "1. Overview",
    body: "These Terms of Service govern access to and use of GhanaJersey.co and any related services operated by Nusite IT Consulting Limited in connection with the GhanaJersey.co marketplace. By accessing or using the platform, you agree to be bound by these terms."
  },
  {
    title: "2. Marketplace Role",
    body: "GhanaJersey.co operates as a marketplace that connects customers with approved vendors offering jerseys and related apparel. GhanaJersey.co manages the platform, payment flows, selected international shipping coordination, customer communications, and marketplace operations. Local delivery within Ghana may be fulfilled directly by local vendors."
  },
  {
    title: "3. Eligibility And Accounts",
    points: [
      "Users must provide accurate information when creating or using an account.",
      "Customers are responsible for maintaining the confidentiality of their login credentials.",
      "Vendor accounts are subject to onboarding, verification, and approval before selling privileges are granted.",
      "GhanaJersey.co may suspend or terminate accounts that violate these terms or pose platform risk."
    ]
  },
  {
    title: "4. Customer Orders",
    points: [
      "Orders are only confirmed after successful payment verification.",
      "Product availability may change before payment is completed.",
      "Customers must provide accurate shipping and contact information.",
      "If an order cannot be fulfilled, GhanaJersey.co may cancel the order and issue an appropriate refund in line with applicable policy."
    ]
  },
  {
    title: "5. Pricing And Currency",
    body: "GhanaJersey.co may display prices in Ghana Cedis or United States Dollars based on localization, customer location, or operational rules. Final payable amounts are shown during checkout and on the selected payment platform. Taxes, customs fees, duties, and import charges are the responsibility of the customer unless expressly stated otherwise."
  },
  {
    title: "6. Payments",
    points: [
      "Payments may be processed through Paystack, Stripe, PayPal, Mobile Money, or other approved processors.",
      "GhanaJersey.co does not store raw card details.",
      "Orders will not be treated as paid until the payment provider confirms successful payment.",
      "Fraudulent transactions, chargeback abuse, or unauthorized payment activity may lead to order cancellation, account restriction, or reporting to relevant authorities."
    ]
  },
  {
    title: "7. Shipping And Fulfillment",
    points: [
      "International shipping is managed by GhanaJersey.co.",
      "Local shipping within Ghana may be managed by local vendors.",
      "After payment verification, standard in-stock orders are generally processed within 2 business days, excluding weekends and public holidays.",
      "Pre-order items may take 4 to 6 weeks to ship from the date the pre-order is placed.",
      "Shipping confirmation emails may include order details and tracking information when available.",
      "Delivery timelines are estimates and may be affected by logistics, customs, weather, carrier delays, or force majeure events."
    ]
  },
  {
    title: "8. Vendor Obligations",
    points: [
      "Vendors must provide accurate business, payout, product, and delivery information.",
      "Vendors may list products only after account approval and product approval where applicable.",
      "Vendors must use truthful descriptions, accurate images, and lawful product rights.",
      "Vendors must fulfill accepted orders within stated timelines and update order progress honestly.",
      "Vendors must not circumvent the platform, divert customers, or solicit off-platform payment for marketplace orders.",
      "Vendors are responsible for ensuring their products comply with applicable law and do not infringe third-party rights."
    ]
  },
  {
    title: "9. Vendor Approval, Suspension, And Removal",
    body: "GhanaJersey.co may approve, reject, pause, suspend, or remove any vendor account or product listing at its discretion to protect platform quality, customer trust, legal compliance, or operational integrity. Approval does not create a partnership, employment, or agency relationship."
  },
  {
    title: "10. Fees And Payouts",
    body: "Vendor sales on GhanaJersey.co are subject to platform commission and any disclosed operational charges. Payout timing may depend on payment confirmation, delivery status, receipt confirmation, fraud review, reserves, or dispute handling. GhanaJersey.co may delay or withhold payouts where necessary to investigate risk, refunds, chargebacks, or compliance concerns."
  },
  {
    title: "11. Returns, Refunds, And Disputes",
    body: "Return and refund outcomes may depend on the condition of the item, the reason for the request, delivery confirmation, and the specific transaction facts. GhanaJersey.co may mediate disputes between customers and vendors but may make final marketplace decisions where needed to protect users and the platform."
  },
  {
    title: "12. Content, Images, And Intellectual Property",
    points: [
      "All website content, branding, graphics, copy, and platform materials remain the property of GhanaJersey.co or its licensors unless otherwise stated.",
      "Vendors retain rights to their own lawful product content but grant GhanaJersey.co a non-exclusive right to host, display, market, resize, distribute, and promote that content in connection with platform operations.",
      "Users may not copy, scrape, reproduce, or commercially exploit the site or its content without permission.",
      "GhanaJersey.co may remove content alleged to infringe third-party rights."
    ]
  },
  {
    title: "13. Acceptable Use",
    points: [
      "Users may not use the platform for unlawful, abusive, deceptive, or harmful activity.",
      "Users may not interfere with platform security, infrastructure, analytics, payment flows, or other users’ access.",
      "Automated extraction, vote manipulation, fake reviews, false orders, and spam are prohibited."
    ]
  },
  {
    title: "14. Communications",
    body: "By using GhanaJersey.co, you agree that we may send service-related notices, transactional emails, security alerts, shipping notifications, and operational updates. Marketing communications may also be sent where permitted, and users may unsubscribe from marketing communications as provided."
  },
  {
    title: "15. Privacy",
    body: "Use of GhanaJersey.co is also governed by the Privacy Policy. Where these Terms of Service and the Privacy Policy both apply, they should be read together."
  },
  {
    title: "16. Warranties And Disclaimers",
    body: "GhanaJersey.co is provided on an as-available and as-is basis. To the fullest extent permitted by law, GhanaJersey.co disclaims implied warranties including merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability."
  },
  {
    title: "17. Limitation Of Liability",
    body: "To the fullest extent permitted by law, GhanaJersey.co, Nusite IT Consulting Limited, and their officers, staff, and affiliates will not be liable for indirect, incidental, special, consequential, punitive, or lost-profit damages arising from use of the platform, vendor conduct, payment processor issues, shipping delays, customs actions, or third-party systems."
  },
  {
    title: "18. Indemnity",
    body: "Users agree to indemnify and hold harmless GhanaJersey.co and Nusite IT Consulting Limited from claims, liabilities, losses, damages, and costs arising from their misuse of the platform, breach of these terms, violation of law, or infringement of third-party rights."
  },
  {
    title: "19. Changes To The Service Or Terms",
    body: "GhanaJersey.co may change, suspend, or discontinue any part of the platform at any time. We may also update these Terms of Service from time to time. Continued use of the platform after updated terms are posted constitutes acceptance of the revised terms."
  },
  {
    title: "20. Governing Law",
    body: "These Terms of Service are governed by the laws of Ghana, without prejudice to any mandatory consumer protections that may apply in the user’s place of residence where required by law."
  },
  {
    title: "21. Contact",
    body: "Questions about these Terms of Service may be sent to info@ghanajersey.co. GhanaJersey.co is operated by Nusite IT Consulting Limited in Ghana."
  }
];

const sectionIdMap = {
  "1. Overview": "overview",
  "2. Marketplace Role": "marketplace-role",
  "3. Eligibility And Accounts": "eligibility-accounts",
  "4. Customer Orders": "customer-orders",
  "5. Pricing And Currency": "pricing-currency",
  "6. Payments": "payments",
  "7. Shipping And Fulfillment": "shipping-fulfillment",
  "8. Vendor Obligations": "vendor-obligations",
  "9. Vendor Approval, Suspension, And Removal": "vendor-approval",
  "10. Fees And Payouts": "vendor-payouts",
  "11. Returns, Refunds, And Disputes": "returns-refunds-disputes",
  "12. Content, Images, And Intellectual Property": "content-intellectual-property",
  "13. Acceptable Use": "acceptable-use",
  "14. Communications": "communications",
  "15. Privacy": "privacy",
  "16. Warranties And Disclaimers": "warranties-disclaimers",
  "17. Limitation Of Liability": "limitation-of-liability",
  "18. Indemnity": "indemnity",
  "19. Changes To The Service Or Terms": "changes-to-service-terms",
  "20. Governing Law": "governing-law",
  "21. Contact": "contact"
};

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-bone-white" data-testid="terms-page">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="border border-black/10 bg-white p-8 md:p-12 mb-10">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-text mb-3">Terms Of Service</p>
          <h1 className="font-heading text-3xl md:text-5xl tracking-wide uppercase">Terms Of Service For GhanaJersey.co</h1>
          <p className="font-body text-sm text-muted-text mt-4">Last Updated: March 31, 2026</p>
          <p className="font-body text-base text-muted-text leading-relaxed mt-6">
            These terms are designed to reflect how GhanaJersey.co operates as a curated jersey marketplace serving customers, vendors, and international buyers.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} id={sectionIdMap[section.title]} className="border border-black/10 bg-white p-6 md:p-8">
              <h2 className="font-heading text-xl md:text-2xl tracking-wide uppercase mb-4">{section.title}</h2>
              {section.body && (
                <p className="font-body text-sm md:text-base text-muted-text leading-relaxed">{section.body}</p>
              )}
              {section.points && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {section.points.map((point) => (
                    <div key={point} className="border border-black/10 bg-bone-white px-4 py-3">
                      <p className="font-body text-sm text-muted-text">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;
