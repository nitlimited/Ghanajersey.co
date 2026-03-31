import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import CustomerDashboard from "./pages/CustomerDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import WishlistPage from "./pages/WishlistPage";
import SellYourJerseyPage from "./pages/SellYourJerseyPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ComparePage from "./pages/ComparePage";
import VendorOnboarding from "./pages/VendorOnboarding";
import PaymentCallbackPage from "./pages/PaymentCallbackPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import AdminBlogPage from "./pages/AdminBlogPage";
import { LocalizationProvider } from "./localization";
import { UserActivityProvider } from "./context/UserActivityContext";
import CookieConsent from "./components/CookieConsent";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = BACKEND_URL.endsWith("/api")
  ? BACKEND_URL
  : `${BACKEND_URL}/api`;
const normalizeAppPath = (value, fallback) => {
  if (!value) return fallback;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.replace(/\/+$/, "") || fallback;
};
const ADMIN_PORTAL_PATH = normalizeAppPath(process.env.REACT_APP_ADMIN_PORTAL_PATH, "/control-room");
const ADMIN_LOGIN_PATH = `${ADMIN_PORTAL_PATH}/login`;
const GUEST_CART_KEY = "bst_guest_cart";

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Cart Context
const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        withCredentials: true
      });
      setUser(response.data);
      setToken(storedToken);
    } catch (error) {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    if (response.data.requires_2fa) {
      return response.data;
    }

    const { token: newToken, user: userData } = response.data;
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const verifyVendorLogin2FA = async (challengeId, code) => {
    const response = await axios.post(`${API}/auth/login/verify-2fa`, {
      challenge_id: challengeId,
      code
    });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = "customer") => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
    } catch (error) {
      // Ignore errors
    }
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  const setAuthData = (userData, authToken) => {
    localStorage.setItem("auth_token", authToken);
    setToken(authToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, setAuthData, checkAuth, verifyVendorLogin2FA }}>
      {children}
    </AuthContext.Provider>
  );
};

// Cart Provider
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const readGuestCart = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      const items = Array.isArray(stored) ? stored : [];
      const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
      return { items, total };
    } catch (error) {
      return { items: [], total: 0 };
    }
  }, []);

  const writeGuestCart = useCallback((items) => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    setCart({ items, total });
  }, []);

  const loadProductForGuestCart = useCallback(async (productId) => {
    const response = await axios.get(`${API}/products/${productId}`);
    return response.data;
  }, []);

  const syncGuestCartToServer = useCallback(async (authToken) => {
    const guestCart = readGuestCart();
    if (!guestCart.items.length) {
      return false;
    }

    for (const item of guestCart.items) {
      await axios.post(`${API}/cart/add`, {
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        customization: item.customization || null
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }

    localStorage.removeItem(GUEST_CART_KEY);
    return true;
  }, [readGuestCart]);

  const fetchCart = useCallback(async () => {
    if (!token) {
      setCart(readGuestCart());
      return;
    }

    try {
      setLoading(true);
      await syncGuestCartToServer(token);
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  }, [token, readGuestCart, syncGuestCartToServer]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity, size, customization = null) => {
    if (!token) {
      try {
        const product = await loadProductForGuestCart(productId);
        const guestCart = readGuestCart();
        const nextItems = [...guestCart.items];
        const existingIndex = nextItems.findIndex((item) =>
          item.product_id === productId &&
          item.size === size &&
          JSON.stringify(item.customization || null) === JSON.stringify(customization || null)
        );

        if (existingIndex >= 0) {
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            quantity: nextItems[existingIndex].quantity + quantity
          };
        } else {
          nextItems.push({
            product_id: product.product_id,
            name: product.name,
            image: product.images?.[0] || "",
            price: product.price,
            price_ghs: product.price_ghs,
            quantity,
            size,
            vendor_id: product.vendor_id,
            customization: customization || null
          });
        }

        writeGuestCart(nextItems);
        toast.success(customization ? "Customized jersey added to cart" : "Added to cart");
        return true;
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to add to cart");
        return false;
      }
    }

    try {
      await axios.post(`${API}/cart/add`, { 
        product_id: productId, 
        quantity, 
        size,
        customization 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
      toast.success(customization ? "Customized jersey added to cart" : "Added to cart");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add to cart");
      return false;
    }
  };

  const updateCartItem = async (productId, quantity, size) => {
    if (!token) {
      const guestCart = readGuestCart();
      const nextItems = guestCart.items
        .map((item) => item.product_id === productId && item.size === size ? { ...item, quantity } : item)
        .filter((item) => item.quantity > 0);
      writeGuestCart(nextItems);
      return;
    }

    try {
      await axios.put(`${API}/cart/update`, { product_id: productId, quantity, size }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error) {
      toast.error("Failed to update cart");
    }
  };

  const removeFromCart = async (productId, size) => {
    if (!token) {
      const guestCart = readGuestCart();
      const nextItems = guestCart.items.filter((item) => !(item.product_id === productId && item.size === size));
      writeGuestCart(nextItems);
      toast.success("Removed from cart");
      return;
    }

    try {
      await axios.delete(`${API}/cart/item/${productId}/${size}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
      toast.success("Removed from cart");
    } catch (error) {
      toast.error("Failed to remove from cart");
    }
  };

  const clearCart = async () => {
    if (!token) {
      localStorage.removeItem(GUEST_CART_KEY);
      setCart({ items: [], total: 0 });
      return;
    }

    try {
      await axios.delete(`${API}/cart/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart({ items: [], total: 0 });
    } catch (error) {
      console.error("Failed to clear cart");
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addToCart, updateCartItem, removeFromCart, clearCart, syncGuestCartToServer }}>
      {children}
    </CartContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone-white">
        <div className="animate-pulse">
          <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith(ADMIN_PORTAL_PATH) ? ADMIN_LOGIN_PATH : "/auth";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment (not query params) for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/wishlist" element={
        <ProtectedRoute>
          <WishlistPage />
        </ProtectedRoute>
      } />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-success" element={
        <ProtectedRoute>
          <OrderSuccessPage />
        </ProtectedRoute>
      } />
      <Route path="/auth" element={<AuthPage />} />
      <Route path={ADMIN_LOGIN_PATH} element={<AuthPage mode="admin" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/vendor" element={
        <ProtectedRoute allowedRoles={["vendor", "admin"]}>
          <VendorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/vendor/onboarding" element={
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorOnboarding />
        </ProtectedRoute>
      } />
      <Route path={ADMIN_PORTAL_PATH} element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/payment/callback" element={
        <ProtectedRoute>
          <PaymentCallbackPage />
        </ProtectedRoute>
      } />
      <Route path="/payment/paystack/callback" element={
        <ProtectedRoute>
          <PaymentCallbackPage />
        </ProtectedRoute>
      } />
      <Route path="/sell" element={<SellYourJerseyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path={`${ADMIN_PORTAL_PATH}/blog`} element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminBlogPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LocalizationProvider>
        <AuthProvider>
          <CartProvider>
            <UserActivityProvider>
              <Toaster position="top-right" richColors />
              <AppRouter />
              <CookieConsent />
            </UserActivityProvider>
          </CartProvider>
        </AuthProvider>
      </LocalizationProvider>
    </BrowserRouter>
  );
}

export default App;
export { API, BACKEND_URL, ADMIN_PORTAL_PATH, ADMIN_LOGIN_PATH };
