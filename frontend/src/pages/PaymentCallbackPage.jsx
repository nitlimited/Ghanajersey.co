import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";
import { useAuth, useCart, API } from "../App";
import axios from "axios";

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { clearCart } = useCart();
  const [status, setStatus] = useState("verifying"); // verifying, success, failed
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentRef = reference || trxref;
      
      if (!paymentRef) {
        setStatus("failed");
        setError("No payment reference found");
        return;
      }

      try {
        const response = await axios.get(`${API}/payments/paystack/verify/${paymentRef}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === "success") {
          setStatus("success");
          setOrderData(response.data.data);
          
          // Clear the cart
          await clearCart();
        } else {
          setStatus("failed");
          setError("Payment verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("failed");
        setError(error.response?.data?.detail || "Failed to verify payment");
      }
    };

    if (token) {
      verifyPayment();
    }
  }, [reference, trxref, token, clearCart]);

  return (
    <div className="min-h-screen bg-bone-white">
      <Header forceLight={true} stickyAnnouncement={true} />
      
      <div className="pt-24 pb-16 px-6 md:px-12 max-w-2xl mx-auto">
        {status === "verifying" && (
          <div className="text-center py-16">
            <Loader2 size={64} className="mx-auto text-ashanti-gold animate-spin mb-6" />
            <h1 className="font-heading text-2xl tracking-widest uppercase mb-4">Verifying Payment</h1>
            <p className="font-body text-muted-text">Please wait while we confirm your payment...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-ghana-green rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-white" />
            </div>
            <h1 className="font-heading text-3xl tracking-widest uppercase mb-4">Payment Successful!</h1>
            <p className="font-body text-lg text-muted-text mb-8">
              Thank you for your order. Your payment has been confirmed.
            </p>

            {orderData && (
              <div className="bg-white border border-black/10 p-6 text-left mb-8">
                <h2 className="font-heading text-sm tracking-widest uppercase mb-4">Payment Details</h2>
                <div className="space-y-2 font-body text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-text">Reference:</span>
                    <span className="font-medium">{orderData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Amount:</span>
                    <span className="font-medium">
                      {orderData.currency} {(orderData.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Status:</span>
                    <span className="font-medium text-ghana-green uppercase">{orderData.status}</span>
                  </div>
                  {orderData.authorization?.card_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-text">Payment Method:</span>
                      <span className="font-medium capitalize">{orderData.authorization.card_type} •••• {orderData.authorization.last4}</span>
                    </div>
                  )}
                  {orderData.authorization?.channel === "mobile_money" && (
                    <div className="flex justify-between">
                      <span className="text-muted-text">Payment Method:</span>
                      <span className="font-medium">Mobile Money</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-black hover:bg-ashanti-gold hover:text-black font-body uppercase tracking-widest"
                data-testid="view-orders-btn"
              >
                View My Orders
              </Button>
              <Button
                onClick={() => navigate("/products")}
                variant="outline"
                className="border-black font-body uppercase tracking-widest"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-ghana-red rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={48} className="text-white" />
            </div>
            <h1 className="font-heading text-3xl tracking-widest uppercase mb-4">Payment Failed</h1>
            <p className="font-body text-lg text-muted-text mb-4">
              {error || "We couldn't verify your payment. Please try again."}
            </p>
            <p className="font-body text-sm text-muted-text mb-8">
              If money was deducted from your account, it will be refunded within 5-7 business days.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/checkout")}
                className="bg-black hover:bg-ashanti-gold hover:text-black font-body uppercase tracking-widest"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="border-black font-body uppercase tracking-widest"
              >
                Return Home
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PaymentCallbackPage;
