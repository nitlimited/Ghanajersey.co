import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Star, ShoppingBag, Heart, Menu, X, User, ChevronRight, Search, Home } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth, useCart, API, ADMIN_PORTAL_PATH, getProductPath } from "../App";
import { useLocalization, LanguageSelector } from "../localization";
import axios from "axios";
import SEO from "../components/SEO";

const categoryPathMap = {
  "official-tournament": "/products/ghana-jersey-tournament",
  "streetwear": "/products/ghana-jersey-streetwear",
  "fan": "/products/ghana-fan-jersey",
  "retro": "/products/retro-ghana-jersey",
  "creative-designer": "/products/creative-ghana-jersey",
  "local-club": "/products/local-club-ghana-jersey"
};

// Announcement Bar Component
const AnnouncementBar = ({ isSticky = false }) => {
  const { t, isGhana } = useLocalization();
  
  // Show different free shipping thresholds based on location
  const freeShippingAmount = isGhana ? 'GH₵500' : '$100';
  
  return (
    <div className={`bg-black text-white py-2 px-4 hidden md:block ${isSticky ? 'sticky top-0 z-50' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="font-body text-xs md:text-sm tracking-wide text-center">
          <span className="text-ashanti-gold font-semibold">{t('announcement.freeShipping')}</span> {t('announcement.onOrdersOver')} {freeShippingAmount} | {t('announcement.useCode')} <span className="text-ashanti-gold font-semibold">GHANA10</span> {t('announcement.forDiscount')}
        </p>
      </div>
    </div>
  );
};

// Full Screen Search Overlay
const SearchOverlay = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center" data-testid="search-overlay">
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white hover:text-ashanti-gold transition-colors"
        data-testid="close-search"
      >
        <X size={32} />
      </button>
      
      <div className="w-full max-w-2xl px-6">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jerseys..."
            className="w-full bg-transparent border-b-2 border-white/30 focus:border-ashanti-gold text-white text-2xl md:text-4xl font-heading tracking-wider py-4 px-2 outline-none placeholder:text-white/40"
            autoFocus
            data-testid="search-input-fullscreen"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-ashanti-gold">
            <Search size={28} />
          </button>
        </form>
        <p className="text-white/40 font-body text-sm mt-4 text-center">Press Enter to search or ESC to close</p>
      </div>

      {/* Quick Links */}
      <div className="mt-12 text-center">
        <p className="text-white/60 font-body text-xs uppercase tracking-wider mb-4">Popular Categories</p>
        <div className="flex flex-wrap justify-center gap-3">
          {["Tournament", "Streetwear", "Fan", "Retro", "Designers"].map((cat) => (
            <Link
              key={cat}
              to={categoryPathMap[cat.toLowerCase() === 'designers' ? 'creative-designer' : cat.toLowerCase() === 'tournament' ? 'official-tournament' : cat.toLowerCase()]}
              onClick={onClose}
              className="px-4 py-2 border border-white/20 text-white hover:border-ashanti-gold hover:text-ashanti-gold font-body text-sm transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile Bottom Navigation
const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          <Link 
            to="/" 
            className={`flex flex-col items-center justify-center flex-1 py-2 ${isActive('/') ? 'text-ashanti-gold' : 'text-black'}`}
          >
            <Home size={20} />
            <span className="text-[10px] font-body mt-1">Home</span>
          </Link>
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2 text-black"
          >
            <Search size={20} />
            <span className="text-[10px] font-body mt-1">Search</span>
          </button>
          <Link 
            to="/wishlist" 
            className={`flex flex-col items-center justify-center flex-1 py-2 ${isActive('/wishlist') ? 'text-ashanti-gold' : 'text-black'}`}
          >
            <Heart size={20} />
            <span className="text-[10px] font-body mt-1">Wishlist</span>
          </Link>
          <Link 
            to={user ? "/dashboard" : "/auth"} 
            className={`flex flex-col items-center justify-center flex-1 py-2 ${isActive('/dashboard') || isActive('/auth') ? 'text-ashanti-gold' : 'text-black'}`}
          >
            <User size={20} />
            <span className="text-[10px] font-body mt-1">{user ? 'Account' : 'Login'}</span>
          </Link>
          <Link 
            to="/cart" 
            className={`flex flex-col items-center justify-center flex-1 py-2 relative ${isActive('/cart') ? 'text-ashanti-gold' : 'text-black'}`}
          >
            <div className="relative">
              <ShoppingBag size={20} />
              {cart.items.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-ashanti-gold text-black text-[9px] flex items-center justify-center font-semibold rounded-full">
                  {cart.items.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-body mt-1">Cart</span>
          </Link>
        </div>
      </div>
    </>
  );
};

// Header Component
const Header = ({ forceLight = false, stickyAnnouncement = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { t } = useLocalization();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close search on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const useDarkText = forceLight || isScrolled;

  const headerTopClass = stickyAnnouncement 
    ? 'sticky top-0 md:top-8' 
    : `fixed ${isScrolled ? 'top-0' : 'top-0 md:top-8'}`;

  return (
    <>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <AnnouncementBar isSticky={stickyAnnouncement} />
      <header className={`${headerTopClass} left-0 right-0 z-40 transition-all duration-300 ${isScrolled || forceLight ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
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
        
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between h-14">
            {/* Left - Logo */}
            <Link to="/" data-testid="logo-mobile">
              <img 
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
                alt="Black Star" 
                className={`w-8 h-8 transition-all ${useDarkText ? '' : 'invert'}`}
              />
            </Link>
            {/* Right - Menu Toggle */}
            <button 
              className={`${useDarkText ? 'text-black' : 'text-white'}`} 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              data-testid="mobile-menu-toggle"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between h-20">
            {/* Left - Navigation */}
            <nav className="flex items-center gap-5 pr-16">
              <Link to={categoryPathMap["official-tournament"]} className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-official">
                {t('nav.tournament')}
              </Link>
              <Link to={categoryPathMap["streetwear"]} className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-streetwear">
                {t('nav.streetwear')}
              </Link>
              <Link to={categoryPathMap["fan"]} className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-fan">
                {t('nav.fan')}
              </Link>
              <Link to={categoryPathMap["retro"]} className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-retro">
                {t('nav.retro')}
              </Link>
              <Link to={categoryPathMap["creative-designer"]} className={`font-body text-sm font-semibold tracking-wide transition-colors ${useDarkText ? 'text-black hover:text-ashanti-gold' : 'text-white hover:text-ashanti-gold'}`} data-testid="nav-creative">
                {t('nav.designers')}
              </Link>
            </nav>

            {/* Center - Logo */}
            <Link to="/" className="absolute left-1/2 -translate-x-1/2" data-testid="logo">
              <img 
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
                alt="Black Star" 
                className={`w-10 h-10 transition-all ${useDarkText ? '' : 'invert'}`}
              />
            </Link>

            {/* Right - Icons */}
            <div className={`flex items-center gap-4 pl-16 ${useDarkText ? 'text-black' : 'text-white'}`}>
              {/* Language Selector */}
              <LanguageSelector variant={useDarkText ? 'light' : 'dark'} />
              
              <button onClick={() => setSearchOpen(true)} className="hover:text-ashanti-gold transition-colors" data-testid="search-btn">
                <Search size={20} />
              </button>

              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 font-body text-sm font-semibold" data-testid="user-menu">
                    <User size={20} />
                    <span className="hidden lg:block">{user.name?.split(' ')[0]}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link to="/dashboard" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-dashboard">
                      {t('nav.myOrders')}
                    </Link>
                    <Link to="/wishlist" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-wishlist">
                      {t('nav.wishlist')}
                    </Link>
                    {user.role === "vendor" && (
                      <Link to="/vendor" className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-vendor">
                        {t('nav.vendorDashboard')}
                      </Link>
                    )}
                    {user.role === "admin" && (
                      <Link to={ADMIN_PORTAL_PATH} className="block px-4 py-2 hover:bg-black/5 font-body text-sm text-black" data-testid="link-admin">
                        {t('nav.adminDashboard')}
                      </Link>
                    )}
                    <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-black/5 font-body text-sm text-ghana-red" data-testid="btn-logout">
                      {t('nav.logout')}
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
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-black/10">
            <nav className="flex flex-col py-4">
              <Link to={categoryPathMap["official-tournament"]} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
                {t('nav.tournament')}
              </Link>
              <Link to={categoryPathMap["streetwear"]} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
                {t('nav.streetwear')}
              </Link>
              <Link to={categoryPathMap["fan"]} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
                {t('nav.fan')}
              </Link>
              <Link to={categoryPathMap["retro"]} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
                {t('nav.retro')}
              </Link>
              <Link to={categoryPathMap["creative-designer"]} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black" onClick={() => setIsMenuOpen(false)}>
                {t('nav.designers')}
              </Link>
              <div className="border-t border-black/10 mt-2 pt-2">
                <Link to="/sell" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-ashanti-gold block" onClick={() => setIsMenuOpen(false)}>
                  {t('footer.sellWithUs')}
                </Link>
                {user ? (
                  <>
                    <Link to="/dashboard" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black block" onClick={() => setIsMenuOpen(false)} data-testid="mobile-link-dashboard">
                      {t('nav.myOrders')}
                    </Link>
                    <Link to="/wishlist" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black block" onClick={() => setIsMenuOpen(false)} data-testid="mobile-link-wishlist">
                      {t('nav.wishlist')}
                    </Link>
                    {user.role === "vendor" && (
                      <Link to="/vendor" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black block" onClick={() => setIsMenuOpen(false)} data-testid="mobile-link-vendor">
                        {t('nav.vendorDashboard')}
                      </Link>
                    )}
                    {user.role === "admin" && (
                      <Link to={ADMIN_PORTAL_PATH} className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black block" onClick={() => setIsMenuOpen(false)} data-testid="mobile-link-admin">
                        {t('nav.adminDashboard')}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-6 py-3 font-body text-sm font-semibold tracking-wide text-ghana-red block"
                      data-testid="mobile-btn-logout"
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <Link to="/auth" className="px-6 py-3 font-body text-sm font-semibold tracking-wide text-black block" onClick={() => setIsMenuOpen(false)} data-testid="mobile-link-auth">
                    Sign In
                  </Link>
                )}
                {/* Mobile Language Selector */}
                <div className="px-6 py-3">
                  <LanguageSelector variant="light" />
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

// Footer Component
const Footer = () => {
  const [email, setEmail] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(false);

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
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg" 
                alt="Black Star" 
                className="w-10 h-10 invert"
              />
            </div>
            <p className="font-body text-sm text-white/60 leading-relaxed mb-6">
              Curated Ghanaian jerseys for the global citizen. For the love of country and culture.
            </p>
            <Link to="/sell">
              <Button className="bg-ashanti-gold text-black hover:bg-white font-body font-semibold text-sm" data-testid="footer-sell-btn">
                List Your Jersey
              </Button>
            </Link>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wide mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">All Jerseys</Link>
              <Link to={categoryPathMap["official-tournament"]} className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Tournament</Link>
              <Link to={categoryPathMap["streetwear"]} className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Streetwear</Link>
              <Link to={categoryPathMap["retro"]} className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Retro</Link>
              <Link to={categoryPathMap["creative-designer"]} className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Designers</Link>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading text-sm tracking-wide mb-4">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/sell" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Become a Seller</Link>
              <Link to="/about" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">About</Link>
              <Link to="/blog" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Blog</Link>
              <button
                type="button"
                onClick={() => setShowContactPanel(true)}
                className="font-body text-sm text-left text-white/60 hover:text-ashanti-gold transition-colors"
              >
                Contact
              </button>
              <Link to="/terms" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Terms & Conditions</Link>
              <Link to="/privacy" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Privacy Policy</Link>
              <Link to="/compare" className="font-body text-sm text-white/60 hover:text-ashanti-gold transition-colors">Compare Jerseys</Link>
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
          <p className="font-body text-xs text-white/40">
            © 2025 Ghanajersey.co All rights reserved. Built and Managed by{" "}
            <a href="https://www.nitlimited.com/" target="_blank" rel="noopener noreferrer" className="text-ashanti-gold hover:text-white transition-colors">
              Nitlimited
            </a>
          </p>
          <div className="flex gap-6">
            <Link to="/terms" className="font-body text-xs text-white/40 hover:text-ashanti-gold transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="font-body text-xs text-white/40 hover:text-ashanti-gold transition-colors">Privacy Policy</Link>
            <button
              type="button"
              onClick={() => setShowContactPanel(true)}
              className="font-body text-xs text-white/40 hover:text-ashanti-gold transition-colors"
            >
              Contact
            </button>
            <span className="font-body text-xs text-white/40">Ships Worldwide</span>
          </div>
        </div>
      </div>
      {showContactPanel && (
        <div className="fixed inset-0 z-[110] bg-black/50" onClick={() => setShowContactPanel(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white text-black rounded-t-[28px] border-t border-black/10 shadow-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-text mb-2">Contact</p>
                  <h3 className="font-heading text-2xl tracking-wide uppercase">GhanaJersey</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactPanel(false)}
                  className="text-muted-text hover:text-black"
                  aria-label="Close contact panel"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-black/10 bg-bone-white p-4">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text">Trade Name</p>
                  <p className="font-body text-base font-medium mt-2">Ghanajersey</p>
                </div>
                <div className="border border-black/10 bg-bone-white p-4">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text">Email</p>
                  <a href="mailto:ghanajersey.co@gmail.com" className="font-body text-base font-medium mt-2 block hover:text-ashanti-gold transition-colors">
                    ghanajersey.co@gmail.com
                  </a>
                </div>
                <div className="border border-black/10 bg-bone-white p-4">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text">Inquiry</p>
                  <a href="mailto:info@ghanajersey.co" className="font-body text-base font-medium mt-2 block hover:text-ashanti-gold transition-colors">
                    info@ghanajersey.co
                  </a>
                </div>
                <div className="border border-black/10 bg-bone-white p-4">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text">Phone</p>
                  <a href="tel:+233248167944" className="font-body text-base font-medium mt-2 block hover:text-ashanti-gold transition-colors">
                    +233248167944
                  </a>
                </div>
                <div className="border border-black/10 bg-bone-white p-4 md:col-span-2">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text">Physical Address</p>
                  <p className="font-body text-base font-medium mt-2">Ubor Ntiador LK, Accra - Ghana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Extra padding for mobile bottom nav */}
      <div className="md:hidden h-16"></div>
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
  const { formatPrice, t } = useLocalization();
  const primaryImage = product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=600";
  const secondaryImage = product.images?.[1] || product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=600";
  
  return (
    <Link to={getProductPath(product)} className="group block" data-testid={`product-card-${product.product_id}`}>
      <div className="relative overflow-hidden border border-transparent hover:border-black transition-all duration-300">
        <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
          {/* Primary Image */}
          <img
            src={primaryImage}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          {/* Secondary Image (shown on hover) */}
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
        </div>
        {product.featured && (
          <span className="absolute top-4 left-4 bg-ashanti-gold text-black px-3 py-1 font-body text-xs font-semibold tracking-wide z-10">
            {t('home.featured')}
          </span>
        )}
        {product.is_limited_edition && (
          <span className="absolute top-4 right-4 bg-ghana-red text-white px-3 py-1 font-body text-xs font-semibold tracking-wide z-10">
            {t('products.limitedEdition')}
          </span>
        )}
        <div className="p-4 bg-white">
          <p className="font-body text-xs text-muted-text uppercase tracking-wider mb-1">
            {product.vendor_name || product.category?.replace("-", " ")}
          </p>
          <h3 className="font-heading text-sm tracking-wide group-hover:text-ashanti-gold transition-colors line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="font-body text-lg font-semibold">
              {formatPrice(product.price, product.price_ghs)}
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
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [forYouProducts, setForYouProducts] = useState([]);
  const { user, token } = useAuth();

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

  // Fetch personalized content for logged-in users
  useEffect(() => {
    const fetchPersonalized = async () => {
      if (!user || !token) {
        // Load from localStorage for guests
        const stored = localStorage.getItem('bst_recently_viewed');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setRecentlyViewed(parsed.slice(0, 8));
          } catch (e) {}
        }
        return;
      }

      try {
        const response = await axios.get(`${API}/user/recommendations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecentlyViewed(response.data.recently_viewed || []);
        setForYouProducts(response.data.for_you || []);
      } catch (error) {
        console.error("Failed to fetch personalized content:", error);
      }
    };

    fetchPersonalized();
  }, [user, token]);

  const categoryImages = {
    "official-tournament": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600",
    "streetwear": "https://customer-assets.emergentagent.com/job_cb12ac7a-c9cc-4935-bad8-6211db546e33/artifacts/npfb0v0p_Streetwear.jpg",
    "fan": "https://customer-assets.emergentagent.com/job_cb12ac7a-c9cc-4935-bad8-6211db546e33/artifacts/sn4uod8p_Fan%20Jeserys.avif",
    "retro": "https://customer-assets.emergentagent.com/job_cb12ac7a-c9cc-4935-bad8-6211db546e33/artifacts/kq98wucm_Retro.jpg",
    "creative-designer": "https://customer-assets.emergentagent.com/job_cb12ac7a-c9cc-4935-bad8-6211db546e33/artifacts/ypiv8t75_Creative%20designer.jpg",
    "local-club": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600"
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="landing-page">
      <SEO
        title="Ghana Jersey Shop for Black Stars Jersey, Retro Kits and Designer Drops"
        description="Buy Ghana jersey styles, Black Stars jersey drops, retro Ghana football shirts, and creative local designer kits from one marketplace built around Ghana jersey culture."
        canonicalPath="/"
        keywords="ghana jersey, black stars jersey, buy ghana jersey, ghana football jersey, ghana soccer jersey, blackstars jersey"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "GhanaJersey.co",
          url: window.location.origin,
          potentialAction: {
            "@type": "SearchAction",
            target: `${window.location.origin}/products?search={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://customer-assets.emergentagent.com/job_kente-market-1/artifacts/5rjkj9m0_Hero%20Banner.jpg"
            alt="Ghana jersey and Black Stars jersey collection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-semibold mb-6 animate-fade-up" data-testid="hero-title">
            Wear The Black Star
          </h1>
          <p className="font-body text-lg md:text-xl text-white/90 mb-10 tracking-wide animate-fade-up italic" style={{ animationDelay: '0.2s' }}>
            Shop the pride, pulse, and culture of Ghana in every jersey
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

      <section className="py-14 px-6 md:px-12 bg-white border-b border-black/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl tracking-wide uppercase">Your Home for Ghana Jersey and Black Stars Jersey Shopping</h2>
          <p className="font-body text-muted-text leading-7 mt-5">
            Shop Ghana jersey styles, Black Stars jersey favorites, retro football looks, and culture-led designer releases from one marketplace built for fans in Ghana and abroad.
          </p>
        </div>
      </section>

      {/* Personalized: Recently Viewed (if any) */}
      {recentlyViewed.length > 0 && (
        <section className="py-16 px-6 md:px-12 bg-white border-b border-black/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-ashanti-gold"></div>
                <h2 className="font-heading text-xl md:text-2xl tracking-wide">Pick Up Where You Left Off</h2>
              </div>
              <Link to="/products" className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
              {recentlyViewed.slice(0, 4).map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Personalized: For You (logged-in users with browsing history) */}
      {user && forYouProducts.length > 0 && (
        <section className="py-16 px-6 md:px-12 bg-bone-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-ghana-green"></div>
                <div>
                  <h2 className="font-heading text-xl md:text-2xl tracking-wide">Recommended For You</h2>
                  <p className="font-body text-sm text-muted-text mt-1">Based on your browsing history</p>
                </div>
              </div>
              <Link to="/products" className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
                Explore More <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {forYouProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

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
            to={topVotedProduct ? getProductPath(topVotedProduct) : "/products?category=official-tournament"}
            className="col-span-2 row-span-2 relative overflow-hidden group"
            data-testid="top-voted-category"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={topVotedProduct?.images?.[0] || categoryImages["official-tournament"]}
                alt="Top voted Ghana jersey"
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
              to={category.url || categoryPathMap[category.id] || `/products?category=${category.id}`}
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
            <Link to={categoryPathMap["official-tournament"]}>
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
            <Link to={categoryPathMap["creative-designer"]} className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
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
                  <Link key={product.product_id} to={getProductPath(product)} className="aspect-square bg-white/10 overflow-hidden">
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
            <Link to={categoryPathMap["streetwear"]} className="font-body text-sm font-medium hover:text-ashanti-gold transition-colors flex items-center gap-2">
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
              <Link to={categoryPathMap["local-club"]}>
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
      <MobileBottomNav />
    </div>
  );
};

export default LandingPage;
export { Header, Footer, ProductCard, Marquee, MobileBottomNav, SearchOverlay };
