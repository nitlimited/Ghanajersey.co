import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, Truck, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Header, Footer } from "./LandingPage";
import { useAuth, useCart, API } from "../App";
import { useLocalization } from "../localization";
import { toast } from "sonner";
import axios from "axios";

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cart, clearCart } = useCart();
  const { isGhana, formatPrice, getCurrencyCode } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(isGhana ? "paystack" : "stripe");

  const [shippingAddress, setShippingAddress] = useState({
    full_name: user?.name || "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: isGhana ? "Ghana" : "United States",
    phone: ""
  });

  // Calculate totals based on location
  const getItemPrice = (item) => {
    if (isGhana && item.price_ghs) {
      return item.price_ghs;
    }
    return item.price;
  };

  const subtotal = cart.items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  
  // Shipping costs in respective currencies
  const shippingCost = isGhana 
    ? (shippingAddress.country === "Ghana" ? 50 : 250)  // GHS rates
    : (shippingAddress.country === "Ghana" ? 5 : 15);   // USD rates
  
  const total = subtotal + shippingCost;
  const currency = getCurrencyCode();

  const countries = [
    "Ghana", "United States", "United Kingdom", "Germany", "France", 
    "Nigeria", "South Africa", "Kenya", "Canada", "Australia"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ["full_name", "address_line1", "city", "state", "postal_code", "country", "phone"];
    for (const field of required) {
      if (!shippingAddress[field]) {
        toast.error(`Please fill in ${field.replace("_", " ")}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      // Create order with correct currency based on location
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        price: isGhana && item.price_ghs ? item.price_ghs : item.price,
        price_usd: item.price,
        price_ghs: item.price_ghs,
        currency: currency
      }));

      const orderResponse = await axios.post(`${API}/orders`, {
        items: orderItems,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        currency: currency,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        total: total
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { order_id } = orderResponse.data;

      // Initialize payment based on method
      const originUrl = window.location.origin;

      if (paymentMethod === "stripe") {
        const paymentResponse = await axios.post(`${API}/payments/stripe/checkout`, {
          order_id,
          origin_url: originUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Redirect to Stripe
        window.location.href = paymentResponse.data.url;
      } else if (paymentMethod === "paypal") {
        const paymentResponse = await axios.post(`${API}/payments/paypal/create`, {
          order_id,
          origin_url: originUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // For demo, simulate PayPal success
        const captureResponse = await axios.post(`${API}/payments/paypal/capture/${paymentResponse.data.order_id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (captureResponse.data.status === "COMPLETED") {
          await clearCart();
          navigate(`/order-success?order_id=${order_id}`);
        }
      } else if (paymentMethod === "paystack") {
        // Paystack for Ghana customers (GHS) or other African countries
        const paymentResponse = await axios.post(`${API}/payments/paystack/initialize`, {
          order_id,
          email: user?.email,
          callback_url: `${originUrl}/payment/paystack/callback`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (paymentResponse.data.authorization_url) {
          // Redirect to Paystack payment page
          window.location.href = paymentResponse.data.authorization_url;
        } else {
          throw new Error("Failed to initialize Paystack payment");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.detail || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="checkout-page">
      <Header forceLight={true} />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase mb-12" data-testid="checkout-title">
          Checkout
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Shipping & Payment */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Address */}
              <div className="bg-white p-8 border border-black/10">
                <div className="flex items-center gap-3 mb-6">
                  <Truck size={24} />
                  <h2 className="font-heading text-lg tracking-widest uppercase">Shipping Address</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="font-body text-sm uppercase tracking-wider">Full Name</Label>
                    <Input
                      name="full_name"
                      value={shippingAddress.full_name}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-body text-sm uppercase tracking-wider">Address Line 1</Label>
                    <Input
                      name="address_line1"
                      value={shippingAddress.address_line1}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-address1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-body text-sm uppercase tracking-wider">Address Line 2 (Optional)</Label>
                    <Input
                      name="address_line2"
                      value={shippingAddress.address_line2}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-address2"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">City</Label>
                    <Input
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">State/Region</Label>
                    <Input
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-state"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Postal Code</Label>
                    <Input
                      name="postal_code"
                      value={shippingAddress.postal_code}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-postal"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Country</Label>
                    <Select value={shippingAddress.country} onValueChange={(value) => setShippingAddress(prev => ({ ...prev, country: value }))}>
                      <SelectTrigger className="mt-2 rounded-none border-black/20" data-testid="select-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-body text-sm uppercase tracking-wider">Phone Number</Label>
                    <Input
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleInputChange}
                      className="mt-2 rounded-none border-black/20 focus:border-black"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white p-8 border border-black/10">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard size={24} />
                  <h2 className="font-heading text-lg tracking-widest uppercase">Payment Method</h2>
                </div>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                  {/* Paystack - Highlighted for Ghana users */}
                  <div className={`flex items-center space-x-3 p-4 border cursor-pointer transition-colors ${
                    isGhana ? 'border-ghana-green bg-ghana-green/5' : 'border-black/10 hover:border-black'
                  } ${paymentMethod === 'paystack' ? 'border-black bg-black/5' : ''}`}>
                    <RadioGroupItem value="paystack" id="paystack" data-testid="payment-paystack" />
                    <Label htmlFor="paystack" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-body font-medium">Paystack</span>
                        {isGhana && <span className="bg-ghana-green text-white text-[10px] px-2 py-0.5 font-body uppercase">Recommended</span>}
                      </div>
                      <span className="font-body text-sm text-muted-text block">Mobile Money, Bank Card, USSD {isGhana ? '(GHS)' : '(Africa)'}</span>
                    </Label>
                    <div className="bg-[#00C3F7] text-white px-3 py-1 text-xs font-body font-semibold rounded">Paystack</div>
                  </div>

                  {/* Stripe - For international cards */}
                  <div className={`flex items-center space-x-3 p-4 border cursor-pointer transition-colors ${
                    !isGhana ? 'border-blue-500 bg-blue-500/5' : 'border-black/10 hover:border-black'
                  } ${paymentMethod === 'stripe' ? 'border-black bg-black/5' : ''}`}>
                    <RadioGroupItem value="stripe" id="stripe" data-testid="payment-stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-body font-medium">Credit/Debit Card</span>
                        {!isGhana && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 font-body uppercase">Recommended</span>}
                      </div>
                      <span className="font-body text-sm text-muted-text block">Visa, Mastercard, Amex via Stripe (USD)</span>
                    </Label>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/200px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" className="h-6" />
                  </div>

                  {/* PayPal */}
                  <div className={`flex items-center space-x-3 p-4 border border-black/10 cursor-pointer hover:border-black transition-colors ${
                    paymentMethod === 'paypal' ? 'border-black bg-black/5' : ''
                  }`}>
                    <RadioGroupItem value="paypal" id="paypal" data-testid="payment-paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <span className="font-body font-medium">PayPal</span>
                      <span className="font-body text-sm text-muted-text block">Pay with your PayPal account (USD)</span>
                    </Label>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png" alt="PayPal" className="h-6" />
                  </div>
                </RadioGroup>

                {/* Currency info based on location */}
                <div className="mt-4 p-3 bg-bone-white border border-black/5">
                  <p className="font-body text-xs text-muted-text">
                    {isGhana ? (
                      <>🇬🇭 You're shopping from Ghana. Prices are shown in <strong>GHS (Ghana Cedi)</strong>.</>
                    ) : (
                      <>🌍 You're shopping internationally. Prices are shown in <strong>USD (US Dollar)</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 border border-black/10 sticky top-32">
                <h2 className="font-heading text-lg tracking-widest uppercase mb-6">Order Summary</h2>

                {/* Items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {cart.items.map((item, index) => (
                    <div key={`${item.product_id}-${item.size}`} className="flex gap-4">
                      <div className="w-16 h-20 bg-gray-100 flex-shrink-0 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-body text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="font-body text-xs text-muted-text">Size: {item.size} × {item.quantity}</p>
                        <p className="font-body text-sm mt-1">{formatPrice(item.price * item.quantity, item.price_ghs ? item.price_ghs * item.quantity : null)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-black/10 pt-4 space-y-3">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-text">Subtotal</span>
                    <span>{formatPrice(subtotal, isGhana ? subtotal : null)}</span>
                  </div>
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-text">Shipping {shippingAddress.country === "Ghana" ? "(Local)" : "(International)"}</span>
                    <span>{formatPrice(isGhana ? shippingCost / 15.38 : shippingCost, isGhana ? shippingCost : null)}</span>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4 mt-4 mb-6">
                  <div className="flex justify-between font-body">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-medium" data-testid="checkout-total">{formatPrice(isGhana ? total / 15.38 : total, isGhana ? total : null)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                  data-testid="place-order-btn"
                >
                  {loading ? "Processing..." : `Pay ${formatPrice(isGhana ? total / 15.38 : total, isGhana ? total : null)}`}
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-muted-text">
                  <Shield size={16} />
                  <span className="font-body text-xs">Secure checkout • {paymentMethod === 'paystack' ? 'Paystack' : paymentMethod === 'stripe' ? 'Stripe' : 'PayPal'} protected</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
