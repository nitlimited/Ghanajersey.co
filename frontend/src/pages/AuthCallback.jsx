import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API, ADMIN_PORTAL_PATH } from "../App";
import axios from "axios";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef flag to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Get session_id from URL fragment
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/auth');
        return;
      }

      try {
        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId
        }, {
          withCredentials: true
        });

        const { user } = response.data;

        // Get session token from cookie or generate JWT-like token for localStorage
        // For simplicity, we'll use a generated token
        const token = `session_${Date.now()}_${user.user_id}`;
        
        setAuthData(user, token);

        // Redirect based on role
        if (user.role === "admin") {
          navigate(ADMIN_PORTAL_PATH, { replace: true, state: { user } });
        } else if (user.role === "vendor") {
          try {
            const statusRes = await axios.get(`${API}/vendor/onboarding-status`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (statusRes.data.vendor_email_verified === false || statusRes.data.vendor_status === "pending_email_verification") {
              navigate('/vendor/verify-email', { replace: true, state: { email: user.email } });
            } else if (statusRes.data.vendor_status === "approved") {
              navigate('/vendor', { replace: true, state: { user } });
            } else {
              navigate('/vendor/onboarding', { replace: true, state: { user } });
            }
          } catch (error) {
            navigate('/vendor', { replace: true, state: { user } });
          }
        } else {
          navigate('/dashboard', { replace: true, state: { user } });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth');
      }
    };

    processAuth();
  }, [navigate, setAuthData]);

  return (
    <div className="min-h-screen bg-bone-white flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-outfit text-muted-text">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
