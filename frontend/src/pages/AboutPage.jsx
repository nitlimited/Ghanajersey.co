import { Link } from "react-router-dom";
import { ChevronRight, Globe, Shirt, Star, Truck } from "lucide-react";
import SEO from "../components/SEO";
import { Header, Footer, MobileBottomNav } from "./LandingPage";

const categoryPathMap = {
  "official-tournament": "/products/ghana-jersey-tournament",
  "streetwear": "/products/ghana-jersey-streetwear",
  "fan": "/products/ghana-fan-jersey",
  "retro": "/products/retro-ghana-jersey",
  "creative-designer": "/products/creative-ghana-jersey",
  "local-club": "/products/local-club-ghana-jersey"
};

const intentSections = [
  {
    title: "Buy Ghana Jersey in Ghana",
    body: "For buyers in Ghana searching for where to buy Ghana jersey online, GhanaJersey.co brings together Ghana jersey options across official tournament looks, fan pieces, retro styles, and local designer releases in one place."
  },
  {
    title: "Buy Black Stars Jersey Abroad",
    body: "For shoppers outside Ghana, GhanaJersey.co is positioned for people looking for Black Stars jersey products in the United States, United Kingdom, Canada, Europe, and beyond, with international shipping managed by GhanaJersey.co."
  },
  {
    title: "Shop Retro Ghana Jersey",
    body: "For people searching for retro Ghana jersey, vintage Black Stars jersey, classic Ghana football shirt, or heritage Ghana soccer jersey styles, the retro collection creates a direct pathway into nostalgic and culture-led products."
  },
  {
    title: "Discover Ghana Jersey Streetwear",
    body: "For buyers looking for Ghana jersey streetwear, creative football fashion, or culture-driven Ghana football tops, GhanaJersey.co connects sportswear intent with lifestyle fashion intent."
  }
];

const locationSections = [
  {
    title: "Buy Ghana Jersey in Ghana",
    keywords: "buy ghana jersey in ghana, where to buy ghana jersey in accra, black stars jersey ghana",
    body: "For shoppers in Ghana, this page supports searches around buying Ghana jersey in Accra, Kumasi, Takoradi, Tamale, and other cities. It helps local buyers looking for Black Stars jersey options, retro Ghana jersey styles, and fast access to Ghana football fashion from local vendors."
  },
  {
    title: "Buy Ghana Jersey in the USA",
    keywords: "buy ghana jersey usa, black stars jersey usa, ghana football jersey united states",
    body: "For buyers in the United States, GhanaJersey.co is positioned for searches such as buy Ghana jersey in the USA, Black Stars jersey USA, and Ghana football jersey online in America. The goal is to make it easier for the Ghanaian diaspora and football fans in the U.S. to order Ghana jersey products from a dedicated marketplace."
  },
  {
    title: "Buy Ghana Jersey in the UK",
    keywords: "buy ghana jersey uk, black stars jersey uk, ghana football shirt london",
    body: "For buyers in the United Kingdom, this page helps cover searches like buy Ghana jersey UK, Black Stars jersey UK, Ghana football shirt London, and Ghana jersey for diaspora communities across England and beyond."
  },
  {
    title: "Buy Ghana Jersey in Canada",
    keywords: "buy ghana jersey canada, black stars jersey canada, ghana football jersey toronto",
    body: "For buyers in Canada, GhanaJersey.co can target people searching for Ghana jersey in Toronto, Black Stars jersey in Canada, and Ghana football tops for cultural events, gifts, and supporter wear."
  },
  {
    title: "Buy Ghana Jersey in Europe",
    keywords: "buy ghana jersey europe, black stars jersey europe, ghana football jersey abroad",
    body: "For buyers across Europe, the content helps support searches for Ghana jersey in Europe, Black Stars jersey Europe, and Ghana football jersey abroad for customers who want reliable access to Ghana-inspired football fashion from outside Africa."
  }
];

const faqItems = [
  {
    question: "Where can I buy Ghana jersey online?",
    answer: "GhanaJersey.co is built for shoppers looking to buy Ghana jersey online, including Black Stars jersey styles, retro Ghana jersey looks, fan collections, and creative streetwear-inspired pieces."
  },
  {
    question: "Who sells Black Stars jersey for buyers abroad?",
    answer: "GhanaJersey.co serves buyers in Ghana and abroad, making it easier for customers outside Ghana to shop Black Stars jersey styles and Ghana football fashion from a dedicated marketplace."
  },
  {
    question: "Can I find retro Ghana jersey on GhanaJersey.co?",
    answer: "Yes. GhanaJersey.co includes a retro Ghana jersey collection focused on vintage football inspiration, classic color stories, and heritage-led styling."
  },
  {
    question: "Does GhanaJersey.co offer Ghana jersey streetwear?",
    answer: "Yes. The marketplace includes Ghana jersey streetwear and designer collections for shoppers looking for football-inspired fashion beyond traditional match shirts."
  },
  {
    question: "Is GhanaJersey.co only for buyers in Ghana?",
    answer: "No. GhanaJersey.co is built for local buyers in Ghana and for international buyers looking to purchase Ghana jersey products from abroad."
  }
];

