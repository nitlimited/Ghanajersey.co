import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, Truck, Shield, Tag, Check, Loader2 } from "lucide-react";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token, register, login } = useAuth();
  const { cart, clearCart, syncGuestCartToServer } = useCart();
  const { isGhana, countryDetected, formatPrice, getCurrencyCode } = useLocalization();
  const [loading, setLoading] = useState(false);
  // Track whether the user has touched the payment selector so we don't
  // override their choice if the country detection lands later.
  const [paymentMethod, setPaymentMethod] = useState(isGhana ? "paystack" : "stripe");
  const [paymentMethodTouched, setPaymentMethodTouched] = useState(false);

  // Promo / coupon code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null); // {code, discount_percent}
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  const [customerAccount, setCustomerAccount] = useState({
    email: user?.email || "",
    password: ""
  });

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
  const qualifiesForInternationalFreeShipping = !isGhana && subtotal >= 200;
  
  // Shipping costs in respective currencies
  const shippingCost = isGhana 
    ? (shippingAddress.country === "Ghana" ? 50 : 250)  // GHS rates
    : (shippingAddress.country === "Ghana" ? 5 : qualifiesForInternationalFreeShipping ? 0 : 15);   // USD rates
  
  // Promo discount applies to the items subtotal only (not shipping). Mirrors
  // the server-side calculation so the user sees an accurate preview.
  const discountAmount = appliedPromo
    ? Math.round(subtotal * (appliedPromo.discount_percent || 0)) / 100
    : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);
  const currency = getCurrencyCode();
  const formatLocalizedAmount = (amount) => formatPrice(amount, isGhana ? amount : null);

  // Brands the Stripe card actually accepts. Shown as a strip under the option.
  const stripeBrands = ["Visa", "Mastercard", "Amex", "Discover", "Apple Pay", "Google Pay"];
  // Mobile money operators Paystack supports in Ghana.
  const paystackBrands = ["MTN MoMo", "AirtelTigo Money", "VodaCash", "Visa", "Mastercard"];

  const shippingWindows = [
    { country: "United States", timeline: "3-5 Days" },
    { country: "Canada & Mexico", timeline: "7-14 Days" },
    { country: "Rest of the world", timeline: "+14 Days" }
  ];

  const countries = [
    "Ghana", "United States", "United Kingdom", "Germany", "France", 
    "Nigeria", "South Africa", "Kenya", "Canada", "Australia"
  ];

  // Smart payment default: once country detection lands, swap to the
  // recommended option — unless the user has already picked something.
  useEffect(() => {
    if (!countryDetected || paymentMethodTouched) return;
    const recommended = isGhana ? "paystack" : "stripe";
    setPaymentMethod((current) => (current === recommended ? current : recommended));
  }, [countryDetected, isGhana, paymentMethodTouched]);

  // If the user arrived back from a cancelled payment, the Stripe cancel_url
  // sends them to /checkout?order_id=... Show a friendly nudge that nothing
  // was lost.
  useEffect(() => {
    if (searchParams.get("order_id") || searchParams.get("payment") === "cancelled") {
      toast.info("Payment was not completed. Your cart is saved — try again when you're ready.", {
        duration: 6000,
      });
    }
    // run once on mount; searchParams is stable enough for this purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentMethodChange = (value) => {
    setPaymentMethodTouched(true);
    setPaymentMethod(value);
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Enter a code to apply.");
      return;
    }
    setPromoLoading(true);
    setPromoError("");
    try {
      const response = await axios.post(
        `${API}/discounts/validate?code=${encodeURIComponent(code)}`
      );
      setAppliedPromo({
        code: response.data.code || code.toUpperCase(),
        discount_percent: response.data.discount_percent,
      });
      toast.success(`Code applied: ${response.data.discount_percent}% off`);
    } catch (error) {
      setAppliedPromo(null);
      const message = error.response?.data?.detail || "Could not apply this code.";
      setPromoError(message);
      toast.error(message);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

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

    if (!user) {
      if (!customerAccount.email) {
        toast.error("Please provide an email for your order");
        return false;
      }
      if (!customerAccount.password || customerAccount.password.length < 6) {
        toast.error("Please create a password with at least 6 characters");
        return false;
      }
    }

    return true;
  };

  const ensureCheckoutCustomer = async () => {
    if (token && user) {
      return token;
    }

    try {
      const newUser = await register(
        customerAccount.email,
        customerAccount.password,
        shippingAddress.full_name,
        "customer"
      );
      const customerUser = newUser?.user || newUser;
      const authToken = localStorage.getItem("auth_token");
      if (!authToken) {
        throw new Error("Customer session could not be created");
      }
      await syncGuestCartToServer(authToken);
      toast.success(`Account created for ${customerUser.name}. Continuing to payment.`);
      return authToken;
    } catch (error) {
      if (error.response?.data?.detail === "Email already registered") {
        const existingUser = await login(customerAccount.email, customerAccount.password);
        const customerUser = existingUser?.user || existingUser;
        if (customerUser.role !== "customer") {
          throw new Error("This email belongs to a non-customer account. Please use a different email for checkout.");
        }
        const authToken = localStorage.getItem("auth_token");
        if (!authToken) {
          throw new Error("Customer session could not be created");
        }
        await syncGuestCartToServer(authToken);
        toast.success("Signed in to your customer account. Continuing to payment.");
        return authToken;
      }

      throw error;
    }
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
      const activeToken = await ensureCheckoutCustomer();

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
        total: total,
        promo_code: appliedPromo?.code || null,
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      const { order_id } = orderResponse.data;

      // Initialize payment based on method
      const originUrl = window.location.origin;

      if (paymentMethod === "stripe") {
        const paymentResponse = await axios.post(`${API}/payments/stripe/checkout`, {
          order_id,
          origin_url: originUrl
        }, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });

        // Redirect to Stripe
        window.location.href = paymentResponse.data.url;
      } else if (paymentMethod === "paystack") {
        // Paystack for Ghana customers (GHS) or other African countries
        const paymentResponse = await axios.post(`${API}/payments/paystack/initialize`, {
          order_id,
          email: user?.email || customerAccount.email,
          callback_url: `${originUrl}/payment/paystack/callback`
        }, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });

        if (paymentResponse.data.authorization_url) {
          // Redirect to Paystack payment page
          window.location.href = paymentResponse.data.authorization_url;
        } else {
          throw new Error("Failed to initialize Paystack payment");
        }
      } else {
        throw new Error("Please select a payment method.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.detail || error.message || "Checkout failed. Please try again.");
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

                {!user && (
                  <div className="mb-8 border border-black/10 bg-black/[0.02] p-5 space-y-4">
                    <div>
                      <h3 className="font-heading text-sm tracking-widest uppercase">Customer Account</h3>
                      <p className="font-body text-sm text-muted-text mt-2">
                        Your customer account will be created during checkout so you can track this order later.
                      </p>
                    </div>
                    <div>
                      <Label className="font-body text-sm uppercase tracking-wider">Email</Label>
                      <Input
                        type="email"
                        value={customerAccount.email}
                        onChange={(e) => setCustomerAccount((prev) => ({ ...prev, email: e.target.value }))}
                        className="mt-2 rounded-none border-black/20 focus:border-black"
                        data-testid="checkout-email"
                      />
                    </div>
                    <div>
                      <Label className="font-body text-sm uppercase tracking-wider">Password</Label>
                      <Input
                        type="password"
                        value={customerAccount.password}
                        onChange={(e) => setCustomerAccount((prev) => ({ ...prev, password: e.target.value }))}
                        className="mt-2 rounded-none border-black/20 focus:border-black"
                        data-testid="checkout-password"
                      />
                    </div>
                  </div>
                )}

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
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard size={24} />
                  <h2 className="font-heading text-lg tracking-widest uppercase">Payment Method</h2>
                </div>
                <p className="font-body text-sm text-muted-text mb-6">
                  {countryDetected
                    ? (isGhana
                        ? "We've selected Paystack for you — it's the easiest way to pay from Ghana."
                        : "We've selected Stripe for you — it accepts all major international cards.")
                    : "Pick the option that works best for you."}
                </p>

                <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="space-y-4">
                  {/* Paystack — recommended for Ghana */}
                  <label
                    htmlFor="paystack"
                    className={`block p-5 border cursor-pointer transition-colors ${
                      paymentMethod === "paystack"
                        ? "border-black bg-black/5"
                        : isGhana
                          ? "border-ghana-green bg-ghana-green/5 hover:border-black"
                          : "border-black/10 hover:border-black"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="paystack" id="paystack" data-testid="payment-paystack" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body font-medium">Paystack</span>
                          {isGhana && (
                            <span className="bg-ghana-green text-white text-[10px] px-2 py-0.5 font-body uppercase tracking-wider">
                              Recommended
                            </span>
                          )}
                          <span className="ml-auto bg-[#00C3F7] text-white px-3 py-1 text-xs font-body font-semibold rounded">
                            Paystack
                          </span>
                        </div>
                        <p className="font-body text-sm text-muted-text mt-2">
                          <strong className="text-black">Recommended for buyers in Ghana</strong> paying with Mobile Money locally — MTN MoMo, AirtelTigo Money, VodaCash, or any local bank card in Ghana Cedis (GHS).
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {paystackBrands.map((brand) => (
                            <span
                              key={brand}
                              className="border border-black/10 bg-bone-white px-2 py-1 text-[10px] font-body uppercase tracking-[0.14em]"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Stripe — recommended for international */}
                  <label
                    htmlFor="stripe"
                    className={`block p-5 border cursor-pointer transition-colors ${
                      paymentMethod === "stripe"
                        ? "border-black bg-black/5"
                        : !isGhana
                          ? "border-blue-500 bg-blue-500/5 hover:border-black"
                          : "border-black/10 hover:border-black"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="stripe" id="stripe" data-testid="payment-stripe" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body font-medium">Stripe — Credit / Debit Card</span>
                          {!isGhana && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 font-body uppercase tracking-wider">
                              Recommended
                            </span>
                          )}
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/200px-Stripe_Logo%2C_revised_2016.svg.png"
                            alt="Stripe"
                            className="h-5 ml-auto"
                          />
                        </div>
                        <p className="font-body text-sm text-muted-text mt-2">
                          <strong className="text-black">Highly recommended for international buyers.</strong> Pay in USD with Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, and most other major cards Stripe supports.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {stripeBrands.map((brand) => (
                            <span
                              key={brand}
                              className="border border-black/10 bg-bone-white px-2 py-1 text-[10px] font-body uppercase tracking-[0.14em]"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </label>
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

              <div className="bg-white p-8 border border-black/10">
                <div className="flex items-center gap-3 mb-6">
                  <Truck size={24} />
                  <h2 className="font-heading text-lg tracking-widest uppercase">Shipping Policy</h2>
                </div>

                <div className="space-y-5 font-body text-sm text-muted-text">
                  <p>International shipping is managed by <strong className="text-black">ghanajersey.co</strong>. Local shipping inside Ghana is managed by <strong className="text-black">local vendors</strong>.</p>
                  <p>Once your order has been shipped, a shipping confirmation email is sent with your order details and tracking information.</p>
                  <p>After payment is verified, we process and ship orders within 2 business days, excluding weekends and holidays. Pre-ordered items take 4-6 weeks to ship from the date the pre-order is placed.</p>
                  <p>Express shipping options are also available at checkout. Customs fees are the responsibility of the customer.</p>
                  <p className="font-semibold text-black">Free shipping on orders over $200.</p>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {shippingWindows.map((window) => (
                    <div key={window.country} className="border border-black/10 p-4 bg-bone-white">
                      <p className="font-body text-xs uppercase tracking-widest text-muted-text">{window.country}</p>
                      <p className="font-heading text-lg mt-2">{window.timeline}</p>
                    </div>
                  ))}
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
                    <span>{formatLocalizedAmount(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-text">Shipping {shippingAddress.country === "Ghana" ? "(Local)" : "(International)"}</span>
                    <span>{formatLocalizedAmount(shippingCost)}</span>
                  </div>
                  {qualifiesForInternationalFreeShipping && !isGhana && (
                    <div className="flex justify-between font-body text-sm text-ghana-green">
                      <span>Free shipping applied</span>
                      <span>Orders over $200</span>
                    </div>
                  )}
                  {appliedPromo && (
                    <div className="flex justify-between font-body text-sm text-ghana-green">
                      <span>Discount ({appliedPromo.code} · {appliedPromo.discount_percent}% off)</span>
                      <span>− {formatLocalizedAmount(discountAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Promo / coupon code */}
                <div className="border-t border-black/10 pt-4 mt-4">
                  <Label className="font-body text-xs uppercase tracking-widest text-muted-text flex items-center gap-2">
                    <Tag size={14} /> Promo / Coupon Code
                  </Label>
                  {appliedPromo ? (
                    <div className="mt-2 flex items-center justify-between border border-ghana-green/40 bg-ghana-green/5 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-ghana-green" />
                        <span className="font-body text-sm">
                          <strong>{appliedPromo.code}</strong> — {appliedPromo.discount_percent}% off
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="font-body text-xs uppercase tracking-wider text-muted-text hover:text-black underline"
                        data-testid="remove-promo"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value);
                            if (promoError) setPromoError("");
                          }}
                          placeholder="Enter code"
                          className="rounded-none border-black/20 focus:border-black uppercase"
                          data-testid="input-promo"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          variant="outline"
                          className="border-black rounded-none font-body uppercase tracking-widest px-4"
                          data-testid="apply-promo"
                        >
                          {promoLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="font-body text-xs text-ghana-red mt-2">{promoError}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-black/10 pt-4 mt-4 mb-6">
                  <div className="flex justify-between font-body">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-medium" data-testid="checkout-total">{formatLocalizedAmount(total)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                  data-testid="place-order-btn"
                >
                  {loading ? "Processing..." : `Pay ${formatLocalizedAmount(total)}`}
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-muted-text">
                  <Shield size={16} />
                  <span className="font-body text-xs">Secure checkout • {paymentMethod === 'paystack' ? 'Paystack' : 'Stripe'} protected</span>
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
