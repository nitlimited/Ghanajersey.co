import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingBag, Heart, Menu, X, User, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth, useCart, API } from "../App";
import axios from "axios";

// Header Component
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { cart } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-header border-b border-black/10' : 'bg-transparent border-b border-white/30'}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Left - Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/products?category=women" className={`font-body text-sm font-semibold tracking-wide transition-colors ${isScrolled ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-women">
              Women
            </Link>
            <Link to="/products?category=men" className={`font-body text-sm font-semibold tracking-wide transition-colors ${isScrolled ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-men">
              Men
            </Link>
            <Link to="/products?category=youth" className={`font-body text-sm font-semibold tracking-wide transition-colors ${isScrolled ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-youth">
              Youth
            </Link>
            <Link to="/products?category=kids" className={`font-body text-sm font-semibold tracking-wide transition-colors ${isScrolled ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-kids">
              Kids
            </Link>
            <Link to="/products?category=lifestyle" className={`font-body text-sm font-semibold tracking-wide transition-colors ${isScrolled ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-lifestyle">
              Lifestyle
            </Link>
          </nav>

          {/* Center - Logo Icon Only */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2" data-testid="logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
              alt="Black Star" 
              className={`w-10 h-10 transition-all ${isScrolled ? '' : 'invert'}`}
            />
          </Link>

          {/* Right - Icons */}
          <div className={`flex items-center gap-4 ${isScrolled ? 'text-black' : 'text-white'}`}>
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 font-body text-sm font-semibold" data-testid="user-menu">
                  <User size={20} />
                  <span className="hidden md:block">{user.name?.split(' ')[0]}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link to="/dashboard" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-dashboard">
                    My Orders
                  </Link>
                  <Link to="/wishlist" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-wishlist">
                    Wishlist
                  </Link>
                  {user.role === "vendor" && (
                    <Link to="/vendor" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-vendor">
                      Vendor Dashboard
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link to="/admin" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-admin">
                      Admin Dashboard
                    </Link>
                  )}
                  <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-black/5 font-body text-sm text-ghana-red" data-testid="btn-logout">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="hover:text-ashanti-gold transition-colors" data-testid="link-auth">
                <User size={20} />
              </Link>
            )}
            <Link to="/wishlist" className="hover:text-ashanti-gold transition-colors" data-testid="link-wishlist-icon">
              <Heart size={20} />
            </Link>
            <Link to="/cart" className="relative hover:text-ashanti-gold transition-colors" data-testid="link-cart">
              <ShoppingBag size={20} />
              {cart.items.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-ashanti-gold text-black text-xs flex items-center justify-center font-semibold">
                  {cart.items.length}
                </span>
              )}
            </Link>
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} data-testid="mobile-menu-toggle">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-black/10">
          <nav className="flex flex-col py-4">
            <Link to="/products?category=women" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Women
            </Link>
            <Link to="/products?category=men" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Men
            </Link>
            <Link to="/products?category=youth" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Youth
            </Link>
            <Link to="/products?category=kids" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Kids
            </Link>
            <Link to="/products?category=lifestyle" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Lifestyle
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

// Footer Component
const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setEmail("");
      alert("Subscribed successfully!");
    } catch (error) {
      console.error("Subscribe error:", error);
    }
  };

  return (
    <footer className="bg-black text-white py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
                alt="Black Star" 
                className="w-10 h-10 invert"
              />
            </div>
            <p className="font-body text-sm text-white/60 leading-relaxed max-w-md">
              Curated Ghanaian jerseys for the global citizen. For the love of country and culture.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wide mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">All Jerseys</Link>
              <Link to="/products?category=women" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Women</Link>
              <Link to="/products?category=men" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Men</Link>
              <Link to="/products?category=youth" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Youth</Link>
              <Link to="/products?category=kids" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Kids</Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading text-sm tracking-wide mb-4">Newsletter</h4>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-transparent border-b border-white/20 py-3 font-body text-sm focus:border-ashanti-gold outline-none transition-colors"
                data-testid="newsletter-email"
              />
              <Button type="submit" className="bg-ashanti-gold text-black hover:bg-white font-body font-semibold" data-testid="newsletter-submit">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-xs text-white/40">© 2024 All rights reserved.</p>
          <div className="flex gap-6">
            <span className="font-body text-xs text-white/40">Accra, Ghana</span>
            <span className="font-body text-xs text-white/40">Ships Worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Marquee Component
const Marquee = () => {
  const items = ["GHANA", "HERITAGE", "CULTURE", "FOOTBALL", "BLACK STARS", "PRIDE", "UNITY"];
  
  return (
    <div className="bg-black text-white py-4 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, index) => (
          <span key={index} className="flex items-center mx-4">
            <Star size={12} className="text-ashanti-gold mr-4" fill="#fed506" />
            <span className="font-body text-sm font-semibold tracking-wide">{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  return (
    <Link to={`/products/${product.product_id}`} className="group block" data-testid={`product-card-${product.product_id}`}>
      <div className="relative overflow-hidden border border-transparent hover:border-black transition-all duration-300">
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=600"}
            alt={product.name}
            className="w-full h-full object-cover grayscale-hover group-hover:scale-105 transition-all duration-500"
          />
        </div>
        {product.featured && (
          <span className="absolute top-4 left-4 bg-ashanti-gold text-black px-3 py-1 font-body text-xs font-semibold tracking-wide">
            Featured
          </span>
        )}
        <div className="p-4">
          <h3 className="font-heading text-sm tracking-wide group-hover:text-ashanti-gold transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="font-body text-lg font-semibold">
              {product.currency} {product.price.toFixed(2)}
            </span>
            {product.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={12} fill="#fed506" className="text-ashanti-gold" />
                <span className="font-body text-xs text-muted-text">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

// Landing Page
const LandingPage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { loginWithGoogle, user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/products/featured`),
          axios.get(`${API}/products/categories`)
        ]);
        setFeaturedProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categoryImages = {
    clubs: "https://images.pexels.com/photos/33110007/pexels-photo-33110007.jpeg?auto=compress&cs=tinysrgb&w=600",
    national: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600",
    retro: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600",
    streetwear: "https://images.pexels.com/photos/11976246/pexels-photo-11976246.jpeg?auto=compress&cs=tinysrgb&w=600",
    local: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600"
  };

  const shopCategories = [
    { id: "national", name: "National Team", description: "Ghana Black Stars jerseys" },
    { id: "clubs", name: "Club Jerseys", description: "Official and replica club jerseys" },
    { id: "local", name: "Local Team", description: "Support your local Ghanaian clubs" },
    { id: "retro", name: "Retro Collection", description: "Classic and vintage designs" },
    { id: "streetwear", name: "Streetwear", description: "Modern casual football fashion" }
  ];

  return (
    <div className="min-h-screen bg-bone-white" data-testid="landing-page">
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://customer-assets.emergentagent.com/job_kente-market-1/artifacts/5rjkj9m0_Hero%20Banner.jpg"
            alt="Ghana Jerseys"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-semibold mb-6 animate-fade-up" data-testid="hero-title">
            Curated Ghana Jersey
          </h1>
          <p className="font-body text-lg md:text-xl text-white/90 mb-10 tracking-wide animate-fade-up italic" style={{ animationDelay: '0.2s' }}>
            for the love of country and culture
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/products">
              <Button className="bg-ashanti-gold text-black hover:bg-white hover:text-black px-10 py-6 font-body font-semibold tracking-wide text-sm" data-testid="hero-shop-btn">
                Shop Collection
              </Button>
            </Link>
            {!user && (
              <Button 
                onClick={loginWithGoogle}
                variant="outline" 
                className="border-white text-white hover:bg-ashanti-gold hover:text-black hover:border-ashanti-gold px-10 py-6 font-body font-semibold tracking-wide text-sm"
                data-testid="hero-join-btn"
              >
                Become a Vendor
              </Button>
            )}
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={32} className="text-white rotate-90" />
        </div>
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Categories Section */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl tracking-wide text-center mb-4" data-testid="categories-title">
          Shop by Category
        </h2>
        <p className="font-body text-center text-muted-text mb-16 max-w-xl mx-auto">
          Explore our curated collection of authentic Ghanaian jerseys
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {shopCategories.map((category, index) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className="group relative"
              data-testid={`category-${category.id}`}
            >
              <div className="relative overflow-hidden bg-black">
                {/* Image with overlay */}
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={categoryImages[category.id]}
                    alt={category.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                  />
                </div>
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-heading text-white text-lg mb-1 group-hover:text-ashanti-gold transition-colors">
                    {category.name}
                  </h3>
                  <p className="font-body text-white/60 text-xs leading-relaxed">
                    {category.description}
                  </p>
                  
                  {/* Shop Now indicator */}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span className="font-body text-ashanti-gold text-xs font-semibold uppercase tracking-wider">Shop Now</span>
                    <ChevronRight size={14} className="text-ashanti-gold" />
                  </div>
                </div>
                
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-ashanti-gold border-l-[40px] border-l-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-heading text-2xl md:text-3xl tracking-wide" data-testid="featured-title">
              Featured
            </h2>
            <Link to="/products?featured=true" className="font-body text-sm font-medium tracking-wide hover:text-ashanti-gold transition-colors flex items-center gap-2">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200"></div>
                  <div className="h-4 bg-gray-200 mt-4 w-3/4"></div>
                  <div className="h-4 bg-gray-200 mt-2 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="font-body text-muted-text">Featured products coming soon</p>
              <Link to="/products" className="mt-4 inline-block">
                <Button variant="outline" className="border-black font-body font-semibold">Browse All Products</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 px-6 md:px-12 bg-black text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <Star size={32} className="text-ashanti-gold mx-auto mb-6" />
            <h3 className="font-heading text-lg mb-4">Authentic Heritage</h3>
            <p className="font-body text-sm text-white/60 leading-relaxed">
              Every jersey is sourced directly from Ghanaian producers, ensuring authenticity and quality.
            </p>
          </div>
          <div className="text-center">
            <ShoppingBag size={32} className="text-ashanti-gold mx-auto mb-6" />
            <h3 className="font-heading text-lg mb-4">Global Shipping</h3>
            <p className="font-body text-sm text-white/60 leading-relaxed">
              We ship worldwide with tracking. From Accra to your doorstep.
            </p>
          </div>
          <div className="text-center">
            <Heart size={32} className="text-ashanti-gold mx-auto mb-6" />
            <h3 className="font-heading text-lg mb-4">Curated Quality</h3>
            <p className="font-body text-sm text-white/60 leading-relaxed">
              Each product is reviewed and approved to meet our premium standards.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
export { Header, Footer, ProductCard, Marquee };
