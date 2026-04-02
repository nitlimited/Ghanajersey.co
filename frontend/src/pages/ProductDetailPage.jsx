import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Heart, Minus, Plus, ChevronLeft, Share2, ThumbsUp, Shirt } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Header, Footer, ProductCard, MobileBottomNav } from "./LandingPage";
import { useAuth, useCart, API, getProductPath } from "../App";
import { useLocalization } from "../localization";
import { toast } from "sonner";
import axios from "axios";
import SEO from "../components/SEO";

const ProductDetailPage = () => {
  const { productSlug, productId } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [designerProducts, setDesignerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  // Customization state
  const [wantsCustomization, setWantsCustomization] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { formatPrice, t, currency, getPrice } = useLocalization();

  // Generate or retrieve device fingerprint for voting
  const getDeviceFingerprint = () => {
    let fingerprint = localStorage.getItem('bst_device_fp');
    if (!fingerprint) {
      fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('bst_device_fp', fingerprint);
    }
    return fingerprint;
  };

  // Track product view for personalization
  const trackProductView = (productData) => {
    // Check if personalization is allowed
    const consent = localStorage.getItem('bst_cookie_consent');
    let allowed = true;
    if (consent) {
      try {
        const prefs = JSON.parse(consent);
        allowed = prefs.personalization !== false;
      } catch {}
    }
    if (!allowed) return;

    // Save to localStorage for guest users
    const viewedItem = {
      product_id: productData.product_id,
      name: productData.name,
      category: productData.category,
      image: productData.images?.[0],
      price: productData.price,
      price_ghs: productData.price_ghs,
      viewed_at: new Date().toISOString()
    };

    const stored = localStorage.getItem('bst_recently_viewed');
    let recentlyViewed = stored ? JSON.parse(stored) : [];
    recentlyViewed = recentlyViewed.filter(p => p.product_id !== productData.product_id);
    recentlyViewed.unshift(viewedItem);
    recentlyViewed = recentlyViewed.slice(0, 20);
    localStorage.setItem('bst_recently_viewed', JSON.stringify(recentlyViewed));

    // Update category preferences
    if (productData.category) {
      const prefs = localStorage.getItem('bst_category_prefs');
      let categoryPrefs = prefs ? JSON.parse(prefs) : {};
      categoryPrefs[productData.category] = (categoryPrefs[productData.category] || 0) + 1;
      localStorage.setItem('bst_category_prefs', JSON.stringify(categoryPrefs));
    }

    // Send to server if logged in
    if (user && token) {
      axios.post(`${API}/user/activity`, {
        action: 'view',
        product_id: productData.product_id,
        category: productData.category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(e => console.log('Activity tracking failed:', e));
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productLookup = productId || productSlug;
        const response = await axios.get(`${API}/products/${productLookup}`);
        setProduct(response.data);
        setVoteCount(response.data.vote_count || 0);
        if (response.data.sizes?.length > 0) {
          setSelectedSize(response.data.sizes[0]);
        }

        // Track this product view
        trackProductView(response.data);

        // Check if user has already voted (using device fingerprint)
        const fingerprint = getDeviceFingerprint();
        try {
          const voteCheckRes = await axios.get(`${API}/products/${response.data.product_id}/check-vote?device_fingerprint=${fingerprint}`);
          setHasVoted(voteCheckRes.data.has_voted);
        } catch (e) {
          // If check fails, also check localStorage
          const votedProducts = JSON.parse(localStorage.getItem('bst_voted_products') || '[]');
          setHasVoted(votedProducts.includes(response.data.product_id));
        }

        // Fetch related products (same category)
        const relatedResponse = await axios.get(`${API}/products?category=${response.data.category}&limit=4`);
        setRelatedProducts(relatedResponse.data.filter(p => p.product_id !== response.data.product_id).slice(0, 4));

        // Fetch more from this designer
        if (response.data.vendor_id) {
          const designerResponse = await axios.get(`${API}/vendor/${response.data.vendor_id}/products?limit=4`);
          setDesignerProducts(designerResponse.data.filter(p => p.product_id !== response.data.product_id).slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [productSlug]);

  const handleVote = async () => {
    try {
      const fingerprint = getDeviceFingerprint();
      await axios.post(`${API}/products/${product.product_id}/vote`, { device_fingerprint: fingerprint });
      setVoteCount(prev => prev + 1);
      setHasVoted(true);
      
      // Also store in localStorage as backup
      const votedProducts = JSON.parse(localStorage.getItem('bst_voted_products') || '[]');
      if (!votedProducts.includes(product.product_id)) {
        votedProducts.push(product.product_id);
        localStorage.setItem('bst_voted_products', JSON.stringify(votedProducts));
      }
      
      toast.success("Vote recorded! Thanks for voting.");
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error("You've already voted for this jersey");
        setHasVoted(true);
      } else {
        toast.error("Failed to record vote");
      }
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    
    // Validate customization if selected
    if (wantsCustomization && product?.allows_customization) {
      if (!customName.trim() && !customNumber.trim()) {
        toast.error("Please enter a name or number for customization");
        return;
      }
    }
    
    // Include customization data in cart
    const customization = wantsCustomization && product?.allows_customization ? {
      name: customName.trim().toUpperCase(),
      number: customNumber.trim(),
      price: product.customization_price || 0
    } : null;
    
    await addToCart(product.product_id, quantity, selectedSize, customization);
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      return;
    }

    try {
      await axios.post(`${API}/wishlist/add`, { product_id: product.product_id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsWishlisted(true);
      toast.success("Added to wishlist");
    } catch (error) {
      toast.error("Failed to add to wishlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-8 max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-gray-200 animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 animate-pulse w-1/2"></div>
              <div className="h-24 bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-8 max-w-7xl mx-auto px-6 md:px-12 text-center py-20">
          <h1 className="font-heading text-2xl mb-4">Product Not Found</h1>
          <Link to="/products">
            <Button variant="outline" className="border-black">Browse Products</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="product-detail-page">
      <SEO
        title={product.meta_title || `${product.name} | Ghana Jersey`}
        description={product.meta_description || `${product.name} from ${product.vendor_name || "GhanaJersey.co"}: shop this Ghana jersey and Black Stars jersey-inspired design with sizing, price, and shipping details.`}
        canonicalPath={getProductPath(product)}
        image={product.images?.[0]}
        type="product"
        keywords={["ghana jersey", "black stars jersey", product.name.toLowerCase(), product.category, ...(product.focus_keywords || [])].join(", ")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.images || [],
          sku: product.product_id,
          brand: {
            "@type": "Brand",
            name: product.vendor_name || "GhanaJersey.co"
          },
          offers: {
            "@type": "Offer",
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            priceCurrency: product.price_ghs ? "GHS" : (product.currency || "USD"),
            price: product.price_ghs || product.price,
            url: `${window.location.origin}${getProductPath(product)}`
          }
        }}
      />
      <Header forceLight={true} stickyAnnouncement={true} />

      {/* Breadcrumb */}
      <div className="pt-4 px-6 md:px-12 max-w-7xl mx-auto">
        <nav className="flex items-center gap-2 text-sm font-body text-muted-text py-4">
          <Link to="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-black">Shop</Link>
          <span>/</span>
          <span className="text-black">{product.name}</span>
        </nav>
      </div>

      {/* Product Section */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
              <img
                src={product.images?.[selectedImage] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=800"}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="main-product-image"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden border-2 ${selectedImage === index ? 'border-black' : 'border-transparent'}`}
                    data-testid={`thumbnail-${index}`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:sticky lg:top-32 lg:self-start space-y-6">
            <div>
              <p className="font-body text-sm text-muted-text uppercase tracking-wider mb-2">{product.category}</p>
              <h1 className="font-heading text-2xl md:text-3xl tracking-wide uppercase" data-testid="product-title">
                {product.name}
              </h1>
              {product.vendor_name && (
                <p className="font-body text-sm text-muted-text mt-2">By {product.vendor_name}</p>
              )}
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i < Math.round(product.rating) ? "#D4AF37" : "none"}
                      className={i < Math.round(product.rating) ? "text-ashanti-gold" : "text-gray-300"}
                    />
                  ))}
                </div>
                <span className="font-body text-sm text-muted-text">
                  {product.rating} ({product.review_count} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="font-body text-3xl font-medium" data-testid="product-price">
                {formatPrice(product.price, product.price_ghs)}
              </span>
              {product.stock > 0 ? (
                <span className="font-body text-xs text-ghana-green uppercase tracking-wider">{t('products.addToCart').split(' ')[0]} Stock</span>
              ) : (
                <span className="font-body text-xs text-ghana-red uppercase tracking-wider">{t('products.outOfStock')}</span>
              )}
            </div>

            {/* Size Selection */}
            <div>
              <label className="font-body text-sm uppercase tracking-wider block mb-3">Size</label>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 border-2 font-body text-sm transition-all ${selectedSize === size ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black'}`}
                    data-testid={`size-${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="font-body text-sm uppercase tracking-wider block mb-3">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-black">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center hover:bg-black/5"
                    data-testid="qty-decrease"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 h-12 flex items-center justify-center font-body" data-testid="qty-value">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-black/5"
                    data-testid="qty-increase"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Customization Option */}
            {product.allows_customization && (
              <div className="border border-ashanti-gold/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shirt size={20} className="text-ashanti-gold" />
                    <div>
                      <h4 className="font-body text-sm font-semibold">Personalize Your Jersey</h4>
                      <p className="font-body text-xs text-muted-text">Add your name and number on the back</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantsCustomization}
                      onChange={(e) => setWantsCustomization(e.target.checked)}
                      className="w-5 h-5 accent-ashanti-gold"
                      data-testid="customization-toggle"
                    />
                    <span className="font-body text-sm text-ashanti-gold font-semibold">
                      +{formatPrice(product.customization_price || 0, product.customization_price_ghs)}
                    </span>
                  </label>
                </div>
                
                {wantsCustomization && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/10">
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">{t('productDetail.customName')}</Label>
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value.slice(0, 15))}
                        placeholder="MENSAH"
                        maxLength={15}
                        className="mt-2 uppercase font-body"
                        data-testid="custom-name-input"
                      />
                      <p className="font-body text-[10px] text-muted-text mt-1">{customName.length}/15 characters</p>
                    </div>
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">{t('productDetail.customNumber')}</Label>
                      <Input
                        value={customNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                          setCustomNumber(val);
                        }}
                        placeholder="10"
                        maxLength={2}
                        className="mt-2 font-body text-center text-lg"
                        data-testid="custom-number-input"
                      />
                      <p className="font-body text-[10px] text-muted-text mt-1">1-99</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total Price Display */}
            {wantsCustomization && product.allows_customization && (
              <div className="flex items-center justify-between p-4 bg-bone-white">
                <span className="font-body text-sm">Jersey + {t('cart.customization')}</span>
                <span className="font-body text-xl font-semibold">
                  {formatPrice(
                    (product.price + (product.customization_price || 0)) * quantity,
                    (getPrice(product.price, product.price_ghs) + getPrice(product.customization_price || 0, product.customization_price_ghs)) * quantity
                  )}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                data-testid="add-to-cart-btn"
              >
                {t('productDetail.addToCart')}
              </Button>
              <Button
                onClick={handleAddToWishlist}
                variant="outline"
                className={`w-14 h-14 border-black ${isWishlisted ? 'bg-black text-white' : ''}`}
                data-testid="wishlist-btn"
              >
                <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
              </Button>
            </div>

            {/* Vote for this Jersey */}
            <div className="bg-ashanti-gold/10 border border-ashanti-gold/30 p-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-sm mb-1">Vote for this Design</h4>
                  <p className="font-body text-xs text-muted-text">Help crown the best Ghana jersey</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-heading text-2xl text-ashanti-gold" data-testid="vote-count">{voteCount}</p>
                    <p className="font-body text-xs text-muted-text">votes</p>
                  </div>
                  <Button
                    onClick={handleVote}
                    disabled={hasVoted}
                    variant="outline"
                    className={`border-ashanti-gold ${hasVoted ? 'bg-ashanti-gold text-black' : 'hover:bg-ashanti-gold hover:text-black'}`}
                    data-testid="vote-btn"
                  >
                    <ThumbsUp size={18} className="mr-2" fill={hasVoted ? "currentColor" : "none"} />
                    {hasVoted ? 'Voted' : 'Vote'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Description Tabs */}
            <Tabs defaultValue="description" className="pt-8">
              <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0">
                <TabsTrigger value="description" className="font-body text-sm uppercase tracking-wider rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4">
                  Description
                </TabsTrigger>
                <TabsTrigger value="reviews" className="font-body text-sm uppercase tracking-wider rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4">
                  Reviews ({product.review_count})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-6">
                <p className="font-body text-sm text-muted-text leading-relaxed">
                  {product.description}
                </p>
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {product.tags.map((tag) => (
                      <span key={tag} className="font-body text-xs uppercase tracking-wider px-3 py-1 border border-black/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="reviews" className="pt-6">
                {product.reviews?.length > 0 ? (
                  <div className="space-y-6">
                    {product.reviews.map((review) => (
                      <div key={review.review_id} className="border-b border-black/10 pb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-heading">
                            {review.user_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-body text-sm font-medium">{review.user_name}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  fill={i < review.rating ? "#D4AF37" : "none"}
                                  className={i < review.rating ? "text-ashanti-gold" : "text-gray-300"}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="font-body text-sm text-muted-text">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm text-muted-text">No reviews yet</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* More from this Designer */}
      {designerProducts.length > 0 && product.vendor_name && (
        <section className="py-16 px-6 md:px-12 bg-bone-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-xl tracking-widest uppercase mb-2">More from {product.vendor_name}</h2>
            <p className="font-body text-sm text-muted-text mb-8">Explore other jerseys from this designer</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {designerProducts.map((p) => (
                <ProductCard key={p.product_id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 px-6 md:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-xl tracking-widest uppercase mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetailPage;
