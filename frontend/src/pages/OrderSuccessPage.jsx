import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import axios from "axios";

const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Verify Stripe payment
        if (sessionId) {
          const response = await axios.get(`${API}/payments/stripe/status/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.payment_status === "paid") {
            setPaymentVerified(true);
          }
        }
        // Verify Paystack payment
        else if (reference) {
          const response = await axios.get(`${API}/payments/paystack/verify/${reference}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.status === "success") {
            setPaymentVerified(true);
          }
        }
        // PayPal or direct order
        else if (orderId) {
          setPaymentVerified(true);
        }
      } catch (error) {
        console.error("Payment verification error:", error);
      }
    };

    const fetchOrder = async () => {
      try {
        // Get user's latest order
        const response = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.length > 0) {
          setOrder(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
    fetchOrder();
  }, [sessionId, reference, orderId, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-outfit mt-4">Verifying payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="order-success-page">
      <Header />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto text-center">
        <div className="bg-white p-12 border border-black/10">
          <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={48} className="text-ghana-green" />
          </div>

          <h1 className="font-cinzel text-2xl md:text-3xl tracking-widest uppercase mb-4" data-testid="success-title">
            Order Confirmed
          </h1>
          <p className="font-outfit text-muted-text mb-8">
            Thank you for your purchase! Your order has been received and is being processed.
          </p>

          {order && (
            <div className="bg-bone-white p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Package size={24} />
                <span className="font-cinzel tracking-widest uppercase">Order Details</span>
              </div>
              <div className="space-y-2 font-outfit text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-text">Order ID</span>
                  <span className="font-mono">{order.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Items</span>
                  <span>{order.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Total</span>
                  <span className="font-medium">{order.currency} {order.total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Status</span>
                  <span className={`uppercase text-xs tracking-wider ${order.payment_status === 'paid' ? 'text-ghana-green' : 'text-ashanti-gold'}`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black px-8 py-6 font-outfit uppercase tracking-widest" data-testid="view-orders-btn">
                View My Orders
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" className="border-black px-8 py-6 font-outfit uppercase tracking-widest" data-testid="continue-shopping-btn">
                Continue Shopping <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <p className="font-outfit text-sm text-muted-text mt-8">
          A confirmation email has been sent to your email address.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default OrderSuccessPage;
