import { Link } from "react-router-dom";
import { CheckCircle, DollarSign, Upload, Shield, TrendingUp, Users, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";

const SellYourJerseyPage = () => {
  const steps = [
    {
      icon: <Upload size={32} />,
      title: "1. Create Your Account",
      description: "Sign up as a designer/vendor. It's free and takes less than 2 minutes."
    },
    {
      icon: <CheckCircle size={32} />,
      title: "2. List Your Jersey",
      description: "Upload high-quality images, set your price, add sizes and description. Our team reviews within 24-48 hours."
    },
    {
      icon: <Users size={32} />,
      title: "3. Reach Global Buyers",
      description: "Once approved, your jersey is visible to buyers worldwide. We handle marketing and customer service."
    },
    {
      icon: <DollarSign size={32} />,
      title: "4. Get Paid",
      description: "When someone buys your jersey, you fulfill the order and we transfer your earnings within 7 business days."
    }
  ];

  const paymentInfo = [
    {
      title: "Commission Structure",
      description: "We charge a 15% commission on each sale. This covers payment processing, platform maintenance, and customer support."
    },
    {
      title: "Payment Methods",
      description: "We pay via Mobile Money (MTN, Vodafone, AirtelTigo), Bank Transfer, or PayPal for international designers."
    },
    {
      title: "Payment Timeline",
      description: "Earnings are released 3 days after confirmed delivery. Payments are processed every Friday."
    },
    {
      title: "Minimum Payout",
      description: "Minimum payout is GHS 50 or USD 5. Earnings below this roll over to the next payment cycle."
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp size={24} />,
      title: "Free Marketing",
      description: "We promote your jerseys through our social channels and email campaigns."
    },
    {
      icon: <Shield size={24} />,
      title: "Secure Payments",
      description: "All transactions are protected. We handle payment disputes and chargebacks."
    },
    {
      icon: <Users size={24} />,
      title: "Global Reach",
      description: "Sell to customers in Ghana, UK, USA, and beyond."
    }
  ];

  return (
    <div className="min-h-screen bg-bone-white" data-testid="sell-jersey-page">
      <Header forceLight={true} stickyAnnouncement={true} />

      {/* Hero Section */}
      <section className="pt-12 pb-20 px-6 md:px-12 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl md:text-5xl mb-6" data-testid="sell-title">
            List Your Jersey
          </h1>
          <p className="font-body text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join Ghana's premier jersey marketplace. Reach thousands of buyers worldwide and turn your designs into income.
          </p>
          <Link to="/auth">
            <Button className="bg-ashanti-gold text-black hover:bg-white px-10 py-6 font-body font-semibold text-sm" data-testid="start-selling-btn">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl text-center mb-16">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-ashanti-gold/10 flex items-center justify-center mx-auto mb-6 text-ashanti-gold">
                  {step.icon}
                </div>
                <h3 className="font-heading text-lg mb-3">{step.title}</h3>
                <p className="font-body text-sm text-muted-text leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Information */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl text-center mb-4">How You Get Paid</h2>
          <p className="font-body text-center text-muted-text mb-16 max-w-xl mx-auto">
            Transparent pricing, reliable payments. No hidden fees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paymentInfo.map((info, index) => (
              <div key={index} className="bg-bone-white p-8 border border-black/5">
                <h3 className="font-heading text-lg mb-3">{info.title}</h3>
                <p className="font-body text-sm text-muted-text leading-relaxed">{info.description}</p>
              </div>
            ))}
          </div>

          {/* Example Calculation */}
          <div className="mt-12 bg-black text-white p-8 md:p-12">
            <h3 className="font-heading text-xl mb-6 text-center">Example Earnings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="font-body text-sm text-white/60 mb-2">Your Jersey Price</p>
                <p className="font-heading text-3xl">$50</p>
              </div>
              <div>
                <p className="font-body text-sm text-white/60 mb-2">Platform Fee (15%)</p>
                <p className="font-heading text-3xl text-ghana-red">-$7.50</p>
              </div>
              <div>
                <p className="font-body text-sm text-white/60 mb-2">You Earn</p>
                <p className="font-heading text-3xl text-ashanti-gold">$42.50</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl text-center mb-16">Why Sell With Us</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-8 border border-black/5 hover:border-ashanti-gold transition-colors">
                <div className="w-12 h-12 bg-ashanti-gold/10 flex items-center justify-center mx-auto mb-4 text-ashanti-gold">
                  {benefit.icon}
                </div>
                <h3 className="font-heading text-lg mb-3">{benefit.title}</h3>
                <p className="font-body text-sm text-muted-text leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl text-center mb-12">Listing Requirements</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle size={24} className="text-ghana-green flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-body font-semibold mb-1">High-Quality Images</h4>
                <p className="font-body text-sm text-muted-text">For product listings, the first 2 images must show the full jersey front and back on a clean white background. Allowed formats are JPG, JPEG, PNG, and WEBP up to 5MB each. Minimum size is 1200 x 1500 px and recommended size is 1600 x 2000 px.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle size={24} className="text-ghana-green flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-body font-semibold mb-1">Accurate Descriptions</h4>
                <p className="font-body text-sm text-muted-text">Include material, sizing guide, care instructions, and any customization options.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle size={24} className="text-ghana-green flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-body font-semibold mb-1">Authentic Products</h4>
                <p className="font-body text-sm text-muted-text">All jerseys must be original designs or properly licensed. No counterfeit goods.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle size={24} className="text-ghana-green flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-body font-semibold mb-1">Reliable Shipping</h4>
                <p className="font-body text-sm text-muted-text">Ship within 3 business days of order. Provide tracking information.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 bg-ashanti-gold">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl mb-6">Ready to Start Selling?</h2>
          <p className="font-body text-lg mb-8 max-w-xl mx-auto">
            Join hundreds of Ghanaian designers already earning on our platform.
          </p>
          <Link to="/auth">
            <Button className="bg-black text-white hover:bg-white hover:text-black px-10 py-6 font-body font-semibold text-sm" data-testid="cta-sell-btn">
              Create Your Seller Account <ChevronRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SellYourJerseyPage;