const collectionLinks = [
  { label: "Shop All Ghana Jersey", path: "/products" },
  { label: "Black Stars Jersey Collection", path: categoryPathMap["official-tournament"] },
  { label: "Retro Ghana Jersey", path: categoryPathMap["retro"] },
  { label: "Ghana Jersey Streetwear", path: categoryPathMap["streetwear"] },
  { label: "Fan-Made Ghana Jersey", path: categoryPathMap["fan"] },
  { label: "Creative Ghana Jersey", path: categoryPathMap["creative-designer"] }
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-bone-white">
      <SEO
        title="About GhanaJersey.co | Buy Ghana Jersey, Black Stars Jersey, Retro Ghana Jersey"
        description="Learn why GhanaJersey.co is built for shoppers searching for Ghana jersey, Black Stars jersey, retro Ghana jersey, Ghana jersey streetwear, and Ghana football fashion in Ghana and abroad."
        canonicalPath="/about"
        keywords="ghana jersey, buy ghana jersey, where to buy ghana jersey, black stars jersey, buy black stars jersey, retro ghana jersey, ghana jersey streetwear, ghana football jersey, ghana soccer jersey, buy ghana jersey abroad, buy ghana jersey in ghana"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              name: "About GhanaJersey.co",
              url: `${window.location.origin}/about`,
              description: "A search-focused brand and buying guide page for Ghana jersey shoppers in Ghana and abroad."
            },
            {
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer
                }
              }))
            }
          ]
        }}
      />
      <Header forceLight={true} stickyAnnouncement={true} />

      <section className="pt-36 pb-20 px-6 md:px-12 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-12 items-start">
          <div>
            <span className="font-body text-xs uppercase tracking-[0.35em] text-ashanti-gold">About GhanaJersey.co</span>
            <h1 className="font-heading text-4xl md:text-6xl tracking-wide uppercase mt-5">
              The Search Home for Ghana Jersey and Black Stars Jersey Shopping
            </h1>
            <div className="space-y-6 mt-8 font-body text-base text-muted-text leading-8">
              <p>
                GhanaJersey.co is a marketplace built around one clear mission: to make it easier for people to find, compare, and buy <strong className="text-black font-semibold">Ghana jersey</strong> products online. Whether someone is searching for a <strong className="text-black font-semibold">Black Stars jersey</strong>, a <strong className="text-black font-semibold">retro Ghana jersey</strong>, a creative fashion-led football top, or a gift for a Ghana football fan abroad, the platform is designed to meet that intent clearly.
              </p>
              <p>
                Instead of treating every jersey like the same product, GhanaJersey.co structures collections around how people actually search. That includes terms like <strong className="text-black font-semibold">where to buy Ghana jersey</strong>, <strong className="text-black font-semibold">buy Ghana jersey in Ghana</strong>, <strong className="text-black font-semibold">buy Black Stars jersey abroad</strong>, <strong className="text-black font-semibold">retro Ghana football shirt</strong>, and <strong className="text-black font-semibold">Ghana jersey streetwear</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link to="/products" className="inline-flex items-center justify-center bg-ashanti-gold text-black px-8 py-4 font-body font-semibold hover:bg-black hover:text-white transition-colors">
                Shop Ghana Jersey
              </Link>
              <Link to={categoryPathMap["retro"]} className="inline-flex items-center justify-center border border-black px-8 py-4 font-body font-semibold hover:bg-black hover:text-white transition-colors">
                Explore Retro Collection
              </Link>
            </div>
          </div>

          <div className="bg-bone-white border border-black/10 p-8">
            <h2 className="font-heading text-xl uppercase tracking-wide">Key Search Intents</h2>
            <div className="space-y-4 mt-6">
              {[
                "buy ghana jersey",
                "where to buy ghana jersey",
                "black stars jersey",
                "retro ghana jersey",
                "ghana jersey streetwear",
                "ghana football jersey abroad"
              ].map((keyword) => (
                <div key={keyword} className="border-b border-black/10 pb-3 font-body text-sm text-muted-text uppercase tracking-wide">
                  {keyword}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 bg-bone-white border-b border-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <span className="font-body text-xs uppercase tracking-[0.35em] text-ashanti-gold">Why This Page Exists</span>
            <h2 className="font-heading text-3xl md:text-5xl tracking-wide uppercase mt-4">
              A Dedicated SEO Hub for Ghana Jersey Buyers
            </h2>
            <p className="font-body text-muted-text leading-8 mt-6">
              This page is intentionally built as a deeper content hub so the homepage can stay more focused on brand, discovery, and shopping. Here, GhanaJersey.co can answer broader search intent around Ghana football fashion, Black Stars culture, and how to buy Ghana jersey products locally and internationally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {intentSections.map((section) => (
              <div key={section.title} className="bg-white border border-black/10 p-8">
                <h3 className="font-heading text-xl uppercase tracking-wide">{section.title}</h3>
                <p className="font-body text-sm text-muted-text leading-7 mt-4">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-black/10 p-8">
            <Shirt className="text-ashanti-gold mb-5" size={28} />
            <h3 className="font-heading text-lg uppercase tracking-wide">Category-Led Shopping</h3>
            <p className="font-body text-sm text-muted-text leading-7 mt-3">
              Clean collection pages help people searching for Ghana jersey, retro Ghana jersey, and Ghana jersey streetwear find the right type of product faster.
            </p>
          </div>
          <div className="border border-black/10 p-8">
            <Truck className="text-ashanti-gold mb-5" size={28} />
            <h3 className="font-heading text-lg uppercase tracking-wide">Built for Local and Global Buyers</h3>
            <p className="font-body text-sm text-muted-text leading-7 mt-3">
              Local shipping is handled by vendors, while international shipping is managed by GhanaJersey.co for buyers ordering from abroad.
            </p>
          </div>
          <div className="border border-black/10 p-8">
            <Star className="text-ashanti-gold mb-5" size={28} />
            <h3 className="font-heading text-lg uppercase tracking-wide">Marketplace Quality Control</h3>
            <p className="font-body text-sm text-muted-text leading-7 mt-3">
              Vendor and product workflows are structured so listings can be reviewed, approved, and presented more consistently across the storefront.
            </p>
          </div>
          <div className="border border-black/10 p-8">
            <Globe className="text-ashanti-gold mb-5" size={28} />
            <h3 className="font-heading text-lg uppercase tracking-wide">International Search Reach</h3>
            <p className="font-body text-sm text-muted-text leading-7 mt-3">
              The site is being optimized for shoppers searching from Ghana, the diaspora, and football fans worldwide who want to purchase Ghana jersey products online.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 bg-bone-white border-b border-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <span className="font-body text-xs uppercase tracking-[0.35em] text-ashanti-gold">Location Intent</span>
            <h2 className="font-heading text-3xl md:text-5xl tracking-wide uppercase mt-4">
              Ghana Jersey Buying Intent by Location
            </h2>
            <p className="font-body text-muted-text leading-8 mt-6">
              People do not search the same way everywhere. Some search for Ghana jersey in Ghana, while others search for Black Stars jersey in the USA, UK, Canada, or Europe. This section gives GhanaJersey.co more specific relevance for those location-based searches.
            </p>
          </div>

          <div className="space-y-6 mt-10">
            {locationSections.map((section) => (
              <div key={section.title} className="bg-white border border-black/10 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-[0.85fr,1.15fr] gap-8 items-start">
                  <div>
                    <h3 className="font-heading text-2xl uppercase tracking-wide">{section.title}</h3>
                    <p className="font-body text-xs uppercase tracking-[0.25em] text-ashanti-gold mt-4">
                      {section.keywords}
                    </p>
                  </div>
                  <p className="font-body text-sm text-muted-text leading-8">{section.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 bg-bone-white border-b border-black/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr,1.1fr] gap-12 items-start">
          <div>
            <span className="font-body text-xs uppercase tracking-[0.35em] text-ashanti-gold">Internal Linking Hub</span>
            <h2 className="font-heading text-3xl md:text-4xl tracking-wide uppercase mt-4">
              Shop by Collection
            </h2>
            <p className="font-body text-muted-text leading-8 mt-5">
              These collection links support buyers who already know what kind of Ghana jersey they want, and they also help search engines understand the marketplace structure more clearly.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {collectionLinks.map((link) => (
              <Link key={link.label} to={link.path} className="group flex items-center justify-between border border-black/10 bg-white p-5 hover:border-black transition-colors">
                <span className="font-body text-sm font-semibold uppercase tracking-wide">{link.label}</span>
                <ChevronRight size={18} className="group-hover:text-ashanti-gold transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <span className="font-body text-xs uppercase tracking-[0.35em] text-ashanti-gold">SEO FAQ</span>
            <h2 className="font-heading text-3xl md:text-5xl tracking-wide uppercase mt-4">
              Ghana Jersey Buying Questions
            </h2>
          </div>
          <div className="space-y-4 mt-10">
            {faqItems.map((item) => (
              <div key={item.question} className="border border-black/10 bg-bone-white p-6">
                <h3 className="font-heading text-lg uppercase tracking-wide">{item.question}</h3>
                <p className="font-body text-sm text-muted-text leading-7 mt-3">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default AboutPage;
