import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Heart, Minus, Plus, ChevronLeft, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Header, Footer, ProductCard } from "./LandingPage";
import { useAuth, useCart, API } from "../App";
import { toast } from "sonner";
import axios from "axios";

const ProductDetailPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { user, token } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/products/${productId}`);
        setProduct(response.data);
        if (response.data.sizes?.length > 0) {
          setSelectedSize(response.data.sizes[0]);
        }

        // Fetch related products
        const relatedResponse = await axios.get(`${API}/products?category=${response.data.category}&limit=4`);
        setRelatedProducts(relatedResponse.data.filter(p => p.product_id !== productId).slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [productId]);

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    await addToCart(productId, quantity, selectedSize);
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      return;
    }

    try {
      await axios.post(`${API}/wishlist/add`, { product_id: productId }, {
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
        <Header />
        <div className="pt-32 max-w-7xl mx-auto px-6 md:px-12">
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
        <Header />
        <div className="pt-32 max-w-7xl mx-auto px-6 md:px-12 text-center py-20">
          <h1 className="font-cinzel text-2xl mb-4">Product Not Found</h1>
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
      <Header />

      {/* Breadcrumb */}
      <div className="pt-24 px-6 md:px-12 max-w-7xl mx-auto">
        <nav className="flex items-center gap-2 text-sm font-outfit text-muted-text py-4">
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
              <p className="font-outfit text-sm text-muted-text uppercase tracking-wider mb-2">{product.category}</p>
              <h1 className="font-cinzel text-2xl md:text-3xl tracking-wide uppercase" data-testid="product-title">
                {product.name}
              </h1>
              {product.vendor_name && (
                <p className="font-outfit text-sm text-muted-text mt-2">By {product.vendor_name}</p>
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
                <span className="font-outfit text-sm text-muted-text">
                  {product.rating} ({product.review_count} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="font-outfit text-3xl font-medium" data-testid="product-price">
                {product.currency} {product.price.toFixed(2)}
              </span>
              {product.stock > 0 ? (
                <span className="font-outfit text-xs text-ghana-green uppercase tracking-wider">In Stock</span>
              ) : (
                <span className="font-outfit text-xs text-ghana-red uppercase tracking-wider">Out of Stock</span>
              )}
            </div>

            {/* Size Selection */}
            <div>
              <label className="font-outfit text-sm uppercase tracking-wider block mb-3">Size</label>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 border-2 font-outfit text-sm transition-all ${selectedSize === size ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black'}`}
                    data-testid={`size-${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="font-outfit text-sm uppercase tracking-wider block mb-3">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-black">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center hover:bg-black/5"
                    data-testid="qty-decrease"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 h-12 flex items-center justify-center font-outfit" data-testid="qty-value">
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

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-outfit uppercase tracking-widest"
                data-testid="add-to-cart-btn"
              >
                Add to Cart
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

            {/* Description Tabs */}
            <Tabs defaultValue="description" className="pt-8">
              <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0">
                <TabsTrigger value="description" className="font-outfit text-sm uppercase tracking-wider rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4">
                  Description
                </TabsTrigger>
                <TabsTrigger value="reviews" className="font-outfit text-sm uppercase tracking-wider rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4">
                  Reviews ({product.review_count})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-6">
                <p className="font-outfit text-sm text-muted-text leading-relaxed">
                  {product.description}
                </p>
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {product.tags.map((tag) => (
                      <span key={tag} className="font-outfit text-xs uppercase tracking-wider px-3 py-1 border border-black/10">
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
                          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-cinzel">
                            {review.user_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-outfit text-sm font-medium">{review.user_name}</p>
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
                        <p className="font-outfit text-sm text-muted-text">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-outfit text-sm text-muted-text">No reviews yet</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 px-6 md:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-cinzel text-xl tracking-widest uppercase mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
