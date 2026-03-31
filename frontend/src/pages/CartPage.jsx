import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";
import { useCart } from "../App";
import { useLocalization } from "../localization";

const CartPage = () => {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const { isGhana, formatPrice } = useLocalization();
  const navigate = useNavigate();

  // Get the correct price based on location
  const getItemPrice = (item) => {
    if (isGhana && item.price_ghs) {
      return item.price_ghs;
    }
    return item.price;
  };

  // Calculate totals based on location
  const subtotal = cart.items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const formatLocalizedAmount = (amount) => formatPrice(amount, isGhana ? amount : null);

  const handleQuantityChange = async (productId, size, newQuantity) => {
    await updateCartItem(productId, newQuantity, size);
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="cart-page">
      <Header forceLight={true} />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase mb-12" data-testid="cart-title">
          Shopping Cart
        </h1>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-6 animate-pulse">
                <div className="w-32 h-40 bg-gray-200"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 w-1/2"></div>
                  <div className="h-4 bg-gray-200 w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : cart.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cart.items.map((item, index) => (
                <div key={`${item.product_id}-${item.size}`} className="flex gap-6 pb-6 border-b border-black/10" data-testid={`cart-item-${index}`}>
                  <Link to={`/products/${item.product_id}`} className="w-32 h-40 flex-shrink-0 overflow-hidden bg-gray-100">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=300"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link to={`/products/${item.product_id}`} className="font-heading text-lg tracking-wide uppercase hover:text-ashanti-gold transition-colors">
                          {item.name}
                        </Link>
                        <p className="font-body text-sm text-muted-text mt-1">Size: {item.size}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id, item.size)}
                        className="text-muted-text hover:text-black"
                        data-testid={`remove-item-${index}`}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-black">
                        <button
                          onClick={() => handleQuantityChange(item.product_id, item.size, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-black/5"
                          data-testid={`qty-decrease-${index}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 h-10 flex items-center justify-center font-body text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.product_id, item.size, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-black/5"
                          data-testid={`qty-increase-${index}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-body text-lg font-medium">
                        {formatPrice(item.price * item.quantity, item.price_ghs ? item.price_ghs * item.quantity : null)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 border border-black/10">
                <h2 className="font-heading text-lg tracking-widest uppercase mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-text">Subtotal</span>
                    <span>{formatLocalizedAmount(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-text">Shipping</span>
                    <span className="text-muted-text">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4 mb-6">
                  <div className="flex justify-between font-body">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-medium" data-testid="cart-total">
                      {formatLocalizedAmount(subtotal)}
                    </span>
                  </div>
                  {isGhana && (
                    <p className="font-body text-xs text-muted-text mt-2">
                      Prices shown in Ghana Cedi (GHS)
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout
                </Button>

                <Link to="/products" className="block text-center mt-4 font-body text-sm text-muted-text hover:text-black">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="mx-auto text-muted-text mb-6" />
            <h2 className="font-heading text-xl tracking-widest uppercase mb-4">Your cart is empty</h2>
            <p className="font-body text-muted-text mb-8">Looks like you haven't added any items yet</p>
            <Link to="/products">
              <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black px-10 py-6 font-body uppercase tracking-widest">
                Start Shopping
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CartPage;
