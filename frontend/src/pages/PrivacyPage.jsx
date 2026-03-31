import { Header, Footer } from "./LandingPage";

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect different types of information depending on how you interact with the platform.",
    blocks: [
      {
        heading: "1.1 Customer Account Information",
        points: [
          "Full Name",
          "Email Address",
          "Phone Number",
          "Shipping Address",
          "Billing Address",
          "Account Password"
        ],
        note: "This information allows us to create and manage your account, process orders, and deliver products purchased through the platform."
      },
      {
        heading: "1.2 Vendor Information",
        points: [
          "Full Name",
          "Brand Name",
          "Phone Number",
          "Email Address",
          "City or Location",
          "Mobile Money Number",
          "Bank Account Details",
          "Social Media Pages",
          "Product Images and Product Information"
        ],
        note: "This information is used to verify vendor identity, process payments, manage orders, and operate the marketplace."
      },
      {
        heading: "1.3 Shipping Information",
        points: [
          "Customer Name",
          "Delivery Address",
          "City",
          "Country",
          "Postal Code",
          "Phone Number"
        ],
        note: "This information may be shared with vendors and delivery partners to fulfill orders."
      }
    ]
  },
  {
    title: "2. Payment Processing",
    body: "Payments on GhanaJersey.co are processed by third-party payment providers including Stripe, PayPal, Paystack, and Mobile Money services. GhanaJersey.co does not store credit card information. All payment details are securely handled by the payment providers listed above in accordance with their own privacy policies."
  },
  {
    title: "3. How We Use Your Information",
    points: [
      "Create and manage user accounts",
      "Process orders and payments",
      "Deliver products to customers",
      "Allow vendors to fulfill orders",
      "Provide customer support",
      "Send order confirmations and notifications",
      "Send marketing and promotional communications",
      "Improve the website and user experience",
      "Prevent fraud and unauthorized activity"
    ]
  },
  {
    title: "4. Marketing Communications",
    body: "Users of GhanaJersey.co may receive marketing emails, newsletters, or promotional offers related to products and services available on the platform. Users can unsubscribe from marketing emails at any time using the unsubscribe link included in the email."
  },
  {
    title: "5. Cookies and Tracking Technologies",
    body: "GhanaJersey.co uses cookies and similar technologies to improve website functionality and understand how visitors interact with the platform.",
    points: [
      "Google Analytics",
      "Google Tag Manager"
    ],
    note: "These tools help us analyze website traffic, measure performance, and improve user experience. Cookies may also help remember user preferences and keep users logged into their accounts."
  },
  {
    title: "6. Sharing of Information",
    body: "We may share user information with trusted third parties necessary to operate the platform and deliver services. Information is only shared when necessary for legitimate business operations.",
    points: [
      "Payment processors",
      "Vendors fulfilling customer orders",
      "Shipping and delivery partners",
      "Technology and analytics providers"
    ]
  },
  {
    title: "7. International Users",
    body: "GhanaJersey.co allows customers from outside Ghana to purchase products through the platform. By using the website, international users understand that their information may be processed and stored in jurisdictions outside their country of residence."
  },
  {
    title: "8. Data Security",
    body: "We implement appropriate security measures to protect user data, including:",
    points: [
      "Secure encrypted website connections (HTTPS / SSL)",
      "Secure payment processing through third-party providers",
      "Password protection and encryption"
    ],
    note: "While we strive to protect your information, no internet-based system can guarantee complete security."
  },
  {
    title: "9. User Data Rights",
    body: "Users have the right to request:",
    points: [
      "Access to the personal data we hold about them",
      "Correction of inaccurate information",
      "Deletion of their personal data"
    ],
    note: "To make a request, users may contact us using the information provided below."
  },
  {
    title: "10. Data Retention",
    body: "We retain personal information only as long as necessary to provide services to users, comply with legal obligations, resolve disputes, and enforce agreements."
  },
  {
    title: "11. Changes to This Privacy Policy",
    body: "GhanaJersey.co may update this Privacy Policy from time to time.",
    points: [
      "Website notices",
      "Email notifications"
    ],
    note: "Users are encouraged to review this Privacy Policy periodically."
  },
  {
    title: "12. Contact Information",
    body: "If you have questions or concerns about this Privacy Policy or how your information is handled, please contact us at ghanajersey.co@gmail.com with the subject line PRIVACY. GhanaJersey.co is owned and operated by Nusite IT Consulting Limited, registered in Ghana."
  }
];

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-bone-white" data-testid="privacy-page">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="border border-black/10 bg-white p-8 md:p-12 mb-10">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-text mb-3">Privacy Policy</p>
          <h1 className="font-heading text-3xl md:text-5xl tracking-wide uppercase">Privacy Policy For GhanaJersey.co</h1>
          <p className="font-body text-sm text-muted-text mt-4">Last Updated: March 31, 2026</p>
          <p className="font-body text-base text-muted-text leading-relaxed mt-6">
            GhanaJersey.co is owned and operated by Nusite IT Consulting Limited, a business registered in Ghana. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the GhanaJersey.co website and related services.
          </p>
          <p className="font-body text-base text-muted-text leading-relaxed mt-4">
            By using GhanaJersey.co, you agree to the collection and use of information in accordance with this Privacy Policy.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="border border-black/10 bg-white p-6 md:p-8">
              <h2 className="font-heading text-xl md:text-2xl tracking-wide uppercase mb-4">{section.title}</h2>
              {section.body && (
                <p className="font-body text-sm md:text-base text-muted-text leading-relaxed mb-4">{section.body}</p>
              )}

              {section.blocks?.map((block) => (
                <div key={block.heading} className="border border-black/10 bg-bone-white p-5 mt-4">
                  <h3 className="font-heading text-base tracking-wide uppercase mb-3">{block.heading}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {block.points.map((point) => (
                      <p key={point} className="font-body text-sm text-muted-text">{point}</p>
                    ))}
                  </div>
                  {block.note && (
                    <p className="font-body text-sm text-muted-text leading-relaxed mt-4">{block.note}</p>
                  )}
                </div>
              ))}

              {section.points && !section.blocks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.points.map((point) => (
                    <div key={point} className="border border-black/10 bg-bone-white px-4 py-3">
                      <p className="font-body text-sm text-muted-text">{point}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.note && !section.blocks && (
                <p className="font-body text-sm text-muted-text leading-relaxed mt-4">{section.note}</p>
              )}
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
