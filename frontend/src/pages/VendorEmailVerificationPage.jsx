import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import axios from "axios";

const VendorEmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);

  const token = searchParams.get("token");
  const email = useMemo(
    () => user?.email || location.state?.email || "",
    [location.state?.email, user?.email]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyVendorEmail = async () => {
      setVerifying(true);
      try {
        await axios.post(`${API}/auth/vendor/verify-email`, { token });
        setVerified(true);
        toast.success("Vendor email verified. You can continue onboarding.");
      } catch (error) {
        toast.error(error.response?.data?.detail || "Verification link is invalid or expired");
      } finally {
        setVerifying(false);
      }
    };

    verifyVendorEmail();
  }, [token]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Please sign in with your vendor email to resend the verification link");
      return;
    }

    setResending(true);
    try {
      await axios.post(`${API}/auth/vendor/resend-verification`, { email });
      toast.success(`Verification email sent to ${email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone-white">
      <Header forceLight={true} stickyAnnouncement={true} />
      <div className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="bg-white border border-black/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-ashanti-gold/15 flex items-center justify-center">
            {verified ? (
              <CheckCircle2 className="text-ghana-green" size={28} />
            ) : (
              <MailCheck className="text-ashanti-gold" size={28} />
            )}
          </div>

          <h1 className="font-heading text-2xl md:text-3xl tracking-wide uppercase mb-4">
            {verified ? "Email Verified" : "Verify Your Vendor Email"}
          </h1>

          {verifying ? (
            <p className="font-body text-muted-text">
              Confirming your vendor email now. Please wait a moment.
            </p>
          ) : verified ? (
            <div className="space-y-6">
              <p className="font-body text-muted-text">
                Your email has been verified successfully. You can now continue to the vendor onboarding process.
              </p>
              <Button
                onClick={() => navigate("/vendor/onboarding")}
                className="bg-black text-white hover:bg-ashanti-gold hover:text-black px-8 py-6 font-body uppercase tracking-widest"
              >
                Continue to Onboarding
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="font-body text-muted-text">
                We sent a verification email to your vendor account. Please click the link in that email before continuing to onboarding.
              </p>
              {email && (
                <p className="font-body text-sm text-black">
                  Verification email: <span className="font-semibold">{email}</span>
                </p>
              )}
              <div className="mx-auto flex w-full max-w-3xl flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full sm:flex-1 bg-black text-white hover:bg-ashanti-gold hover:text-black px-6 py-6 font-body uppercase tracking-wide whitespace-normal leading-snug"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </Button>
                <Link to="/auth" className="w-full sm:flex-1">
                  <Button
                    variant="outline"
                    className="border-black px-6 py-6 font-body uppercase tracking-wide w-full whitespace-normal leading-snug"
                  >
                    Back to Vendor Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VendorEmailVerificationPage;
