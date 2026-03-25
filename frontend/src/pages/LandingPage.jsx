import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingBag, Heart, Menu, X, User, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth, useCart, API } from "../App";
import axios from "axios";

// Header Component
const Header = ({ forceLight = false }) => {
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

  // Determine if we should use dark (black) text
  const useDarkText = forceLight || isScrolled;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || forceLight ? 'bg-white/95 backdrop-blur-sm' : 'bg-transparent'}`}>
      {/* Ghana Flag Border - 3 lines */}
      <div className="flex w-full">
        <div className="h-[1.5px] flex-1 bg-ghana-red"></div>
      </div>
      <div className="flex w-full">
        <div className="h-[1.5px] flex-1 bg-ashanti-gold"></div>
      </div>
      <div className="flex w-full">
        <div className="h-[1.5px] flex-1 bg-ghana-green"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Left - Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/products?category=official-tournament" className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-official">
              Official Tournament
            </Link>
            <Link to="/products?category=streetwear" className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-streetwear">
              Streetwear
            </Link>
            <Link to="/products?category=fan" className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-fan">
              Fan
            </Link>
            <Link to="/products?category=retro" className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-retro">
              Retro Designs
            </Link>
            <Link to="/products?category=creative-designer" className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-creative">
              Creative Designer
            </Link>
          </nav>

          {/* Center - Logo Icon Only */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2" data-testid="logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
              alt="Black Star" 
              className={`w-10 h-10 transition-all ${useDarkText ? '' : 'invert'}`}
            />
          </Link>

          {/* Right - Icons */}
          <div className={`flex items-center gap-4 ${useDarkText ? 'text-black' : 'text-white'}`}>
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
            <Link to="/products?category=official-tournament" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Official Tournament
            </Link>
            <Link to="/products?category=streetwear" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Streetwear
            </Link>
            <Link to="/products?category=fan" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Fan
            </Link>
            <Link to="/products?category=retro" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Retro Designs
            </Link>
            <Link to="/products?category=creative-designer" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
              Creative Designer
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
          <p className="font-body text-xs text-white/40">© 2024 Black Star Threads. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="font-body text-xs text-white/40 hover:text-ashanti-gold transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="font-body text-xs text-white/40 hover:text-ashanti-gold transition-colors">Privacy Policy</Link>
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
  const [popularProducts, setPopularProducts] = useState([]);
  const [topVotedProduct, setTopVotedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, popularRes, topVotedRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/products/featured`),
          axios.get(`${API}/products/popular`),
          axios.get(`${API}/products/top-voted`),
          axios.get(`${API}/products/categories`)
        ]);
        setFeaturedProducts(featuredRes.data);
        setPopularProducts(popularRes.data);
        setTopVotedProduct(topVotedRes.data);
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
    "official-tournament": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600",
    "streetwear": "https://images.pexels.com/photos/11976246/pexels-photo-11976246.jpeg?auto=compress&cs=tinysrgb&w=600",
    "fan": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600",
    "retro": "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600",
    "creative-designer": "https://images.pexels.com/photos/33110007/pexels-photo-33110007.jpeg?auto=compress&cs=tinysrgb&w=600",
    "local-club": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600"
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="landing-page">
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://customer-assets.emergentagent.com/job_kente-market-1/artifacts/5rjkj9m0_Hero%20Banner.jpg"
            alt="Ghana Jersey Collection"
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
            <Link to="/sell">
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-ashanti-gold hover:text-black hover:border-ashanti-gold px-10 py-6 font-body font-semibold tracking-wide text-sm"
                data-testid="hero-join-btn"
              >
                List Your Jersey
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={32} className="text-white rotate-90" />
        </div>
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Vote for Best Jersey - Banner Section */}
      <section className="py-16 px-6 md:px-12 bg-ashanti-gold">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="font-heading text-2xl md:text-3xl mb-2">Vote for the Best Jersey Design</h2>
            <p className="font-body text-black/70">Help us crown the most loved Ghana-inspired jersey</p>
          </div>
          <Link to="/products">
            <Button className="bg-black text-white hover:bg-white hover:text-black px-8 py-4 font-body font-semibold">
              Browse & Vote Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Shop by Category with Top Voted Jersey */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl tracking-wide text-center mb-4" data-testid="categories-title">
          Shop by Category
        </h2>
        <p className="font-body text-center text-muted-text mb-16 max-w-xl mx-auto">
          Explore our curated collection of authentic Ghanaian jerseys
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Top Voted Jersey - Large Card */}
          <Link
            to={topVotedProduct ? `/products/${topVotedProduct.product_id}` : "/products?category=official-tournament"}
            className="col-span-2 row-span-2 relative overflow-hidden group"
            data-testid="top-voted-category"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={topVotedProduct?.images?.[0] || categoryImages["official-tournament"]}
                alt="Top Voted Jersey"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:from-black/95 transition-all duration-300"></div>
            
            <div className="absolute top-4 left-4 bg-ashanti-gold text-black px-3 py-1 font-body text-xs font-semibold">
              Most Voted
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="font-heading text-white text-xl md:text-2xl group-hover:text-ashanti-gold transition-colors duration-300">
                {topVotedProduct?.name || "Official Tournament"}
              </h3>
              <p className="font-body text-white/60 text-sm mt-1">
                {topVotedProduct ? `${topVotedProduct.vote_count || 0} votes` : "Shop tournament jerseys"}
              </p>
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <span className="font-body text-ashanti-gold text-sm font-semibold">View Jersey</span>
                <ChevronRight size={16} className="text-ashanti-gold" />
              </div>
            </div>
          </Link>

          {/* Other Categories */}
          {categories.slice(1, 5).map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className="relative overflow-hidden group"
              data-testid={`category-${category.id}`}
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={categoryImages[category.id]}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all duration-300"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-white text-lg group-hover:text-ashanti-gold transition-colors duration-300">
                  {category.name}
                </h3>
                <p className="font-body text-white/60 text-xs mt-1">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Jerseys */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-heading text-2xl md:text-3xl tracking-wide">Popular Jerseys</h2>
            <Link to="/products?sort_by=popular" className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200"></div>
                  <div className="h-4 bg-gray-200 mt-4 w-3/4"></div>
                </div>
              ))}
            </div>
          ) : popularProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {popularProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          ) : (
            <p className="font-body text-muted-text text-center py-16">Coming soon</p>
          )}
        </div>
      </section>

      {/* Official Tournament Jerseys - Wide Banner */}
      <section className="relative h-[400px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920"
          alt="Official Tournament Jerseys"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-6">
            <h2 className="font-heading text-3xl md:text-4xl mb-4">Official Tournament Jerseys</h2>
            <p className="font-body text-white/80 mb-6 max-w-xl mx-auto">
              Authentic and fan-made jerseys from major tournaments. AFCON, World Cup, and more.
            </p>
            <Link to="/products?category=official-tournament">
              <Button className="bg-ashanti-gold text-black hover:bg-white px-8 py-4 font-body font-semibold">
                Shop Tournament Jerseys
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Designer Jerseys */}
      <section className="py-24 px-6 md:px-12 bg-bone-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-heading text-2xl md:text-3xl tracking-wide">Designer Jerseys</h2>
              <p className="font-body text-muted-text mt-2">Unique creations from Ghanaian designers</p>
            </div>
            <Link to="/products?category=creative-designer" className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Limited Editions - Wide Banner */}
      <section className="relative h-[400px] overflow-hidden bg-black">
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <span className="font-body text-ashanti-gold text-sm uppercase tracking-wider mb-4 block">Exclusive Collection</span>
                <h2 className="font-heading text-3xl md:text-4xl mb-4">Limited Edition Jerseys</h2>
                <p className="font-body text-white/70 mb-6">
                  Rare designs with limited quantities. Once they're gone, they're gone.
                </p>
                <Link to="/products?limited=true">
                  <Button className="bg-ashanti-gold text-black hover:bg-white px-8 py-4 font-body font-semibold">
                    Shop Limited Editions
                  </Button>
                </Link>
              </div>
              <div className="hidden md:grid grid-cols-2 gap-4">
                {featuredProducts.slice(0, 2).map((product) => (
                  <Link key={product.product_id} to={`/products/${product.product_id}`} className="aspect-square bg-white/10 overflow-hidden">
                    <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Street Style Jerseys */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-heading text-2xl md:text-3xl tracking-wide">Street Style Jerseys</h2>
            <Link to="/products?category=streetwear" className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {popularProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Local Club Jersey - Wide Banner */}
      <section className="relative h-[400px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1920"
          alt="Local Club Jerseys"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div className="max-w-lg text-white">
              <h2 className="font-heading text-3xl md:text-4xl mb-4">Local Club Jerseys</h2>
              <p className="font-body text-white/80 mb-6">
                Support Hearts of Oak, Asante Kotoko, and other Ghanaian Premier League clubs.
              </p>
              <Link to="/products?category=local-club">
                <Button className="bg-ashanti-gold text-black hover:bg-white px-8 py-4 font-body font-semibold">
                  Shop Local Clubs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Compare Jerseys CTA */}
      <section className="py-16 px-6 md:px-12 bg-bone-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl mb-4">Can't Decide?</h2>
          <p className="font-body text-muted-text mb-8">
            Compare two jerseys side by side to help you make the perfect choice.
          </p>
          <Link to="/compare">
            <Button variant="outline" className="border-black px-8 py-4 font-body font-semibold">
              Compare Jerseys
            </Button>
          </Link>
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
