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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-header' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
              alt="Black Star" 
              className="w-8 h-8"
            />
            <span className="font-cinzel text-lg tracking-widest uppercase hidden md:block">Black Star Threads</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/products" className="font-outfit text-sm tracking-wide hover:text-ashanti-gold transition-colors" data-testid="nav-shop">
              SHOP
            </Link>
            <Link to="/products?category=national" className="font-outfit text-sm tracking-wide hover:text-ashanti-gold transition-colors" data-testid="nav-national">
              BLACK STARS
            </Link>
            <Link to="/products?category=retro" className="font-outfit text-sm tracking-wide hover:text-ashanti-gold transition-colors" data-testid="nav-retro">
              RETRO
            </Link>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 font-outfit text-sm" data-testid="user-menu">
                  <User size={20} />
                  <span className="hidden md:block">{user.name?.split(' ')[0]}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link to="/dashboard" className="block px-4 py-2 hover:bg-black/5 font-outfit text-sm" data-testid="link-dashboard">
                    My Orders
                  </Link>
                  <Link to="/wishlist" className="block px-4 py-2 hover:bg-black/5 font-outfit text-sm" data-testid="link-wishlist">
                    Wishlist
                  </Link>
                  {user.role === "vendor" && (
                    <Link to="/vendor" className="block px-4 py-2 hover:bg-black/5 font-outfit text-sm" data-testid="link-vendor">
                      Vendor Dashboard
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link to="/admin" className="block px-4 py-2 hover:bg-black/5 font-outfit text-sm" data-testid="link-admin">
                      Admin Dashboard
                    </Link>
                  )}
                  <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-black/5 font-outfit text-sm text-ghana-red" data-testid="btn-logout">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="font-outfit text-sm tracking-wide hover:text-ashanti-gold transition-colors" data-testid="link-auth">
                <User size={20} />
              </Link>
            )}
            <Link to="/wishlist" className="hover:text-ashanti-gold transition-colors" data-testid="link-wishlist-icon">
              <Heart size={20} />
            </Link>
            <Link to="/cart" className="relative hover:text-ashanti-gold transition-colors" data-testid="link-cart">
              <ShoppingBag size={20} />
              {cart.items.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-xs flex items-center justify-center">
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
            <Link to="/products" className="px-6 py-3 font-outfit text-sm tracking-wide" onClick={() => setIsMenuOpen(false)}>
              SHOP ALL
            </Link>
            <Link to="/products?category=national" className="px-6 py-3 font-outfit text-sm tracking-wide" onClick={() => setIsMenuOpen(false)}>
              BLACK STARS
            </Link>
            <Link to="/products?category=retro" className="px-6 py-3 font-outfit text-sm tracking-wide" onClick={() => setIsMenuOpen(false)}>
              RETRO
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
            <div className="flex items-center gap-2 mb-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
                alt="Black Star" 
                className="w-8 h-8 invert"
              />
              <span className="font-cinzel text-lg tracking-widest">BLACK STAR THREADS</span>
            </div>
            <p className="font-outfit text-sm text-white/60 leading-relaxed max-w-md">
              Curated Ghanaian jerseys for the global citizen. Heritage woven with modern craftsmanship.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-cinzel text-sm tracking-widest mb-4">SHOP</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="font-outfit text-sm text-white/60 hover:text-ashanti-gold transition-colors">All Jerseys</Link>
              <Link to="/products?category=national" className="font-outfit text-sm text-white/60 hover:text-ashanti-gold transition-colors">National Team</Link>
              <Link to="/products?category=clubs" className="font-outfit text-sm text-white/60 hover:text-ashanti-gold transition-colors">Club Jerseys</Link>
              <Link to="/products?category=retro" className="font-outfit text-sm text-white/60 hover:text-ashanti-gold transition-colors">Retro</Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-cinzel text-sm tracking-widest mb-4">NEWSLETTER</h4>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-transparent border-b border-white/20 py-3 font-outfit text-sm focus:border-ashanti-gold outline-none transition-colors"
                data-testid="newsletter-email"
              />
              <Button type="submit" className="bg-ashanti-gold text-black hover:bg-white" data-testid="newsletter-submit">
                SUBSCRIBE
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-outfit text-xs text-white/40">© 2024 Black Star Threads. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="font-outfit text-xs text-white/40">Accra, Ghana</span>
            <span className="font-outfit text-xs text-white/40">Ships Worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Marquee Component
const Marquee = () => {
  const items = ["GHANA", "HERITAGE", "LUXURY", "SOCCER", "BLACK STARS", "PRIDE", "CULTURE"];
  
  return (
    <div className="bg-black text-white py-4 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, index) => (
          <span key={index} className="flex items-center mx-4">
            <Star size={12} className="text-ashanti-gold mr-4" fill="#D4AF37" />
            <span className="font-outfit text-sm tracking-widest">{item}</span>
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
          <span className="absolute top-4 left-4 bg-ashanti-gold text-black px-3 py-1 font-outfit text-xs tracking-wider">
            FEATURED
          </span>
        )}
        <div className="p-4">
          <h3 className="font-cinzel text-sm tracking-wide uppercase group-hover:text-ashanti-gold transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="font-outfit text-lg font-medium">
              {product.currency} {product.price.toFixed(2)}
            </span>
            {product.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={12} fill="#D4AF37" className="text-ashanti-gold" />
                <span className="font-outfit text-xs text-muted-text">{product.rating}</span>
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
    streetwear: "https://images.pexels.com/photos/11976246/pexels-photo-11976246.jpeg?auto=compress&cs=tinysrgb&w=600"
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="landing-page">
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1727023663921-967d01f69c7e?w=1920"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <div className="flex justify-center mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
              alt="Black Star" 
              className="w-20 h-20 invert opacity-90"
            />
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl lg:text-7xl tracking-widest uppercase mb-6 animate-fade-up" data-testid="hero-title">
            THE BLACK STAR COLLECTION
          </h1>
          <p className="font-outfit text-base md:text-lg text-white/80 mb-10 tracking-wide animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Heritage Woven with Modern Craftsmanship
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/products">
              <Button className="bg-white text-black hover:bg-ashanti-gold hover:text-black px-10 py-6 font-outfit tracking-widest text-sm" data-testid="hero-shop-btn">
                SHOP COLLECTION
              </Button>
            </Link>
            {!user && (
              <Button 
                onClick={loginWithGoogle}
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-black px-10 py-6 font-outfit tracking-widest text-sm"
                data-testid="hero-join-btn"
              >
                BECOME A VENDOR
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

      {/* Categories Bento Grid */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h2 className="font-cinzel text-2xl md:text-3xl tracking-widest uppercase text-center mb-16" data-testid="categories-title">
          SHOP BY CATEGORY
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className={`relative overflow-hidden group ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
              data-testid={`category-${category.id}`}
            >
              <div className={`${index === 0 ? 'aspect-square' : 'aspect-[4/5]'} overflow-hidden`}>
                <img
                  src={categoryImages[category.id]}
                  alt={category.name}
                  className="w-full h-full object-cover grayscale-hover group-hover:scale-105 transition-all duration-700"
                />
              </div>
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300 flex items-end p-6">
                <div>
                  <h3 className="font-cinzel text-white text-lg md:text-xl tracking-widest uppercase">
                    {category.name}
                  </h3>
                  <span className="font-outfit text-white/60 text-xs mt-1 block">
                    {category.description}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-cinzel text-2xl md:text-3xl tracking-widest uppercase" data-testid="featured-title">
              FEATURED
            </h2>
            <Link to="/products?featured=true" className="font-outfit text-sm tracking-wide hover:text-ashanti-gold transition-colors flex items-center gap-2">
              VIEW ALL <ChevronRight size={16} />
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
              <p className="font-outfit text-muted-text">Featured products coming soon</p>
              <Link to="/products" className="mt-4 inline-block">
                <Button variant="outline" className="border-black">Browse All Products</Button>
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
            <h3 className="font-cinzel text-lg tracking-widest uppercase mb-4">AUTHENTIC HERITAGE</h3>
            <p className="font-outfit text-sm text-white/60 leading-relaxed">
              Every jersey is sourced directly from Ghanaian producers, ensuring authenticity and quality.
            </p>
          </div>
          <div className="text-center">
            <ShoppingBag size={32} className="text-ashanti-gold mx-auto mb-6" />
            <h3 className="font-cinzel text-lg tracking-widest uppercase mb-4">GLOBAL SHIPPING</h3>
            <p className="font-outfit text-sm text-white/60 leading-relaxed">
              We ship worldwide with tracking. From Accra to your doorstep.
            </p>
          </div>
          <div className="text-center">
            <Heart size={32} className="text-ashanti-gold mx-auto mb-6" />
            <h3 className="font-cinzel text-lg tracking-widest uppercase mb-4">CURATED QUALITY</h3>
            <p className="font-outfit text-sm text-white/60 leading-relaxed">
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
