import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";
import { useAuth, useCart, API, getProductPath } from "../App";
import { toast } from "sonner";
import axios from "axios";

const WishlistPage = () => {
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const fetchWishlist = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data.items || []);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await axios.delete(`${API}/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(wishlist.filter(p => p.product_id !== productId));
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleAddToCart = async (product) => {
    const defaultSize = product.sizes?.[0] || "M";
    const success = await addToCart(product.product_id, 1, defaultSize);
    if (success) {
      handleRemove(product.product_id);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} />
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto text-center py-20">
          <Heart size={64} className="mx-auto text-muted-text mb-6" />
          <h1 className="font-heading text-2xl tracking-widest uppercase mb-4">Sign in to view wishlist</h1>
          <Link to="/auth">
            <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black px-10 py-6">
              Sign In
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="wishlist-page">
      <Header forceLight={true} />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase mb-12" data-testid="wishlist-title">
          My Wishlist
        </h1>

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
        ) : wishlist.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div key={product.product_id} className="group" data-testid={`wishlist-item-${product.product_id}`}>
                <Link to={getProductPath(product)} className="block relative">
                  <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                    <img
                      src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=400"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </Link>
                <div className="mt-4">
                  <Link to={getProductPath(product)}>
                    <h3 className="font-heading text-sm tracking-wide uppercase group-hover:text-ashanti-gold transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <span className="font-body text-lg block mt-1">{product.currency} {product.price?.toFixed(2)}</span>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 bg-black text-white hover:bg-ashanti-gold hover:text-black text-xs py-3"
                      data-testid={`add-to-cart-${product.product_id}`}
                    >
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRemove(product.product_id)}
                      className="border-black/20 hover:border-ghana-red hover:bg-ghana-red hover:text-white"
                      data-testid={`remove-${product.product_id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart size={64} className="mx-auto text-muted-text mb-6" />
            <h2 className="font-heading text-xl tracking-widest uppercase mb-4">Your wishlist is empty</h2>
            <p className="font-body text-muted-text mb-8">Save your favorite items for later</p>
            <Link to="/products">
              <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black px-10 py-6 font-body uppercase tracking-widest">
                Explore Products
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default WishlistPage;
